/**
 * Vérifie et corrige les thumbnails manquantes dans la table films.
 * Essaie hqdefault → mqdefault → sddefault en fallback.
 * Usage: node scripts/fix-thumbnails.mjs
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

function getYtId(url) {
  if (!url) return null;
  const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
  return match ? match[1] : null;
}

async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok && res.headers.get('content-type')?.startsWith('image');
  } catch { return false; }
}

const { data: films, error } = await supabase.from('films').select('id, video_url, thumbnail_url');
if (error) { console.error('❌', error.message); process.exit(1); }

console.log(`📽️  ${films.length} films à vérifier\n`);

let fixed = 0, skipped = 0;

for (const film of films) {
  const ytId = getYtId(film.video_url);
  if (!ytId) { skipped++; continue; }

  // Vérifie si la thumbnail actuelle est valide
  if (film.thumbnail_url) {
    const ok = await checkUrl(film.thumbnail_url);
    if (ok) { skipped++; continue; }
  }

  // Essaie les qualités dans l'ordre
  const candidates = [
    `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
    `https://img.youtube.com/vi/${ytId}/sddefault.jpg`,
    `https://img.youtube.com/vi/${ytId}/default.jpg`,
  ];

  let newUrl = null;
  for (const url of candidates) {
    if (await checkUrl(url)) { newUrl = url; break; }
  }

  if (newUrl && newUrl !== film.thumbnail_url) {
    const { error: err } = await supabase.from('films').update({ thumbnail_url: newUrl }).eq('id', film.id);
    if (!err) { console.log(`✅ ${ytId} → ${newUrl.split('/').pop()}`); fixed++; }
    else console.error(`❌ ${ytId}: ${err.message}`);
  } else {
    skipped++;
  }
}

console.log(`\n🎬 ${fixed} thumbnails corrigées, ${skipped} inchangées.`);
