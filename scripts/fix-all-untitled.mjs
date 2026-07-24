// scripts/fix-all-untitled.mjs
// Récupère titre + durée réels depuis YouTube API pour TOUS les CM "Untitled - xxx"
// encore présents dans la base, et met à jour la table "films" dans Supabase.
//
// Lancement (depuis le dossier Instant-films) :
//   node --env-file=.env scripts/fix-all-untitled.mjs

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

function isoDurationToMinutes(iso) {
  const h = /(\d+)H/.exec(iso);
  const m = /(\d+)M/.exec(iso);
  const s = /(\d+)S/.exec(iso);
  const totalSeconds =
    (h ? parseInt(h[1]) * 3600 : 0) +
    (m ? parseInt(m[1]) * 60 : 0) +
    (s ? parseInt(s[1]) : 0);
  return Math.max(1, Math.round(totalSeconds / 60));
}

function extractVideoId(videoUrl) {
  const match = /[?&]v=([^&]+)/.exec(videoUrl);
  return match ? match[1] : null;
}

async function fetchYoutubeData(ids) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ids.join(
    ","
  )}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.items;
}

async function main() {
  // 1. Récupère TOUS les films encore "Untitled" depuis Supabase
  const { data: untitledFilms, error: fetchError } = await supabase
    .from("films")
    .select("id, video_url")
    .like("title", "Untitled%");

  if (fetchError) {
    console.error("Erreur lors de la récupération des films:", fetchError.message);
    return;
  }

  if (!untitledFilms || untitledFilms.length === 0) {
    console.log("Aucun film 'Untitled' trouvé. Tout est déjà à jour ✅");
    return;
  }

  console.log(`${untitledFilms.length} film(s) 'Untitled' trouvé(s) dans Supabase.`);

  const videoIds = untitledFilms
    .map((f) => extractVideoId(f.video_url))
    .filter(Boolean);

  console.log(`Récupération des infos YouTube pour ${videoIds.length} CM...`);
  const items = await fetchYoutubeData(videoIds);

  if (items.length === 0) {
    console.log("Aucune donnée retournée par YouTube. Vérifie les IDs ou la clé API.");
    return;
  }

  for (const item of items) {
    const videoId = item.id;
    const title = item.snippet.title;
    const duration = isoDurationToMinutes(item.contentDetails.duration);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const { error } = await supabase
      .from("films")
      .update({ title, duration_minutes: duration })
      .eq("video_url", videoUrl);

    if (error) {
      console.error(`❌ Erreur pour ${videoId} (${title}):`, error.message);
    } else {
      console.log(`✅ ${videoId} -> "${title}" (${duration} min)`);
    }
  }

  const foundIds = items.map((i) => i.id);
  const missing = videoIds.filter((id) => !foundIds.includes(id));
  if (missing.length > 0) {
    console.log("\n⚠️  IDs non trouvés par l'API YouTube (vidéo privée, supprimée ou ID invalide) :");
    console.log("   Ces films resteront 'Untitled' tant qu'ils ne sont pas corrigés manuellement.");
    missing.forEach((id) => console.log(`   - ${id}`));
  }

  console.log("\nTerminé.");
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
