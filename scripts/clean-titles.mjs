/**
 * Nettoie les titres des films déjà en base Supabase.
 *
 * Par défaut : mode dry-run — affiche les changements proposés, n'écrit rien.
 * Usage:
 *   node scripts/clean-titles.mjs            (dry-run, lecture seule)
 *   node scripts/clean-titles.mjs --apply    (écrit les display_title en base)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { requireServiceRoleKey, updateAndVerify } from './_write-guard.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n').filter(l => l.includes('=')).map(line => {
    const idx = line.indexOf('=');
    return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')];
  })
);

export const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } }
);

// Mots signalant une phrase-description ("clickbait") plutôt qu'un vrai titre,
// ex: "Man Takes Large Dose of Psychedelics and Embarks on a Mystical Journey | Heroic Dose"
// → le vrai titre est ici APRÈS le pipe ("Heroic Dose"), pas avant.
const NARRATIVE_VERB_HINTS = [
  'goes', 'ends', 'meets', 'takes', 'falls', 'struggles', 'discovers', 'battles',
  'spirals', 'unravels', 'awakens', 'sparks', 'shares', 'share', 'hides', 'embarks',
  'faces', 'question', 'questions', 'finds', 'learns', 'becomes', 'turns', 'confronts',
  'explores', 'reveals', 'uncovers', 'chases', 'seeks', 'searches', 'wonders',
  'realizes', 'decides', 'tries', 'attempts', 'encounters', 'enrolls', 'communicate',
];

// Segment avant le " | " trop long ou trop "narratif" → probablement une description,
// pas un titre. On ne coupe pas : on laisse la ligne intacte pour vérification manuelle.
const PIPE_MAX_SAFE_WORDS = 6;

function looksLikeDescription(segment) {
  const words = segment.trim().split(/\s+/).filter(Boolean);
  if (words.length > PIPE_MAX_SAFE_WORDS) return true;
  const lower = segment.toLowerCase();
  return NARRATIVE_VERB_HINTS.some((v) => new RegExp(`\\b${v}\\b`).test(lower));
}

/**
 * Retourne { title, warning }.
 * warning !== null  → titre laissé inchangé, à vérifier à la main (jamais auto-appliqué).
 */
export function cleanTitle(raw) {
  const full = raw.trim();

  // On borne tout de suite la "zone de recherche" au segment avant le premier " | ".
  // Important : les guillemets ne doivent JAMAIS être recherchés après le pipe, sinon
  // un mot entre guillemets dans la description ("...for her "Crying Problem"") est
  // pris à tort pour le titre alors que le vrai titre ("Empath") est avant le pipe.
  const pipeIdx = full.indexOf(' | ');
  const hasPipe = pipeIdx > 0;
  const scope = hasPipe ? full.slice(0, pipeIdx).trim() : full;

  // Cas 1 : titre entre guillemets au DÉBUT → "Vrai Titre" blabla
  // ex: "Feathers and Fur" ACCD Capstone Short Film
  const quotedStart = scope.match(/^["«](.+?)["»](.*)$/);
  if (quotedStart) return { title: quotedStart[1].trim(), warning: null };

  // Cas 1b : guillemet fermant sans guillemet ouvrant
  // ex: Feathers and Fur" ACCD Capstone Short Film
  const missingOpen = scope.match(/^([^"""]+)["»]\s+\S/);
  if (missingOpen) return { title: missingOpen[1].trim(), warning: null };

  // Cas 2 : titre entre guillemets quelque part dans le segment avant le pipe
  // ex: Horror Short Film "The Moths Will Eat Them Up"
  const quotedAnywhere = scope.match(/["«](.+?)["»]/);
  if (quotedAnywhere) return { title: quotedAnywhere[1].trim(), warning: null };

  // Cas 3 : pas de guillemets → coupe tout après " | " (suffixe chaîne/marque),
  // sauf si le segment avant le pipe ressemble à une description narrative
  // (ex: "Man Takes Large Dose... | Heroic Dose" → le vrai titre est après le pipe)
  if (hasPipe && looksLikeDescription(scope)) {
    return {
      title: full,
      warning: `segment avant "|" ressemble à une description ("${scope}"), pas à un titre — le vrai titre est peut-être après le pipe`,
    };
  }

  let t = scope;

  const NOISE_WORDS = [
    'short film', 'short movie', 'short horror', 'short comedy', 'short drama',
    'short thriller', 'short animation', 'official short', 'animated short',
    'award winning', 'award-winning', 'capstone', 'iphone', 'shot on',
    '4k', ' hd', 'full film', 'online premiere', 'now streaming',
    'ft.', 'feat.', 'starring', 'presented by',
    'court métrage', 'court metrage', 'film court',
    'hindi', 'tamil', 'malayalam', 'kannada', 'telugu', 'assamese',
    'nepali', 'urdu', 'gujarati', 'bodo', 'kokborok',
    'dust', 'gobelins', 'cgbros', 'mym', 'accd', 'dms',
  ];

  // Cas 4 : coupe au premier " - " suivi d'un mot-clé parasite
  const dashParts = t.split(/\s*[-–—]\s*/);
  if (dashParts.length > 1) {
    for (let i = 1; i < dashParts.length; i++) {
      const rest = dashParts.slice(i).join(' - ').toLowerCase();
      if (NOISE_WORDS.some(n => rest.startsWith(n) || rest.includes(n))) {
        t = dashParts.slice(0, i).join(' - ').trim();
        break;
      }
    }
  }

  t = t.replace(/\s*\(\d{4}\)\s*/g, ' ').trim();
  t = t.replace(/\s*\((4k|hd|full|official|award.winning)\)\s*/gi, ' ').trim();
  t = t.replace(/^#\S+\s*/g, '').replace(/\s*#\S+/g, '').trim();
  return { title: t || raw.trim(), warning: null };
}

// PostgREST plafonne à 1000 lignes par requête : on pagine pour tout récupérer.
export async function fetchAllFilms() {
  let all = [], offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('films')
      .select('id, title, display_title')
      .range(offset, offset + 999);
    if (error) { console.error('❌', error.message); process.exit(1); }
    if (!data?.length) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

/** Classe tous les films en { toApply, flagged, hasCustom, unchanged }. */
export function classifyFilms(films) {
  let hasCustom = 0, unchanged = 0;
  const toApply = [];
  const flagged = [];

  for (const film of films) {
    // Ne pas écraser un display_title déjà modifié manuellement
    if (film.display_title) { hasCustom++; continue; }

    const { title: cleaned, warning } = cleanTitle(film.title);
    if (warning) { flagged.push({ film, warning }); continue; }
    if (cleaned === film.title.trim()) { unchanged++; continue; }
    toApply.push({ film, cleaned });
  }

  return { toApply, flagged, hasCustom, unchanged };
}

async function main() {
  const APPLY = process.argv.includes('--apply');
  if (APPLY) requireServiceRoleKey(env);

  const films = await fetchAllFilms();

  console.log(APPLY
    ? '🚀 Mode APPLY — les display_title vont être écrits en base\n'
    : '👀 Mode DRY-RUN (par défaut) — aucune écriture. Relance avec --apply pour appliquer.\n');
  console.log(`📽️  ${films.length} films chargés\n`);

  const { toApply, flagged, hasCustom, unchanged } = classifyFilms(films);

  console.log(`${toApply.length} changement(s) ${APPLY ? 'à appliquer' : 'proposé(s)'} :`);
  for (const { film, cleaned } of toApply) {
    console.log(`  ✏️  "${film.title}"\n      → "${cleaned}"`);
  }

  console.log(`\n⚠️  ${flagged.length} titre(s) ambigu(s) — laissés inchangés, à vérifier manuellement :`);
  for (const { film, warning } of flagged) {
    console.log(`  ⚠️  "${film.title}"\n      ${warning}`);
  }

  console.log(`\n(${hasCustom} déjà personnalisé(s) ignoré(s), ${unchanged} sans changement détecté)`);

  if (APPLY) {
    console.log(`\nApplication en base...`);
    let updated = 0;
    for (const { film, cleaned } of toApply) {
      const { error: err } = await updateAndVerify(supabase, 'films', film.id, { display_title: cleaned });
      if (err) {
        console.error(`\n❌ Échec sur id=${film.id} ("${film.title}") : ${err.message}`);
        console.error(`Arrêt — ${updated}/${toApply.length} déjà appliqués avant l'échec.`);
        process.exit(1);
      }
      updated++;
    }
    console.log(`\n✅ ${updated}/${toApply.length} display_title mis à jour.`);
  } else {
    console.log(`\n👀 Dry-run : rien n'a été écrit. Relance avec --apply pour appliquer ces ${toApply.length} changements.`);
  }
}

// N'exécute le flux principal (fetch + écriture éventuelle) que si le fichier est lancé
// directement — pas quand cleanTitle/classifyFilms/fetchAllFilms sont importés ailleurs.
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
