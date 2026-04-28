/**
 * Compare les URLs des CSV d'origine avec celles en base Supabase.
 * Les URLs présentes dans les CSV mais absentes en base = films supprimés.
 * Les ajoute automatiquement dans deleted_films.
 *
 * Usage: node scripts/find-deleted-films.mjs [fichier1.csv fichier2.csv ...]
 * Sans argument : cherche tous les *.csv à la racine du projet.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

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

function findKey(obj, candidates) {
  const keys = Object.keys(obj);
  for (const c of candidates) {
    const found = keys.find(k => k.toLowerCase().includes(c.toLowerCase()));
    if (found) return found;
  }
  return null;
}

// Trouver les CSV
let csvPaths = process.argv.slice(2);
if (csvPaths.length === 0) {
  csvPaths = readdirSync(projectRoot)
    .filter(f => extname(f).toLowerCase() === '.csv')
    .map(f => resolve(projectRoot, f));
}

console.log(`📂 ${csvPaths.length} fichier(s) CSV à analyser\n`);

// Collecter toutes les URLs + titres des CSV
const csvEntries = new Map(); // video_url -> title
for (const csvPath of csvPaths) {
  let content;
  try { content = readFileSync(csvPath, 'utf-8'); } catch { continue; }
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  const rows = parseCSV(content);
  if (rows.length === 0) continue;
  const kLien = findKey(rows[0], ['Lien', 'lien', 'url', 'link']);
  const kTitre = findKey(rows[0], ['Titre', 'titre', 'title']);
  if (!kLien) continue;
  for (const row of rows) {
    const url = row[kLien]?.trim();
    if (url) csvEntries.set(url, row[kTitre]?.trim() || '');
  }
}

console.log(`📋 ${csvEntries.size} URLs uniques dans les CSV\n`);

// Charger toutes les URLs en base
const { data: films } = await supabase.from('films').select('video_url, title');
const inBase = new Set((films || []).map(f => f.video_url));
console.log(`🎬 ${inBase.size} films actuellement en base\n`);

// Charger la blacklist existante
const { data: existing } = await supabase.from('deleted_films').select('video_url');
const alreadyBlacklisted = new Set((existing || []).map(r => r.video_url));

// Films dans CSV mais pas en base = supprimés
const deleted = [];
for (const [url, title] of csvEntries) {
  if (!inBase.has(url) && !alreadyBlacklisted.has(url)) {
    deleted.push({ video_url: url, title });
  }
}

console.log(`🗑  ${deleted.length} films supprimés détectés (absents de la base, pas encore en blacklist)\n`);

if (deleted.length === 0) {
  console.log('✅ Rien à ajouter à la blacklist.');
  process.exit(0);
}

deleted.forEach(f => console.log(`   • ${f.title || '(sans titre)'} — ${f.video_url}`));

// Ajouter à deleted_films
const { error } = await supabase.from('deleted_films').insert(deleted);
if (error) {
  console.error(`\n❌ Erreur lors de l'insertion : ${error.message}`);
} else {
  console.log(`\n✅ ${deleted.length} films ajoutés à la blacklist.`);
}
