import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Variables manquantes dans .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Récupère tous les films déjà tagués "festival"
  const { data: already } = await supabase
    .from("films")
    .select("id")
    .or('title.ilike.%festival%,synopsis.ilike.%festival%,themes.cs.{festival}');

  const alreadyIds = new Set((already || []).map((f) => f.id));
  console.log(`${alreadyIds.size} film(s) déjà dans Festival Selection`);

  // Prend les meilleurs films pas encore tagués
  const { data: candidates, error } = await supabase
    .from("films")
    .select("id, title, themes, quality_score")
    .not('genres', 'cs', '{"mainstream"}')
    .not('genres', 'cs', '{"kid"}')
    .order("quality_score", { ascending: false })
    .limit(100);

  if (error) { console.error("Erreur:", error.message); process.exit(1); }

  const toTag = (candidates || [])
    .filter((f) => !alreadyIds.has(f.id))
    .slice(0, 8);

  if (!toTag.length) {
    console.log("Aucun film à tagger !");
    return;
  }

  console.log(`\nTaggage de ${toTag.length} films :\n`);

  for (const film of toTag) {
    const newThemes = [...new Set([...(film.themes || []), "festival"])];
    const { error: err } = await supabase
      .from("films")
      .update({ themes: newThemes })
      .eq("id", film.id);

    if (err) {
      console.log(`  ✗ ${film.title} — ${err.message}`);
    } else {
      console.log(`  ✓ ${film.title}`);
    }
  }

  console.log("\nTerminé !");
}

main();
