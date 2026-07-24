import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const YT_KEY = process.env.YOUTUBE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !YT_KEY) {
  console.error("Variables manquantes dans .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FAKE_DIRECTORS = [
  "short of the week", "courts toujours", "arte", "omeleto", "cgmeetup",
  "thecgbros", "dust", "nikon film festival", "bang bang", "pocket films",
  "centerframe", "univers court", "alter", "budgetlessfilms", "filmsactu",
  "shortverse", "short of the week originals", "alter shorts",
];

function normalize(str) {
  return str.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();
}

function extractDirector(description) {
  if (!description) return null;
  const desc = description;
  const descNorm = normalize(description);

  const patterns = [
    { prefix: "written and directed by ", skip: 23 },
    { prefix: "written & directed by ", skip: 21 },
    { prefix: "directed by\n", skip: 12 },
    { prefix: "directed by ", skip: 12 },
    { prefix: "dir.\n", skip: 5 },
    { prefix: "dir. ", skip: 5 },
    { prefix: "dir: ", skip: 5 },
    { prefix: "a film by ", skip: 10 },
    { prefix: "un film de ", skip: 11 },
    { prefix: "director:\n", skip: 10 },
    { prefix: "director: ", skip: 10 },
    { prefix: "director / ", skip: 11 },
    { prefix: "director - ", skip: 11 },
    { prefix: "director – ", skip: 11 },
    // Patterns normalisés (accents supprimés)
    { prefix: "realisation : ", skip: 14 },
    { prefix: "realisation: ", skip: 13 },
    { prefix: "realisation\n", skip: 12 },
    { prefix: "realisateur : ", skip: 14 },
    { prefix: "realisateur: ", skip: 13 },
    { prefix: "realisateurs : ", skip: 15 },
    { prefix: "realise par ", skip: 12 },
    { prefix: "real. ", skip: 6 },
    { prefix: "real.\n", skip: 6 },
    { prefix: "filmmaker: ", skip: 11 },
  ];

  for (const { prefix, skip } of patterns) {
    // Chercher sur le texte normalisé
    const idx = descNorm.indexOf(prefix);
    if (idx >= 0) {
      // Extraire depuis le texte original à la même position
      const start = idx + skip;
      let end = desc.indexOf("\n", start);
      if (end < 0 || end - start > 60) end = start + 60;
      let name = desc.slice(start, end).trim();
      // Couper aux délimiteurs
      for (const delim of [",", "|", "(", "http", "@", "Scénario", "Scenario", "Montage", "Musique", "Music", "Sound", "Producer", "Editor"]) {
        const di = name.indexOf(delim);
        if (di > 0) name = name.slice(0, di).trim();
      }
      // Nettoyer le point final
      name = name.replace(/\.$/, "").trim();
      if (name.length > 2 && name.length < 55) {
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
  const params = new URLSearchParams({ part: "snippet", id: videoIds.join(","), key: YT_KEY });
  const resp = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
  if (!resp.ok) { const err = await resp.json(); throw new Error(err.error?.message || "YouTube API error"); }
  const data = await resp.json();
  const result = {};
  for (const item of data.items || []) result[item.id] = item.snippet?.description || "";
  return result;
}

async function main() {
  console.log("\nCorrection des noms de realisateurs\n");

  let allFilms = [], offset = 0;
  while (true) {
    const { data, error } = await supabase.from("films").select("id, title, director, video_url").range(offset, offset + 999);
    if (error) { console.error("Erreur:", error.message); process.exit(1); }
    if (!data?.length) break;
    allFilms = allFilms.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  console.log(`${allFilms.length} films au total`);

  const toUpdate = allFilms.filter((f) => {
    const dir = normalize(f.director || "");
    return dir === "" || FAKE_DIRECTORS.some((fake) => dir === fake || dir.includes(fake));
  });

  console.log(`${toUpdate.length} films a corriger\n`);
  if (!toUpdate.length) { console.log("Rien a faire !"); return; }

  let updated = 0, cleared = 0;

  for (let i = 0; i < toUpdate.length; i += 50) {
    const batch = toUpdate.slice(i, i + 50);
    const videoIds = batch.map((f) => extractVideoId(f.video_url)).filter(Boolean);
    if (!videoIds.length) continue;

    try {
      const descriptions = await getYouTubeDescriptions(videoIds);
      for (const film of batch) {
        const vidId = extractVideoId(film.video_url);
        if (!vidId) continue;
        const director = extractDirector(descriptions[vidId]);
        const idx = i + batch.indexOf(film) + 1;
        process.stdout.write(`[${idx}/${toUpdate.length}] ${film.title.slice(0, 35).padEnd(35)} → `);
        const { error } = await supabase.from("films").update({ director: director || "" }).eq("id", film.id);
        if (error) { console.log(`ERREUR: ${error.message}`); }
        else if (director) { console.log(director); updated++; }
        else { console.log("vide"); cleared++; }
      }
    } catch (err) {
      console.error(`Erreur: ${err.message}`);
      if (err.message.includes("quota") || err.message.includes("403")) { console.log("\nQuota atteint."); break; }
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nTermine !`);
  console.log(`  ${updated} realisateurs corriges`);
  console.log(`  ${cleared} champs vides (non trouve)`);
  console.log(`  Total traite : ${updated + cleared}/${toUpdate.length}\n`);
}

main();
