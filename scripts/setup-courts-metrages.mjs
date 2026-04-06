/**
 * Crée la table courts_metrages dans Supabase et importe le CSV.
 * Usage: node scripts/setup-courts-metrages.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
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

// --- CSV parser ---
function parseLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current); current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const headers = parseLine(lines[0]).map(h => h.trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const fields = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, fields[i] ?? '']));
  });
}

function youtubeThumbnail(url) {
  const match = url?.match(/[?&]v=([^&]+)/) || url?.match(/youtu\.be\/([^?]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function detectGenres(title) {
  const t = title.toLowerCase();
  const map = [
    ['animation', ['animated', 'animation', 'cgi', 'anime', 'gobelins']],
    ['scifi',     ['sci-fi', 'scifi', 'science fiction', 'dystopian', 'escaping earth', "that's ai", 'crash site', 'the machine', 'woodnuts', 'wanted', 'last passenger', 'harvester', 'scp']],
    ['horror',    ['horror', 'ghost', 'pidlegaon', 'hide & seek', 'don\'t look in the mirror', '6-7 |']],
    ['thriller',  ['thriller', 'psychological', 'mystery', 'suspense', 'simple robbery', 'toxic |', 'intruder', 'click |', 'stranger\'s pawn']],
    ['comedy',    ['comedy', 'comic', 'meatball', 'two minutes', 'british comedy', 'thirachadi', 'giraffe maava', 'quack', 'o.c.d.']],
    ['romance',   ['romantic', 'romance', 'love story', 'love short film', 'twin flames', 'situationship', 'valentine', 'collab love', '364 days', 'ai valentine', 'with you |', 'boyfriend', 'lift story', 'naam pizhai', 'pagal premi']],
    ['drama',     ['drama', 'emotional', 'heart touching', 'heart breaking', 'cleaner', 'salary', 'ptm |', 'sorry |', 'divorce', 'chori', 'half cake', 'english teacher', 'gaslighting', 'ladies item', 'dulhan', 'shehzadi', 'orphan', 'bodycount', 'kanjak', 'silent fear', 'step mother', 'family express', 'happy wedding', 'cope -', 'gasolina', '7 phere']],
    ['fantasy',   ['fantasy', 'spider-verse', 'forevergreen', 'fox and the bird', 'gruff', 'burrow', 'sugar mom']],
  ];
  const genres = map.filter(([, kws]) => kws.some(kw => t.includes(kw))).map(([g]) => g);
  return genres.length > 0 ? genres : ['drama'];
}

// --- Trouver le CSV ---
const csvPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(__dirname, '../courts_metrages (1).csv');

if (!existsSync(csvPath)) {
  // fallback sans espace
  const alt = resolve(__dirname, '../courts_metrages.csv');
  if (!existsSync(alt)) {
    console.error('❌ CSV introuvable. Passe le chemin en argument : node scripts/setup-courts-metrages.mjs "chemin/vers/fichier.csv"');
    process.exit(1);
  }
}

console.log(`📂 Lecture : ${csvPath}\n`);
let csv = readFileSync(csvPath, 'utf-8');
if (csv.charCodeAt(0) === 0xFEFF) csv = csv.slice(1);

const rows = parseCSV(csv);
console.log(`📄 ${rows.length} lignes lues`);
console.log('🔍 Headers :', Object.keys(rows[0]).join(' | '), '\n');

// --- Vérifier connexion ---
const { error: connErr } = await supabase.from('films').select('id').limit(1);
if (connErr) { console.error('❌ Connexion Supabase :', connErr.message); process.exit(1); }
console.log('🔗 Connexion Supabase OK\n');

// --- Vider la table si elle existe déjà ---
const { error: delErr } = await supabase.from('courts_metrages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
if (!delErr) console.log('🗑️  Table courts_metrages vidée\n');

// --- Préparer les données ---
const kTitre    = Object.keys(rows[0]).find(k => k.toLowerCase().includes('titre') || k.toLowerCase().includes('title')) || 'Titre';
const kAuteur   = Object.keys(rows[0]).find(k => k.toLowerCase().includes('auteur') || k.toLowerCase().includes('author')) || 'Auteur';
const kAnnee    = Object.keys(rows[0]).find(k => k.toLowerCase().startsWith('ann') || k.toLowerCase() === 'annee') || 'Annee';
const kDuree    = Object.keys(rows[0]).find(k => k.toLowerCase().startsWith('dur')) || 'Duree';
const kThemes   = Object.keys(rows[0]).find(k => k.toLowerCase().startsWith('th')) || 'Themes';
const kSynopsis = Object.keys(rows[0]).find(k => k.toLowerCase().includes('synopsis')) || 'Synopsis';
const kLien     = Object.keys(rows[0]).find(k => k.toLowerCase().includes('lien') || k.toLowerCase().includes('url') || k.toLowerCase().includes('link')) || 'Lien';

const data = rows.map(row => {
  const titre   = (row[kTitre] || '').trim();
  const auteur  = (row[kAuteur] || '').trim() || null;
  const annee   = parseInt(row[kAnnee]) || null;
  const duree   = (row[kDuree] || '').trim() || null;
  const themes  = (row[kThemes] || '').trim() || null;
  const synopsis = (() => {
    const s = (row[kSynopsis] || '').trim();
    return (!s || s === "(Erreur d'analyse)") ? null : s;
  })();
  const lien    = (row[kLien] || '').trim() || null;

  return { titre, auteur, annee, duree, themes, synopsis, lien, thumbnail_url: youtubeThumbnail(lien), genres: detectGenres(titre) };
}).filter(r => r.titre && r.lien);

console.log(`✅ ${data.length} films valides\n`);

// --- Insérer par batch ---
const BATCH = 20;
let inserted = 0, errors = 0, firstErr = null;

for (let i = 0; i < data.length; i += BATCH) {
  const batch = data.slice(i, i + BATCH);
  const { data: res, error } = await supabase.from('courts_metrages').insert(batch).select('id');
  if (error) {
    if (!firstErr) firstErr = error;
    errors += batch.length;
    console.error(`❌ Batch ${i}-${i + batch.length} : ${error.message}`);
  } else {
    inserted += res.length;
    process.stdout.write(`\r➕ ${inserted}/${data.length} insérés...`);
  }
}

console.log(`\n\n🎬 Import terminé : ${inserted} insérés, ${errors} erreurs.`);

if (firstErr) {
  console.log('\n💡 Erreur détaillée :', JSON.stringify(firstErr, null, 2));
  if (firstErr.message?.includes('does not exist') || firstErr.code === '42P01') {
    console.log('\n🔧 La table n\'existe pas encore. Crée-la dans Supabase avec ce SQL :');
    console.log(`
-- Colle ce SQL dans Supabase Dashboard > SQL Editor
create table public.courts_metrages (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  auteur text,
  annee integer,
  duree text,
  themes text,
  synopsis text,
  lien text,
  thumbnail_url text,
  genres text[] default '{}',
  created_at timestamptz default now()
);
alter table public.courts_metrages enable row level security;
create policy "Anyone can read courts_metrages" on public.courts_metrages for select using (true);
create policy "Service role can insert" on public.courts_metrages for insert with check (true);
create policy "Service role can update" on public.courts_metrages for update using (true);
create policy "Service role can delete" on public.courts_metrages for delete using (true);
    `);
  }
}
