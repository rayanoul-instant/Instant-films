import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Variables manquantes dans .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MAINSTREAM_CHANNELS = [
  "sony pictures", "disney", "pixar", "marvel", "dreamworks",
  "warner bros", "universal pictures", "paramount", "illumination",
  "20th century", "columbia pictures", "mgm", "lionsgate",
  "studio ghibli", "aardman", "laika", "blue sky", "nickelodeon",
  "cartoon network", "netflix", "amazon studios", "apple tv",
  "filmsactu", "overwatch", "blizzard", "riot games",
  "activision", "electronic arts", "ubisoft", "nintendo",
];

const MAINSTREAM_KEYWORDS = [
  "universal pictures", "disney", "pixar", "warner bros", "dreamworks",
  "blu-ray", "blu ray", "extrait bonus", "playstation", "xbox",
  "battle.net", "preachetez", "abonne-toi a la chaine",
  "overwatch", "league of legends", "fortnite", "spider-man",
  "spider-verse", "avengers", "iron man", "hotel transylvania",
  "minions", "despicable me", "shrek", "kung fu panda",
];

function isMainstream(director, synopsis) {
  const dir = (director || "").toLowerCase();
  const syn = (synopsis || "").toLowerCase();
  if (MAINSTREAM_CHANNELS.some((ch) => dir.includes(ch))) return true;
  if (MAINSTREAM_KEYWORDS.some((kw) => syn.includes(kw))) return true;
  return false;
}

async function main() {
  console.log("\nTag Mainstream\n");

  const { data: films, error } = await supabase
    .from("films")
    .select("id, title, director, synopsis, genres")
    .order("title");

  if (error) {
    console.error("Erreur Supabase :", error.message);
    process.exit(1);
  }

  console.log(films.length + " films analyses\n");

  const toUpdate = films.filter((f) => isMainstream(f.director, f.synopsis));

  console.log(toUpdate.length + " films identifies comme Mainstream :\n");
  toUpdate.forEach((f) => console.log("  - " + f.title + " [" + (f.director || "?") + "]"));

  if (toUpdate.length === 0) {
    console.log("\nAucun film a mettre a jour.");
    return;
  }

  console.log("\nMise a jour en cours...");
  let updated = 0;

  for (const film of toUpdate) {
    let currentGenres = [];

    if (Array.isArray(film.genres)) {
      currentGenres = film.genres;
    } else if (typeof film.genres === "string" && film.genres.length > 0) {
      currentGenres = film.genres
        .replace(/[{}]/g, "")
        .split(",")
        .map((t) => t.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    }

    const alreadyTagged = currentGenres.map((t) => t.toLowerCase()).includes("mainstream");
    if (alreadyTagged) {
      continue;
    }

    const newGenres = [...currentGenres, "Mainstream"];

    const { error: updateError } = await supabase
      .from("films")
      .update({ genres: newGenres })
      .eq("id", film.id);

    if (updateError) {
      console.error("  Erreur " + film.title + ": " + updateError.message);
    } else {
      console.log("  OK : " + film.title);
      updated++;
    }
  }

  console.log("\nTermine ! " + updated + " films tagges Mainstream.\n");
}

main();
