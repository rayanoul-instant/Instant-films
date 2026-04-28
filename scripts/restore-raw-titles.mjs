/**
 * Restaure les titres YouTube bruts dans la colonne `title` de la table `films`.
 * La colonne `display_title` (titres nettoyés) est laissée intacte.
 *
 * Usage: node scripts/restore-raw-titles.mjs [chemin/vers/fichier.csv ...]
 * Si pas d'argument, cherche tous les *.csv à la racine du projet.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// --- Lecture du .env ---
const envContent = readFileSync(resolve(projectRoot, '.env'), 'utf-8');
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

// --- Parser CSV minimal (gère les guillemets doubles "") ---
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
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const fields = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h.trim()] = (fields[idx] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}

// Extrait l'ID vidéo YouTube depuis une URL
function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
  return m ? m[1] : null;
}

// --- Trouver les CSV à traiter ---
let csvPaths = process.argv.slice(2);
if (csvPaths.length === 0) {
  // Cherche tous les .csv à la racine du projet
  csvPaths = readdirSync(projectRoot)
    .filter(f => extname(f).toLowerCase() === '.csv')
    .map(f => resolve(projectRoot, f));
}

if (csvPaths.length === 0) {
  console.error('❌ Aucun fichier CSV trouvé. Passe les chemins en argument.');
  process.exit(1);
}

console.log(`📂 Fichiers CSV à traiter : ${csvPaths.length}`);
csvPaths.forEach(p => console.log(`   • ${p}`));
console.log('');

// --- Charger tous les films depuis Supabase ---
const { data: films, error: fetchErr } = await supabase
  .from('films')
  .select('id, title, display_title, video_url');

if (fetchErr) { console.error('❌ Erreur chargement films:', fetchErr.message); process.exit(1); }

// Indexer par YouTube video ID
const filmsByVideoId = new Map();
for (const film of films) {
  const vid = extractYouTubeId(film.video_url);
  if (vid) filmsByVideoId.set(vid, film);
}

console.log(`🎬 ${films.length} films en base (${filmsByVideoId.size} avec URL YouTube)\n`);

// --- Traiter chaque CSV ---
let updated = 0, notFound = 0, skipped = 0;

for (const csvPath of csvPaths) {
  let content;
  try {
    content = readFileSync(csvPath, 'utf-8');
  } catch (e) {
    console.warn(`⚠️  Impossible de lire ${csvPath}: ${e.message}`);
    continue;
  }

  const rows = parseCSV(content);
  console.log(`📄 ${csvPath.split(/[/\\]/).pop()} — ${rows.length} lignes`);

  for (const row of rows) {
    const rawTitle = row['Titre'];
    const url = row['Lien'] || row['URL'] || row['url'] || row['lien'];
    if (!rawTitle || !url) continue;

    const vid = extractYouTubeId(url);
    if (!vid) continue;

    const film = filmsByVideoId.get(vid);
    if (!film) { notFound++; continue; }

    // Ne pas écraser si le titre est déjà le bon titre brut
    if (film.title === rawTitle) { skipped++; continue; }

    console.log(`✏️  "${film.title}"\n   → "${rawTitle}"`);

    const { error: updateErr } = await supabase
      .from('films')
      .update({ title: rawTitle })
      .eq('id', film.id);

    if (updateErr) {
      console.error(`   ❌ ${updateErr.message}`);
    } else {
      film.title = rawTitle; // mise à jour locale pour éviter les doublons inter-CSV
      updated++;
    }
  }
  console.log('');
}

console.log(`✅ ${updated} titres restaurés`);
if (skipped > 0) console.log(`⏭️  ${skipped} déjà corrects (inchangés)`);
if (notFound > 0) console.log(`❓ ${notFound} lignes CSV sans correspondance en base`);
