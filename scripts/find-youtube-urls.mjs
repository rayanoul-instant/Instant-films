import { createClient } from "@supabase/supabase-js";

// ── Configuration ──────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const YT_KEY = process.env.YOUTUBE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !YT_KEY) {
  console.error("Variables manquantes dans .env :");
  if (!SUPABASE_URL) console.error("  - VITE_SUPABASE_URL");
  if (!SUPABASE_KEY) console.error("  - VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!YT_KEY) console.error("  - YOUTUBE_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Recherche YouTube ──────────────────────────────────────────
async function searchYouTube(title, director) {
  const query = director
    ? `"${title}" ${director} short film`
    : `"${title}" short film`;

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    maxResults: 3,
    key: YT_KEY,
  });

  const resp = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`
  );
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message || "YouTube API error");
  }
  const data = await resp.json();
  const items = data.items || [];
  if (items.length === 0) return null;
  return `https://www.youtube.com/watch?v=${items[0].id.videoId}`;
}

// ── Script principal ───────────────────────────────────────────
async function main() {
  console.log("\nFind Missing YouTube URLs\n");

  // Récupère les films sans video_url
  const { data: films, error } = await supabase
    .from("films")
    .select("id, title, director")
    .or("video_url.is.null,video_url.eq.")
    .order("title");

  if (error) {
    console.error("Erreur Supabase :", error.message);
    process.exit(1);
  }

  console.log(`${films.length} films sans URL YouTube\n`);

  let updated = 0;
  let notFound = 0;

  for (let i = 0; i < films.length; i++) {
    const film = films[i];
    process.stdout.write(
      `[${i + 1}/${films.length}] ${film.title.slice(0, 40)}... `
    );

    try {
      // Essai 1 : titre + réalisateur
      let url = await searchYouTube(film.title, film.director);

      // Essai 2 : titre seul si pas trouvé
      if (!url) {
        url = await searchYouTube(film.title, null);
      }

      if (url) {
        const { error: updateError } = await supabase
          .from("films")
          .update({ video_url: url })
          .eq("id", film.id);

        if (updateError) throw new Error(updateError.message);
        console.log(`OK -> ${url.slice(0, 50)}`);
        updated++;
      } else {
        console.log("non trouve");
        notFound++;
      }
    } catch (err) {
      console.log(`ERREUR : ${err.message}`);
      // Si quota depassé, on arrête
      if (err.message.includes("quota") || err.message.includes("403")) {
        console.log("\nQuota YouTube atteint. Relance demain.");
        break;
      }
    }

    // Pause pour éviter le rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nTermine !`);
  console.log(`  ${updated} URLs trouvees et mises a jour`);
  console.log(`  ${notFound} films non trouves sur YouTube\n`);
}

main();
