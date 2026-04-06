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
  const NOISE = [
    'short film', 'short movie', 'short horror', 'short comedy', 'short drama',
    'short thriller', 'short sci-fi', 'short romance', 'short animation',
    'official short', 'animated short', 'award.winning', 'award winning',
    'iphone', 'shot on iphone', '4k', 'hd', 'full', 'online premiere',
    'now streaming', 'official', 'english', 'hindi', 'tamil', 'malayalam',
    'kannada', 'telugu', 'assamese', 'nepali', 'urdu', 'gujarati',
    'dust', 'gobelins', 'mym', 'cgbros',
  ];
  const noiseRe = new RegExp(`(\\s*[|\\-–—]+\\s*.*(${NOISE.join('|')}).*)$`, 'i');
  t = t.replace(noiseRe, '');
  t = t.replace(/\s*\(\d{4}\)\s*/g, ' ').trim();
  t = t.replace(/\s*\((4k|hd|full|official|award.winning|online premiere)\)\s*/gi, ' ').trim();
  t = t.replace(/^#\S+\s*/g, '').replace(/\s*#\S+$/g, '').trim();
  t = t.replace(/^"+|"+$/g, '').trim();
  return t || raw.trim();
}

const { data: films, error } = await supabase.from('films').select('id, title');
if (error) { console.error('❌', error.message); process.exit(1); }

console.log(`📽️  ${films.length} films à traiter\n`);

let updated = 0, skipped = 0;

for (const film of films) {
  const cleaned = cleanTitle(film.title);
  if (cleaned === film.title) { skipped++; continue; }

  console.log(`✏️  "${film.title}"\n   → "${cleaned}"`);
  const { error: err } = await supabase.from('films').update({ title: cleaned }).eq('id', film.id);
  if (err) console.error(`   ❌ ${err.message}`);
  else updated++;
}

console.log(`\n✅ ${updated} titres mis à jour, ${skipped} inchangés.`);
