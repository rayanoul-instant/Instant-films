import { createClient } from "@supabase/supabase-js";
import { requireServiceRoleKey, deleteAndVerify } from "./_write-guard.mjs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("Variables manquantes dans .env");
  process.exit(1);
}
requireServiceRoleKey();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mots-cles qui indiquent un episode de serie
const SERIES_PATTERNS = [
  /épisode\s*n[°o]?\s*\d+/i,
  /episode\s*n[°o]?\s*\d+/i,
  /\bep\.?\s*\d+\b/i,
  /s\d+e\d+/i,
  /saison\s*\d+/i,
  /partie\s*\d+/i,
  /\bpart\s*\d+\b/i,
];

function isSeries(title) {
  return SERIES_PATTERNS.some((pattern) => pattern.test(title));
}

async function main() {
  console.log("\nSuppression des episodes de series\n");

  // Recupere tous les films
  const { data: films, error } = await supabase
    .from("films")
    .select("id, title")
    .order("title");

  if (error) {
    console.error("Erreur Supabase :", error.message);
    process.exit(1);
  }

  // Identifie les series
  const toDelete = films.filter((f) => isSeries(f.title));

  console.log(`${films.length} films au total`);
  console.log(`${toDelete.length} episodes de series detectes :\n`);
  toDelete.forEach((f) => console.log(`  - ${f.title}`));

  if (toDelete.length === 0) {
    console.log("\nAucun episode a supprimer.");
    return;
  }

  // Confirmation
  console.log(`\nSuppression de ${toDelete.length} episodes...`);

  const ids = toDelete.map((f) => f.id);
  const { error: deleteError, deletedIds } = await deleteAndVerify(supabase, "films", ids);

  if (deleteError) {
    console.error("Erreur suppression :", deleteError.message);
    process.exit(1);
  }

  console.log(`\nTermine ! ${deletedIds.length} episodes supprimes.`);
  console.log(`Il reste ${films.length - deletedIds.length} films.\n`);
}

main();
