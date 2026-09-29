/**
 * Récupère les stats YouTube (description, vues, likes, commentaires, date de
 * publication) pour tous les films et les stocke en base (yt_description,
 * yt_views, yt_likes, yt_comments, yt_published_at, yt_fetched_at).
 *
 * N'utilise PAS Gemini — uniquement l'API YouTube Data v3 (videos.list,
 * part=snippet,statistics, 50 IDs par requête, le maximum autorisé).
 *
 * Ignore les films déjà récupérés (yt_fetched_at non vide), donc relançable
 * sans refaire le travail.
 *
 * Usage (l'un des deux flags est obligatoire) :
 *   node --env-file=.env scripts/fetch-youtube-stats.mjs --sample=10   (test sur 10 films)
 *   node --env-file=.env scripts/fetch-youtube-stats.mjs --full        (tous les films restants)
 */
import { createClient } from "@supabase/supabase-js";
import { requireServiceRoleKey, updateAndVerify } from "./_write-guard.mjs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YT_KEY = process.env.YOUTUBE_API_KEY;

if (!SUPABASE_URL || !YT_KEY) {
  console.error("Variables manquantes dans .env :");
  if (!SUPABASE_URL) console.error("  - VITE_SUPABASE_URL");
  if (!YT_KEY) console.error("  - YOUTUBE_API_KEY");
  process.exit(1);
}
requireServiceRoleKey();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const sampleArg = process.argv.find((a) => a.startsWith("--sample="));
const FULL = process.argv.includes("--full");
const SAMPLE = sampleArg ? parseInt(sampleArg.split("=")[1], 10) : null;

if (!FULL && !SAMPLE) {
  console.error("Usage : --sample=N (test) ou --full (tous les films restants). Aucun des deux n'a été passé.");
  process.exit(1);
}

const YT_BATCH_SIZE = 50; // max autorisé par videos.list
const MAX_NETWORK_RETRIES = 3;
const NETWORK_RETRY_DELAY_MS = 8000;

function isNetworkError(err) {
  return /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|network/i.test(err.message || "");
}

/** Retente jusqu'à MAX_NETWORK_RETRIES fois sur une erreur réseau transitoire. */
async function withNetworkRetry(fn, label) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isNetworkError(err) || attempt >= MAX_NETWORK_RETRIES) throw err;
      console.error(`Erreur reseau (${label}) — retry ${attempt + 1}/${MAX_NETWORK_RETRIES} dans ${NETWORK_RETRY_DELAY_MS / 1000}s: ${err.message}`);
      await new Promise((r) => setTimeout(r, NETWORK_RETRY_DELAY_MS));
    }
  }
}

function extractVideoId(url) {
  const m = url?.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function getYouTubeStats(videoIds) {
  const params = new URLSearchParams({ part: "snippet,statistics", id: videoIds.join(","), key: YT_KEY });
  const resp = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
  if (!resp.ok) { const err = await resp.json(); throw new Error(err.error?.message || "YouTube API error"); }
  const data = await resp.json();
  const result = {};
  for (const item of data.items || []) {
    result[item.id] = {
      yt_description: item.snippet?.description || null,
      yt_views: item.statistics?.viewCount != null ? parseInt(item.statistics.viewCount, 10) : null,
      yt_likes: item.statistics?.likeCount != null ? parseInt(item.statistics.likeCount, 10) : null,
      yt_comments: item.statistics?.commentCount != null ? parseInt(item.statistics.commentCount, 10) : null,
      yt_published_at: item.snippet?.publishedAt || null,
    };
  }
  return result;
}

async function main() {
  console.log(`\nRécupération des stats YouTube${SAMPLE ? ` — SAMPLE=${SAMPLE} (test)` : " (--full)"}\n`);

  let allFilms = [], offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("films")
      .select("id, title, video_url, yt_fetched_at")
      .range(offset, offset + 999);
    if (error) { console.error("Erreur:", error.message); process.exit(1); }
    if (!data?.length) break;
    allFilms = allFilms.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  console.log(`${allFilms.length} films au total`);

  let toFetch = allFilms.filter((f) => !f.yt_fetched_at);
  console.log(`${toFetch.length} films jamais récupérés`);
  if (SAMPLE) {
    toFetch = toFetch.slice(0, SAMPLE);
    console.log(`→ limité aux ${toFetch.length} premiers pour ce test`);
  }
  console.log("");

  if (!toFetch.length) { console.log("Rien a faire !"); return; }

  let updated = 0, noVideoId = 0, notFoundOnYouTube = 0, errors = 0;

  for (let i = 0; i < toFetch.length; i += YT_BATCH_SIZE) {
    const batch = toFetch.slice(i, i + YT_BATCH_SIZE);
    const idToFilm = new Map();
    for (const f of batch) {
      const vidId = extractVideoId(f.video_url);
      if (!vidId) { noVideoId++; continue; }
      idToFilm.set(vidId, f);
    }

    if (!idToFilm.size) continue;

    let stats;
    try {
      stats = await withNetworkRetry(() => getYouTubeStats([...idToFilm.keys()]), `YouTube batch ${i}`);
    } catch (err) {
      console.error(`[${i + 1}-${i + batch.length}/${toFetch.length}] Erreur YouTube: ${err.message}`);
      errors += idToFilm.size;
      if (err.message.includes("quota")) { console.log("Quota YouTube atteint — arrêt."); break; }
      continue;
    }

    for (const [vidId, film] of idToFilm) {
      const s = stats[vidId];
      if (!s) {
        notFoundOnYouTube++;
        console.log(`[${film.title.slice(0, 50)}] introuvable sur YouTube (vidéo supprimée/privée ?)`);
        continue;
      }

      let writeResult;
      try {
        writeResult = await withNetworkRetry(
          () => updateAndVerify(supabase, "films", film.id, { ...s, yt_fetched_at: new Date().toISOString() }),
          `écriture id=${film.id}`
        );
      } catch (err) {
        writeResult = { error: err };
      }
      const { error } = writeResult;
      if (error) {
        console.log(`\nÉchec écriture "${film.title}" (id=${film.id}): ${error.message}`);
        console.error(`Arrêt — ${updated} films déjà mis à jour avant l'échec.`);
        process.exit(1);
      }
      updated++;
    }

    console.log(`[${i + 1}-${Math.min(i + batch.length, toFetch.length)}/${toFetch.length}] lot traité — ${updated}/${toFetch.length} traités au total`);
  }

  const remaining = toFetch.length - updated;
  console.log(`\nTermine !`);
  console.log(`  Traités  : ${updated}/${toFetch.length}`);
  console.log(`  Restants : ${remaining}`);
  console.log(`  (${noVideoId} sans video_url exploitable, ${notFoundOnYouTube} introuvables sur YouTube, ${errors} erreurs de batch)\n`);
}

main();
