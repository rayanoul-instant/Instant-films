/**
 * Génère les synopsis manquants à partir de yt_description (déjà en base via
 * fetch-youtube-stats.mjs) — AUCUN appel YouTube ici, seul Gemini est utilisé,
 * en lots de 25 films par requête (économie de quota).
 *
 * Modèle : gemini-3.5-flash-lite (quota journalier séparé de gemini-2.5-flash ;
 * gemini-2.5-flash-lite n'est plus disponible pour les nouvelles clés API).
 *
 * Ne traite que les films sans synopsis (synopsis NULL ou vide). Si
 * yt_description est vide ou ne contient que des crédits techniques, le
 * synopsis est explicitement mis à NULL (pas d'invention) et le titre est
 * affiché dans le terminal — sans appeler Gemini pour ces cas-là (économie
 * de quota supplémentaire).
 *
 * Usage (l'un des deux flags est obligatoire) :
 *   node --env-file=.env scripts/generate-synopsis.mjs --sample=10
 *   node --env-file=.env scripts/generate-synopsis.mjs --full
 */
import { createClient } from "@supabase/supabase-js";
import { requireServiceRoleKey, updateAndVerify } from "./_write-guard.mjs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !GEMINI_KEY) {
  console.error("Variables manquantes dans .env :");
  if (!SUPABASE_URL) console.error("  - VITE_SUPABASE_URL");
  if (!GEMINI_KEY) console.error("  - GEMINI_API_KEY");
  process.exit(1);
}
requireServiceRoleKey();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const GEMINI_MODEL = "gemini-3.5-flash-lite";
const BATCH_SIZE = 25;

const sampleArg = process.argv.find((a) => a.startsWith("--sample="));
const FULL = process.argv.includes("--full");
const SAMPLE = sampleArg ? parseInt(sampleArg.split("=")[1], 10) : null;

if (!FULL && !SAMPLE) {
  console.error("Usage : --sample=N (test) ou --full (tous les films restants). Aucun des deux n'a été passé.");
  process.exit(1);
}

function isSynopsisEmpty(synopsis) {
  return !synopsis || synopsis.trim().length === 0;
}

// Heuristique locale : description vide ou quasi entièrement composée de
// lignes de crédits (Director:, Cast:, Music:, liens, hashtags...) plutôt que
// de vraie prose. Filtrée AVANT l'appel Gemini pour économiser du quota.
function looksLikeCreditsOnly(description) {
  if (!description || description.trim().length < 30) return true;
  const creditLines = (description.match(/^(director|cast|produced by|writer|dop|editor|music|sound|starring|prod\.|réalisat|acteurs?|scénario|montage)\s*[:\-]/gim) || []).length;
  const prose = description.replace(/https?:\/\/\S+/g, "").replace(/#\w+/g, "").trim();
  return prose.length < 40 || creditLines >= 4;
}

function extractRetryDelaySeconds(errBody, message) {
  const detail = errBody?.error?.details?.find((d) => d["@type"]?.includes("RetryInfo"));
  const raw = detail?.retryDelay || (message.match(/retry in ([\d.]+)s/i)?.[0] ?? null);
  const match = String(raw || "").match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : 35;
}

function isDailyQuotaError(err) {
  const detailsStr = JSON.stringify(err.rawBody?.error?.details || []);
  return /perday|per_day|daily/i.test(detailsStr) || /per day/i.test(err.message || "");
}

function isRateLimitError(err) {
  return err.status === 429 || /quota|429/i.test(err.message);
}

function isNetworkError(err) {
  return /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|network/i.test(err.message);
}

/**
 * films: [{ id, title, description }]
 * Retourne [{ id, synopsis }] (synopsis === "SKIP" si Gemini juge que ce n'est pas assez).
 */
async function generateSynopsesBatch(films) {
  const itemsText = films
    .map((f, i) => `${i + 1}. id="${f.id}" titre="${f.title}"\ndescription YouTube: "${f.description.slice(0, 800)}"`)
    .join("\n\n");

  const prompt = `Tu es un assistant éditorial pour une plateforme de streaming de courts métrages.

Pour chacun des ${films.length} films ci-dessous, écris un synopsis de 1 à 2 phrases maximum, en français, qui décrit l'histoire ou le propos du film de manière claire et attrayante.

Règles strictes, pour chaque film :
- Si la description ne contient pas assez d'informations sur le contenu du film (crédits techniques, liens, appels à s'abonner...), mets exactement "SKIP" comme synopsis pour ce film.
- Ne mentionne jamais YouTube, des URLs, des noms de chaînes ou des appels à l'action.
- Maximum 2 phrases courtes et percutantes par synopsis.

Films :
${itemsText}

Réponds UNIQUEMENT avec un tableau JSON de ${films.length} objets, un par film, dans le même ordre, au format exact :
[{"id": "...", "synopsis": "..."}]`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 150 * films.length,
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: { id: { type: "string" }, synopsis: { type: "string" } },
              required: ["id", "synopsis"],
            },
          },
        },
      }),
    }
  );

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    const message = errBody.error?.message || "Gemini API error";
    const error = new Error(message);
    error.status = resp.status;
    error.rawBody = errBody;
    error.retryDelaySeconds = extractRetryDelaySeconds(errBody, message);
    throw error;
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) return [];

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Réponse Gemini non-JSON: ${text.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed)) throw new Error("Réponse Gemini : JSON reçu n'est pas un tableau");
  return parsed;
}

const MAX_RATE_LIMIT_RETRIES = 3;
const MAX_NETWORK_RETRIES = 3;
const NETWORK_RETRY_DELAY_MS = 8000;

async function generateSynopsesBatchWithRetry(films) {
  let rateLimitAttempts = 0;
  let networkAttempts = 0;

  for (;;) {
    try {
      return await generateSynopsesBatch(films);
    } catch (err) {
      if (isRateLimitError(err) && isDailyQuotaError(err)) {
        err.isDailyQuota = true;
        throw err;
      }
      if (isRateLimitError(err) && rateLimitAttempts < MAX_RATE_LIMIT_RETRIES) {
        rateLimitAttempts++;
        const wait = Math.max(err.retryDelaySeconds || 35, 5) + 1;
        process.stdout.write(` [429, retry ${rateLimitAttempts}/${MAX_RATE_LIMIT_RETRIES} dans ${wait}s]`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      if (isNetworkError(err) && networkAttempts < MAX_NETWORK_RETRIES) {
        networkAttempts++;
        process.stdout.write(` [reseau, retry ${networkAttempts}/${MAX_NETWORK_RETRIES} dans ${NETWORK_RETRY_DELAY_MS / 1000}s]`);
        await new Promise((r) => setTimeout(r, NETWORK_RETRY_DELAY_MS));
        continue;
      }
      err.attemptsMade = rateLimitAttempts + networkAttempts;
      throw err;
    }
  }
}

async function main() {
  console.log(`\nGénération des synopsis (${GEMINI_MODEL}, lots de ${BATCH_SIZE})${SAMPLE ? ` — SAMPLE=${SAMPLE} (test)` : " (--full)"}\n`);

  let allFilms = [], offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("films")
      .select("id, title, synopsis, yt_description")
      .range(offset, offset + 999);
    if (error) { console.error("Erreur:", error.message); process.exit(1); }
    if (!data?.length) break;
    allFilms = allFilms.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  console.log(`${allFilms.length} films au total`);

  let toUpdate = allFilms.filter((f) => isSynopsisEmpty(f.synopsis));
  console.log(`${toUpdate.length} films sans synopsis`);
  if (SAMPLE) {
    toUpdate = toUpdate.slice(0, SAMPLE);
    console.log(`→ limité aux ${toUpdate.length} premiers pour ce test`);
  }
  console.log("");

  if (!toUpdate.length) { console.log("Rien a faire !"); return; }

  let updated = 0, skippedNoInfo = 0, skippedByGemini = 0, errors = 0, geminiRequests = 0, geminiRequestsFailed = 0;
  let stoppedForDailyQuota = false;

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const slice = toUpdate.slice(i, i + BATCH_SIZE);
    const label = `[${i + 1}-${Math.min(i + slice.length, toUpdate.length)}/${toUpdate.length}]`;

    // Filtre local AVANT Gemini : description vide/crédits-only → synopsis NULL, pas d'appel API.
    const exploitable = [];
    for (const f of slice) {
      if (looksLikeCreditsOnly(f.yt_description)) {
        skippedNoInfo++;
        console.log(`${label} "${f.title}" → synopsis NULL (description vide ou crédits uniquement, pas d'appel Gemini)`);
      } else {
        exploitable.push({ id: f.id, title: f.title, description: f.yt_description });
      }
    }

    if (!exploitable.length) continue;

    process.stdout.write(`${label} lot de ${exploitable.length} film(s)...`);

    let results;
    geminiRequests++;
    try {
      results = await generateSynopsesBatchWithRetry(exploitable);
    } catch (err) {
      geminiRequestsFailed++;
      if (err.isDailyQuota) {
        console.log(`\n\nQuota JOURNALIER Gemini atteint — arrêt immédiat (pas de retry).`);
        console.log(`  ${err.message}`);
        stoppedForDailyQuota = true;
        break;
      }
      console.log(` ERREUR${err.attemptsMade > 0 ? ` (abandon apres ${err.attemptsMade} tentative(s))` : ""}: ${err.message}`);
      errors += exploitable.length;
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    const byId = new Map(results.map((r) => [r.id, r]));

    for (const { id, title } of exploitable) {
      const synopsis = byId.get(id)?.synopsis?.trim();

      if (!synopsis || synopsis === "SKIP" || synopsis.length < 15) {
        skippedByGemini++;
        console.log(`  "${title}" → SKIP (Gemini juge l'info insuffisante)`);
        continue;
      }

      const { error } = await updateAndVerify(supabase, "films", id, { synopsis });
      if (error) {
        console.log(`\nÉchec écriture "${title}" (id=${id}): ${error.message}`);
        console.error(`Arrêt — ${updated} synopsis déjà appliqués avant l'échec.`);
        process.exit(1);
      }
      updated++;
    }

    console.log(` OK — ${updated}/${toUpdate.length} traités au total`);

    await new Promise((r) => setTimeout(r, 5000));
  }

  const remaining = toUpdate.length - updated - skippedNoInfo - skippedByGemini;
  console.log(`\nTermine${stoppedForDailyQuota ? " (arret anticipe : quota journalier)" : ""} !`);
  console.log(`  Requêtes Gemini utilisées : ${geminiRequests} (dont ${geminiRequestsFailed} échouées)`);
  console.log(`  Films traités  : ${updated}/${toUpdate.length}`);
  console.log(`  Films restants : ${Math.max(0, remaining)}`);
  console.log(`  (${skippedNoInfo} synopsis mis à NULL sans appel Gemini, ${skippedByGemini} SKIP par Gemini, ${errors} erreurs de lot)\n`);
}

main();
