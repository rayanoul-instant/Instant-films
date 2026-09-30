/**
 * Attribue 1 à 3 genres à chaque film à partir de son synopsis (Gemini).
 *
 * Remplace les genres narratifs existants (souvent dérivés du titre par
 * l'ancien scripts/assign-genres.mjs, imprécis) par une classification basée
 * sur le vrai contenu du synopsis. Les tags administratifs "mainstream" et
 * "kid" (utilisés par useFilms.tsx pour masquer du contenu) sont TOUJOURS
 * préservés, jamais écrasés par ce script.
 *
 * Ne traite que les films qui ont un synopsis (impossible de classifier sans).
 * Lots de 40 films par requête Gemini (classification légère, peu de tokens
 * de sortie par film).
 *
 * Usage (l'un des deux flags est obligatoire) :
 *   node --env-file=.env scripts/assign-genres-from-synopsis.mjs --sample=10
 *   node --env-file=.env scripts/assign-genres-from-synopsis.mjs --full
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
const BATCH_SIZE = 40;

// Doit correspondre exactement à FilmGenre (src/types/database.ts), moins les
// tags administratifs mainstream/kid qui ne sont jamais dérivés du synopsis.
const ALLOWED_GENRES = ["drama", "comedy", "animation", "horror", "romance", "scifi", "experimental"];
const ADMIN_TAGS = ["mainstream", "kid"];

const sampleArg = process.argv.find((a) => a.startsWith("--sample="));
const FULL = process.argv.includes("--full");
const SAMPLE = sampleArg ? parseInt(sampleArg.split("=")[1], 10) : null;

if (!FULL && !SAMPLE) {
  console.error("Usage : --sample=N (test) ou --full (tous les films restants). Aucun des deux n'a été passé.");
  process.exit(1);
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
  return /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|network|timeout/i.test(err.message);
}

const GEMINI_TIMEOUT_MS = 60000;

/**
 * Protège `promise` avec un délai maximum. Contrairement à un simple
 * AbortController sur fetch() (qui ne couvre que l'attente des headers),
 * ceci couvre TOUTE la durée — y compris resp.json(), qui peut rester
 * bloqué séparément si le corps de la réponse stalle après les headers.
 * La promesse abandonnée continue en arrière-plan mais son résultat est
 * ignoré (evite un crash "unhandled rejection" si elle échoue plus tard).
 */
function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`fetch failed: timeout après ${ms / 1000}s (${label})`)), ms);
  });
  promise.catch(() => {}); // évite un unhandled rejection si elle échoue après coup
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

/**
 * films: [{ id, title, synopsis }]
 * Retourne [{ id, genres: string[] }]
 */
async function classifyGenresBatch(films) {
  return withTimeout(classifyGenresBatchInner(films), GEMINI_TIMEOUT_MS, "classify batch");
}

async function classifyGenresBatchInner(films) {
  const itemsText = films
    .map((f, i) => `${i + 1}. id="${f.id}" titre="${f.title}"\nsynopsis: "${f.synopsis.slice(0, 500)}"`)
    .join("\n\n");

  const prompt = `Tu es un classificateur de genres pour une plateforme de streaming de courts métrages.

Pour chacun des ${films.length} films ci-dessous, choisis entre 1 et 3 genres, UNIQUEMENT parmi cette liste fermée :
drama, comedy, animation, horror, romance, scifi, experimental

Règles strictes :
- N'utilise que ces 7 valeurs exactes (en anglais, en minuscules), jamais d'autre mot.
- "animation" ne s'applique que si le film est visuellement animé (dessin, 3D, stop-motion) — ce n'est pas un genre narratif en soi, combine-le avec un genre narratif si possible (ex: ["animation","drama"]).
- Choisis les genres qui décrivent le mieux le TON et le PROPOS du film d'après le synopsis, pas juste des mots-clés en surface.
- 1 à 3 genres par film, jamais 0, jamais plus de 3.

Films :
${itemsText}

Réponds UNIQUEMENT avec un tableau JSON compact (une seule ligne, sans indentation ni retour à la ligne) de ${films.length} objets, un par film, dans le même ordre, au format exact :
[{"id": "...", "genres": ["drama", "romance"]}]`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: Math.max(1000, 150 * films.length),
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                genres: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
              },
              required: ["id", "genres"],
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

async function classifyGenresBatchWithRetry(films) {
  let rateLimitAttempts = 0;
  let networkAttempts = 0;

  for (;;) {
    try {
      return await classifyGenresBatch(films);
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
  console.log(`\nAttribution des genres depuis le synopsis (${GEMINI_MODEL}, lots de ${BATCH_SIZE})${SAMPLE ? ` — SAMPLE=${SAMPLE} (test)` : " (--full)"}\n`);

  let allFilms = [], offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("films")
      .select("id, title, synopsis, genres")
      .range(offset, offset + 999);
    if (error) { console.error("Erreur:", error.message); process.exit(1); }
    if (!data?.length) break;
    allFilms = allFilms.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  console.log(`${allFilms.length} films au total`);

  const noSynopsis = allFilms.filter((f) => !f.synopsis || !f.synopsis.trim()).length;
  const withSynopsis = allFilms.filter((f) => f.synopsis && f.synopsis.trim());

  // Idempotent : un film est "déjà classifié" s'il a déjà au moins un genre
  // narratif (pas juste mainstream/kid) — on ne le retraite pas à chaque run.
  const isAlreadyClassified = (f) => Array.isArray(f.genres) && f.genres.some((g) => ALLOWED_GENRES.includes(g));
  const alreadyClassifiedCount = withSynopsis.filter(isAlreadyClassified).length;
  let toClassify = withSynopsis.filter((f) => !isAlreadyClassified(f));

  console.log(`${withSynopsis.length} films avec synopsis (classifiables)`);
  console.log(`${alreadyClassifiedCount} déjà classifiés — ignorés`);
  console.log(`${toClassify.length} films à classifier`);
  if (noSynopsis > 0) console.log(`${noSynopsis} films sans synopsis — ignorés (impossible de classifier)`);
  if (SAMPLE) {
    toClassify = toClassify.slice(0, SAMPLE);
    console.log(`→ limité aux ${toClassify.length} premiers pour ce test`);
  }
  console.log("");

  if (!toClassify.length) { console.log("Rien a faire !"); return; }

  let updated = 0, errors = 0, geminiRequests = 0, geminiRequestsFailed = 0;
  let stoppedForDailyQuota = false;

  for (let i = 0; i < toClassify.length; i += BATCH_SIZE) {
    const slice = toClassify.slice(i, i + BATCH_SIZE);
    const label = `[${i + 1}-${Math.min(i + slice.length, toClassify.length)}/${toClassify.length}]`;

    process.stdout.write(`${label} lot de ${slice.length} film(s)...`);

    let results;
    geminiRequests++;
    try {
      results = await classifyGenresBatchWithRetry(slice.map((f) => ({ id: f.id, title: f.title, synopsis: f.synopsis })));
    } catch (err) {
      geminiRequestsFailed++;
      if (err.isDailyQuota) {
        console.log(`\n\nQuota JOURNALIER Gemini atteint — arrêt immédiat (pas de retry).`);
        console.log(`  ${err.message}`);
        stoppedForDailyQuota = true;
        break;
      }
      console.log(` ERREUR${err.attemptsMade > 0 ? ` (abandon apres ${err.attemptsMade} tentative(s))` : ""}: ${err.message}`);
      errors += slice.length;
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    const byId = new Map(results.map((r) => [r.id, r]));

    for (const film of slice) {
      const raw = byId.get(film.id)?.genres;
      const validNew = Array.isArray(raw) ? raw.filter((g) => ALLOWED_GENRES.includes(g)).slice(0, 3) : [];

      if (!validNew.length) {
        console.log(`\n  "${film.title}" → aucun genre valide renvoyé, ignoré`);
        errors++;
        continue;
      }

      // Préserve les tags administratifs existants (mainstream/kid), jamais écrasés.
      const existing = Array.isArray(film.genres) ? film.genres : [];
      const preservedAdminTags = ADMIN_TAGS.filter((tag) => existing.some((g) => g.toLowerCase() === tag));
      const finalGenres = [...new Set([...validNew, ...preservedAdminTags])];

      const { error } = await updateAndVerify(supabase, "films", film.id, { genres: finalGenres });
      if (error) {
        console.log(`\nÉchec écriture "${film.title}" (id=${film.id}): ${error.message}`);
        console.error(`Arrêt — ${updated} films déjà classifiés avant l'échec.`);
        process.exit(1);
      }
      updated++;
    }

    console.log(` OK — ${updated}/${toClassify.length} traités au total`);

    await new Promise((r) => setTimeout(r, 5000));
  }

  const remaining = toClassify.length - updated - errors;
  console.log(`\nTermine${stoppedForDailyQuota ? " (arret anticipe : quota journalier)" : ""} !`);
  console.log(`  Requêtes Gemini utilisées : ${geminiRequests} (dont ${geminiRequestsFailed} échouées)`);
  console.log(`  Films traités  : ${updated}/${toClassify.length}`);
  console.log(`  Films restants : ${Math.max(0, remaining)}`);
  console.log(`  (${errors} erreurs/genres invalides)\n`);
}

main();
