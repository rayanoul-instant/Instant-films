// scripts/fix-untitled.mjs
// Récupère titre + durée réels depuis YouTube API pour les CM "Untitled - xxx"
// et met à jour la table "films" dans Supabase.
//
// Lancement (depuis le dossier Instant-films) :
//   node --env-file=.env scripts/fix-untitled.mjs

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// IDs YouTube des CM encore "Untitled - xxx" dans la base
const VIDEO_IDS = [
  "t60MMJH_1ds",
  "7iCP7zoDKek",
  "oyeTEzDUYow",
  "mhazCS14Tas",
  "Hik4n3Ld88Y",
  "iMNu-o17k-M",
];

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
  console.log(`Récupération des infos YouTube pour ${VIDEO_IDS.length} CM...`);
  const items = await fetchYoutubeData(VIDEO_IDS);

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

  // Vérifie si certains IDs n'ont pas été trouvés par l'API (vidéo privée/supprimée)
  const foundIds = items.map((i) => i.id);
  const missing = VIDEO_IDS.filter((id) => !foundIds.includes(id));
  if (missing.length > 0) {
    console.log("\n⚠️  IDs non trouvés par l'API YouTube (vidéo privée, supprimée ou ID invalide) :");
    missing.forEach((id) => console.log(`   - ${id}`));
  }

  console.log("\nTerminé.");
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
