/**
 * Script d'import des courts métrages depuis courts_metrages.csv vers Supabase
 *
 * Usage:
 *   node scripts/import-films.mjs [chemin/vers/courts_metrages.csv]
 *
 * Si pas d'argument, cherche courts_metrages.csv à la racine du projet.
 *
 * Nécessite SUPABASE_SERVICE_ROLE_KEY dans .env pour bypasser le RLS.
 * Tu peux la trouver dans : Supabase Dashboard > Project Settings > API > service_role key
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Lecture du .env ---
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const idx = line.indexOf('=');
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      return [key, val];
    })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
// Préfère la service_role key pour bypasser le RLS, sinon utilise l'anon key
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL ou clé Supabase manquante dans .env');
  process.exit(1);
}

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY non trouvée dans .env — utilisation de la clé anon.');
  console.warn('   Si les inserts échouent (RLS), ajoute SUPABASE_SERVICE_ROLE_KEY dans .env.');
  console.warn('   Trouve-la dans : Supabase Dashboard > Project Settings > API > service_role key\n');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// --- Parser CSV minimal (gère les guillemets doubles) ---
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const fields = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = fields[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

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

// Convertit "MM:SS" ou "H:MM:SS" en minutes entières
function parseDuration(dur) {
  if (!dur) return 0;
  const parts = dur.split(':').map(Number);
  if (parts.length === 2) return Math.round(parts[0] + parts[1] / 60);
  if (parts.length === 3) return Math.round(parts[0] * 60 + parts[1] + parts[2] / 60);
  return parseInt(dur) || 0;
}

// Extrait thumbnail YouTube
function youtubeThumbnail(url) {
  const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function cleanText(val) {
  if (!val || val.trim() === '' || val.trim() === "(Erreur d'analyse)") return null;
  return val.trim();
}

// Nettoie le titre : garde uniquement le vrai nom du court métrage
function cleanTitle(raw) {
  let t = raw.trim();

  // Supprime les séparateurs " | " et " - " suivis de descripteurs parasites
  const NOISE = [
    'short film', 'short movie', 'short horror', 'short comedy', 'short drama',
    'short thriller', 'short sci-fi', 'short romance', 'short animation',
    'official short', 'animated short', 'award.winning', 'award winning',
    'iphone', 'shot on iphone', '4k', 'hd', 'full', 'online premiere',
    'now streaming', 'official', 'english', 'hindi', 'tamil', 'malayalam',
    'kannada', 'telugu', 'assamese', 'nepali', 'urdu', 'gujarati',
    'dust', 'gobelins', 'mym', 'cgbros',
  ];
  const noiseRe = new RegExp(
    `(\\s*[|\\-–—]+\\s*.*(${NOISE.join('|')}).*)$`,
    'i'
  );
  t = t.replace(noiseRe, '');

  // Supprime l'année entre parenthèses : "(2021)", "(2025)"
  t = t.replace(/\s*\(\d{4}\)\s*/g, ' ').trim();

  // Supprime les qualificatifs entre parenthèses parasites : "(4K)", "(HD)", "(Full)"
  t = t.replace(/\s*\((4k|hd|full|official|award.winning|online premiere)\)\s*/gi, ' ').trim();

  // Supprime les hashtags en début ou fin
  t = t.replace(/^#\S+\s*/g, '').replace(/\s*#\S+$/g, '').trim();

  // Supprime les guillemets doubles autour du titre s'il y en a
  t = t.replace(/^"+|"+$/g, '').trim();

  return t || raw.trim();
}

// --- Chemin du CSV ---
const csvPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(__dirname, '../courts_metrages.csv');

console.log(`📂 Lecture du CSV : ${csvPath}`);

if (!existsSync(csvPath)) {
  console.error(`❌ Fichier introuvable : ${csvPath}`);
  console.error('   Usage : node scripts/import-films.mjs [chemin/vers/le/fichier.csv]');
  process.exit(1);
}

let csvText = readFileSync(csvPath, 'utf-8');
if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1); // Supprime BOM UTF-8

const rows = parseCSV(csvText);
console.log(`📄 ${rows.length} lignes trouvées\n`);

// Debug : affiche les headers détectés
const firstRow = rows[0];
console.log('🔍 Headers détectés :', Object.keys(firstRow).join(' | '));
console.log('🔍 Première ligne :', JSON.stringify(firstRow, null, 2), '\n');

// Trouve les colonnes (insensible à l'encodage)
function findKey(obj, candidates) {
  const keys = Object.keys(obj);
  for (const c of candidates) {
    const found = keys.find(k => k.toLowerCase().includes(c.toLowerCase()) || k === c);
    if (found) return found;
  }
  return null;
}

const sample = rows[0];
const kTitre    = findKey(sample, ['Titre', 'titre', 'title']);
const kAuteur   = findKey(sample, ['Auteur', 'auteur', 'author', 'director']);
const kAnnee    = findKey(sample, ['Ann', 'année', 'annee', 'year']);
const kDuree    = findKey(sample, ['Dur', 'durée', 'duree', 'duration']);
const kThemes   = findKey(sample, ['Th', 'thèmes', 'themes']);
const kSynopsis = findKey(sample, ['Synopsis', 'synopsis']);
const kLien     = findKey(sample, ['Lien', 'lien', 'url', 'link']);

console.log('🗂️  Colonnes mappées :');
console.log(`   Titre    → "${kTitre}"`);
console.log(`   Auteur   → "${kAuteur}"`);
console.log(`   Année    → "${kAnnee}"`);
console.log(`   Durée    → "${kDuree}"`);
console.log(`   Thèmes   → "${kThemes}"`);
console.log(`   Synopsis → "${kSynopsis}"`);
console.log(`   Lien     → "${kLien}"\n`);

const films = rows.map(row => ({
  title:            cleanTitle(row[kTitre] || ''),
  director:         cleanText(row[kAuteur]),
  release_year:     parseInt(row[kAnnee]) || null,
  duration_minutes: parseDuration(row[kDuree]),
  themes:           row[kThemes]?.trim() ? row[kThemes].split(',').map(t => t.trim()).filter(Boolean) : null,
  synopsis:         cleanText(row[kSynopsis]),
  video_url:        (row[kLien] || '').trim(),
  thumbnail_url:    youtubeThumbnail((row[kLien] || '').trim()),
  is_featured:      false,
})).filter(f => f.title && f.video_url);

console.log(`✅ ${films.length} films valides à importer\n`);

// Test de connexion Supabase
const { error: testError } = await supabase.from('films').select('id').limit(1);
if (testError) {
  console.error('❌ Impossible de se connecter à Supabase :', testError.message);
  process.exit(1);
}
console.log('🔗 Connexion Supabase OK\n');

// Insertion par batch de 10
const BATCH_SIZE = 10;
let inserted = 0;
let errors = 0;
let firstError = null;

for (let i = 0; i < films.length; i += BATCH_SIZE) {
  const batch = films.slice(i, i + BATCH_SIZE);
  const { data, error } = await supabase.from('films').insert(batch).select('id');
  if (error) {
    if (!firstError) firstError = error;
    console.error(`❌ Batch ${i + 1}-${i + batch.length} : ${error.message}`);
    errors += batch.length;
  } else {
    inserted += data.length;
    process.stdout.write(`\r➕ ${inserted}/${films.length} insérés...`);
  }
}

console.log(`\n\n🎬 Import terminé : ${inserted} insérés, ${errors} erreurs.`);

if (firstError) {
  console.log('\n💡 Détail de la première erreur :');
  console.log(JSON.stringify(firstError, null, 2));

  if (firstError.code === '42501' || firstError.message?.includes('RLS') || firstError.message?.includes('policy')) {
    console.log('\n🔒 Erreur RLS détectée. Solution :');
    console.log('   1. Va sur https://supabase.com/dashboard/project/tujphxmkpcttuxyejdck/settings/api');
    console.log('   2. Copie la "service_role" key (secret)');
    console.log('   3. Ajoute dans .env : SUPABASE_SERVICE_ROLE_KEY="ta-clé-ici"');
    console.log('   4. Relance le script');
  }
}
