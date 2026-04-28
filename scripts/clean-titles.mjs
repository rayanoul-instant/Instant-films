/**
 * Nettoie les titres des films déjà en base Supabase.
 * Usage: node scripts/clean-titles.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n').filter(l => l.includes('=')).map(line => {
    const idx = line.indexOf('=');
    return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')];
  })
);

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } }
);

function cleanTitle(raw) {
  let t = raw.trim();

  // Cas 1 : titre entre guillemets au DÉBUT → "Vrai Titre" blabla
  // ex: "Feathers and Fur" ACCD Capstone Short Film
  const quotedStart = t.match(/^["«](.+?)["»](.*)$/);
  if (quotedStart) return quotedStart[1].trim();

  // Cas 1b : guillemet fermant sans guillemet ouvrant
  // ex: Feathers and Fur" ACCD Capstone Short Film
  const missingOpen = t.match(/^([^"""]+)["»]\s+\S/);
  if (missingOpen) return missingOpen[1].trim();

  // Cas 2 : titre entre guillemets quelque part dans la chaîne
  // ex: Horror Short Film "The Moths Will Eat Them Up"
  const quotedAnywhere = t.match(/["«](.+?)["»]/);
  if (quotedAnywhere) return quotedAnywhere[1].trim();

  // Cas 3 : coupe tout après " | "
  const pipeIdx = t.indexOf(' | ');
  if (pipeIdx > 0) t = t.slice(0, pipeIdx).trim();

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
  return t || raw.trim();
}

const { data: films, error } = await supabase.from('films').select('id, title, display_title');
if (error) { console.error('❌', error.message); process.exit(1); }

console.log(`📽️  ${films.length} films à traiter\n`);

let updated = 0, skipped = 0;

for (const film of films) {
  // Ne pas écraser un display_title déjà modifié manuellement
  if (film.display_title) { skipped++; continue; }

  const cleaned = cleanTitle(film.title);
  console.log(`✏️  "${film.title}"\n   → "${cleaned}"`);
  const { error: err } = await supabase.from('films').update({ display_title: cleaned }).eq('id', film.id);
  if (err) console.error(`   ❌ ${err.message}`);
  else updated++;
}

console.log(`\n✅ ${updated} display_title remplis, ${skipped} ignorés.`);
