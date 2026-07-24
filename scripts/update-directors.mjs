import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const YT_KEY = process.env.YOUTUBE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !YT_KEY) {
  console.error("Variables manquantes dans .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Patterns pour extraire le realisateur depuis la description
function extractDirector(description) {
  if (!description) return null;
  const desc = description;
  const descLower = description.toLowerCase();

  const patterns = [
    { prefix: "written and directed by ", skip: 23 },
    { prefix: "written & directed by ", skip: 21 },
    { prefix: "directed by\n", skip: 12 },
    { prefix: "directed by ", skip: 12 },
    { prefix: "dir. ", skip: 5 },
    { prefix: "dir: ", skip: 5 },
    { prefix: "a film by ", skip: 10 },
    { prefix: "un film de ", skip: 11 },
    { prefix: "director:\n", skip: 10 },
    { prefix: "director: ", skip: 10 },
    { prefix: "director / ", skip: 11 },
    { prefix: "director – ", skip: 11 },
    { prefix: "director - ", skip: 11 },
    { prefix: "realise par ", skip: 12 },
    { prefix: "réalisé par ", skip: 12 },
    { prefix: "realisateur : ", skip: 14 },
    { prefix: "réalisateur : ", skip: 14 },
    { prefix: "realisateurs : ", skip: 15 },
    { prefix: "réalisateurs : ", skip: 15 },
    { prefix: "réal. ", skip: 6 },
    { prefix: "real. ", skip: 6 },
  ];

  for (const { prefix, skip } of patterns) {
    const idx = descLower.indexOf(prefix);
    if (idx >= 0) {
      const start = idx + skip;
      let end = desc.indexOf("\n", start);
      if (end < 0 || end - start > 60) end = start + 60;
      let name = desc.slice(start, end).trim();
      // Couper aux delimiteurs
      for (const delim of [",", ".", "|", "(", "http"]) {
        if (name.includes(delim)) {
          name = name.slice(0, name.indexOf(delim)).trim();
        }
      }
      if (name.length > 2 && name.length < 50) {
        return name;
      }
    }
  }
  return null;
}

function extractVideoId(url) {
  const m = url?.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function getYouTubeDescriptions(videoIds) {
  const params = new URLSearchParams({
    part: "snippet",
    id: videoIds.join(","),
    key: YT_KEY,
  });
  const resp = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params}`
  );
  const data = await resp.json();
  const result = {};
  for (const item of data.items || []) {
    result[item.id] = item.snippet?.description || "";
  }
  return result;
}

async function main() {
  console.log("\nMise a jour des realisateurs\n");

  // Recuperer les films avec un realisateur suspect (chaine YouTube ou vide)
  const SUSPECT_CHANNELS = [
    "Short of the Week",
    "Courts Toujours",
    "ARTE",
    "Omeleto",
    "CGMeetup",
    "Dust",
    "Nikon Film Festival",
  ];

  let allFilms = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("films")
      .select("id, title, director, video_url")
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Erreur Supabase:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allFilms = allFilms.concat(data);
    if (data.length < limit) break;
    offset += limit;
  }

  console.log(`${allFilms.length} films au total`);

  // Filtrer ceux avec un realisateur suspect ou vide
  const toUpdate = allFilms.filter((f) => {
    const dir = (f.director || "").trim();
    return (
      dir === "" ||
      SUSPECT_CHANNELS.some(
        (ch) => dir.toLowerCase() === ch.toLowerCase()
      )
    );
  });

  console.log(`${toUpdate.length} films avec realisateur a corriger\n`);

  if (toUpdate.length === 0) {
    console.log("Rien a faire !");
    return;
  }

  let updated = 0;
  let notFound = 0;

  // Traiter par batch de 50
  for (let i = 0; i < toUpdate.length; i += 50) {
    const batch = toUpdate.slice(i, i + 50);
    const videoIds = batch
      .map((f) => extractVideoId(f.video_url))
      .filter(Boolean);

    if (videoIds.length === 0) continue;

    try {
      const descriptions = await getYouTubeDescriptions(videoIds);

      for (const film of batch) {
        const vidId = extractVideoId(film.video_url);
        if (!vidId) continue;

        const description = descriptions[vidId];
        const director = extractDirector(description);

        process.stdout.write(
          `[${i + 1}/${toUpdate.length}] ${film.title.slice(0, 35).padEnd(35)} → `
        );

        if (director) {
          const { error } = await supabase
            .from("films")
            .update({ director })
            .eq("id", film.id);

          if (error) {
            console.log(`ERREUR: ${error.message}`);
          } else {
            console.log(director);
            updated++;
          }
        } else {
          console.log("non trouve");
          notFound++;
        }
      }
    } catch (err) {
      console.error(`Erreur batch: ${err.message}`);
    }

    // Pause entre les batchs
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nTermine !`);
  console.log(`  ${updated} realisateurs mis a jour`);
  console.log(`  ${notFound} films sans realisateur trouvable\n`);
}

main();
