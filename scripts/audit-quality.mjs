/**
 * Audit qualité de la table `films`.
 * Lecture uniquement — ne modifie rien dans la base.
 *
 * Usage:
 *   node --env-file=.env scripts/audit-quality.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Variables manquantes dans .env :");
  if (!SUPABASE_URL) console.error("  - VITE_SUPABASE_URL");
  if (!SUPABASE_KEY) console.error("  - VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- Motifs de detection --------------------------------------------------

const TITLE_NOISE_PATTERNS = [
  { label: "Official", re: /\bofficial\b/i },
  { label: "HD/4K/1080p", re: /\b(hd|4k|1080p|720p)\b/i },
  { label: "Full Movie/Film", re: /\bfull\s*(movie|film|length)\b/i },
  { label: "Trailer", re: /\btrailer\b/i },
  { label: "Subscribe/Watch free", re: /\b(subscribe|watch\s*(now|free|online)|free\s*movie)\b/i },
  { label: "URL", re: /(https?:\/\/|www\.\w+)/i },
  { label: "Séparateur pipe (suffixe chaîne)", re: /\|/ },
  // "film(s)" est exclu ici : quasi tous les titres du dataset contiennent "Short Film", ce n'est pas un signe de parasite
  { label: "Mot-clé chaîne/marque", re: /\b(studios?|productions?|pictures?|media|entertainment|network|channel)\b/i },
];

const CHANNEL_NAME_PATTERNS = [
  /\b(films?|studios?|productions?|pictures?|media|entertainment|network|channel|tv|shorts?)\b/i,
  /https?:\/\//i,
  /www\.\w+/i,
];

function matchTitleNoise(title) {
  const hits = TITLE_NOISE_PATTERNS.filter((p) => p.re.test(title));
  return hits.map((h) => h.label);
}

function looksLikeChannelName(director) {
  return CHANNEL_NAME_PATTERNS.some((re) => re.test(director));
}

function isEmptySynopsis(synopsis) {
  return !synopsis || synopsis.trim().length === 0;
}

function isInvalidVideoUrl(videoUrl) {
  if (!videoUrl || videoUrl.trim().length === 0) return false; // traité séparément (manquant)
  try {
    const u = new URL(videoUrl);
    return u.protocol !== "http:" && u.protocol !== "https:";
  } catch {
    return true;
  }
}

// ---- Utils -----------------------------------------------------------------

function trunc(str, n = 60) {
  if (!str) return "";
  const s = String(str).replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function printSection(title, count, examples, formatExample) {
  console.log(`\n${title}`);
  console.log(`  → ${count} film(s) concerné(s)`);
  if (count === 0) return;
  console.log(`  Exemples (max 10) :`);
  examples.slice(0, 10).forEach((ex, i) => console.log(`    ${i + 1}. ${formatExample(ex)}`));
}

// ---- Chargement -------------------------------------------------------------

async function fetchAllFilms() {
  let all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("films")
      .select("id, title, director, synopsis, video_url")
      .range(offset, offset + 999);
    if (error) {
      console.error("Erreur Supabase:", error.message);
      process.exit(1);
    }
    if (!data?.length) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

async function main() {
  console.log("Audit qualité — table films (lecture seule)\n");

  const films = await fetchAllFilms();
  console.log(`${films.length} films chargés depuis Supabase`);

  // 1. Titres avec parasites YouTube
  const noisyTitles = films
    .map((f) => ({ film: f, hits: matchTitleNoise(f.title || "") }))
    .filter((x) => x.hits.length > 0);

  printSection(
    "1. Titres avec parasites YouTube (Official, HD, Full Movie, nom de chaîne…)",
    noisyTitles.length,
    noisyTitles,
    (x) => `"${trunc(x.film.title, 70)}"  [${x.hits.join(", ")}]  (id: ${x.film.id})`
  );

  // 2. Director ressemblant à un nom de chaîne
  const channelDirectorFilms = films.filter((f) => f.director && looksLikeChannelName(f.director));
  const directorFreq = new Map();
  for (const f of channelDirectorFilms) {
    const key = f.director.trim();
    if (!directorFreq.has(key)) directorFreq.set(key, { count: 0, sampleTitle: f.title });
    directorFreq.get(key).count++;
  }
  const topDirectors = [...directorFreq.entries()].sort((a, b) => b[1].count - a[1].count);

  printSection(
    "2. Director ressemblant à un nom de chaîne (Films, Studio, Media, URL…)",
    channelDirectorFilms.length,
    topDirectors,
    ([director, info]) => `"${trunc(director, 50)}"  — ${info.count} film(s), ex: "${trunc(info.sampleTitle, 40)}"`
  );

  // 3. Synopsis vide
  const emptySynopsisFilms = films.filter((f) => isEmptySynopsis(f.synopsis));

  printSection(
    "3. Synopsis vide",
    emptySynopsisFilms.length,
    emptySynopsisFilms,
    (f) => `"${trunc(f.title, 70)}"  (id: ${f.id})`
  );

  // 4. Synopsis dupliqué entre plusieurs films
  const bySynopsis = new Map();
  for (const f of films) {
    if (isEmptySynopsis(f.synopsis)) continue;
    const key = f.synopsis.trim();
    if (!bySynopsis.has(key)) bySynopsis.set(key, []);
    bySynopsis.get(key).push(f);
  }
  const duplicateGroups = [...bySynopsis.entries()]
    .filter(([, group]) => group.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  const duplicatedFilmsCount = duplicateGroups.reduce((sum, [, group]) => sum + group.length, 0);

  console.log(`\n4. Synopsis dupliqué entre plusieurs films`);
  console.log(`  → ${duplicateGroups.length} synopsis dupliqué(s), touchant ${duplicatedFilmsCount} film(s)`);
  if (duplicateGroups.length > 0) {
    console.log(`  Exemples (max 10 groupes) :`);
    duplicateGroups.slice(0, 10).forEach(([synopsis, group], i) => {
      const titles = group.map((f) => `"${trunc(f.title, 30)}"`).slice(0, 4).join(", ");
      const more = group.length > 4 ? ` +${group.length - 4} autre(s)` : "";
      console.log(`    ${i + 1}. (${group.length} films) ${titles}${more}`);
      console.log(`       synopsis: "${trunc(synopsis, 90)}"`);
    });
  }

  // 5. video_url manquante ou invalide
  const missingVideoFilms = films.filter((f) => !f.video_url || f.video_url.trim().length === 0);
  const invalidVideoFilms = films.filter((f) => isInvalidVideoUrl(f.video_url));
  const videoIssueFilms = [
    ...missingVideoFilms.map((f) => ({ film: f, issue: "manquante" })),
    ...invalidVideoFilms.map((f) => ({ film: f, issue: "invalide" })),
  ];

  printSection(
    "5. video_url manquante ou invalide",
    videoIssueFilms.length,
    videoIssueFilms,
    (x) => `"${trunc(x.film.title, 50)}"  — ${x.issue} (${x.film.video_url ? trunc(x.film.video_url, 40) : "null"})  (id: ${x.film.id})`
  );

  console.log("\nTerminé — aucune modification n'a été apportée à la base.\n");
}

main();
