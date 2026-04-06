/**
 * Détecte les genres à partir des titres des films et les met à jour dans Supabase.
 * Usage: node scripts/assign-genres.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
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

// Règles de détection de genre (ordre = priorité)
const GENRE_RULES = [
  {
    genre: 'animation',
    keywords: ['animated', 'animation', 'cgi', '3d short', 'anime', 'gobelins', 'cgbros', 'gulu animation'],
  },
  {
    genre: 'scifi',
    keywords: ['sci-fi', 'scifi', 'science fiction', 'dystopian', 'escaping earth', 'harvester', 'the machine', 'woodnuts', 'wanted', 'crash site', 'ai (2026)', "that's ai", 'last passenger'],
  },
  {
    genre: 'horror',
    keywords: ['horror', 'scary', 'ghost', 'pidlegaon', 'hide & seek', '6-7 |', 'pinga ka parlour', 'blueberry inn'],
  },
  {
    genre: 'thriller',
    keywords: ['thriller', 'psychological', 'mystery', 'suspense', 'click |', 'intruder', 'simple robbery', 'toxic |', 'toxic monk'],
  },
  {
    genre: 'comedy',
    keywords: ['comedy', 'comic', 'meatball', 'two minutes', 'british comedy', 'thirichadi', 'kitty party', 'giraffe maava', 'quack'],
  },
  {
    genre: 'romance',
    keywords: ['romantic', 'romance', 'love story', 'love short film', 'twin flames', 'situationship', 'valentine', 'collab love', '364 days of love', 'until next time', 'lift story', 'eppadi vandhaayo', 'naam pizhai', 'pagal premi', 'ai valentine', 'with you |', 'main aur tum', 'boyfriend'],
  },
  {
    genre: 'drama',
    keywords: ['drama', 'emotional', 'heart touching', 'heart breaking', 'touching', 'sad', 'cleaner', 'salary', 'ptm |', 'sorry |', 'divorce', 'chori', 'half cake', 'english teacher', 'your reality', 'gaslighting', 'ladies item', 'dulhan', 'shehzadi', 'the orphan', 'bodycount', 'kanjak', 'silent fear', 'ratna pathak', 'step mother', 'family express', 'happy wedding', 'bhama'],
  },
  {
    genre: 'documentary',
    keywords: ['documentary', 'real story', 'true story'],
  },
  {
    genre: 'fantasy',
    keywords: ['fantasy', 'magic', 'supernatural', 'spider-within', 'spider-verse', 'forevergreen', 'fox and the bird', 'gruff', 'burrow'],
  },
  {
    genre: 'experimental',
    keywords: ['experimental', 'abstract', 'avant-garde'],
  },
];

function detectGenres(title) {
  const lower = title.toLowerCase();
  const genres = [];
  for (const rule of GENRE_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      genres.push(rule.genre);
    }
  }
  // Fallback : si rien détecté, drama par défaut
  return genres.length > 0 ? genres : ['drama'];
}

// Récupère tous les films
const { data: films, error } = await supabase.from('films').select('id, title, genres');
if (error) { console.error('❌ Erreur Supabase :', error.message); process.exit(1); }

console.log(`📽️  ${films.length} films à traiter\n`);

let updated = 0;
let errors = 0;

for (const film of films) {
  const genres = detectGenres(film.title);
  const { error: updateError } = await supabase
    .from('films')
    .update({ genres })
    .eq('id', film.id);

  if (updateError) {
    console.error(`❌ ${film.title} : ${updateError.message}`);
    errors++;
  } else {
    console.log(`✅ [${genres.join(', ')}] ${film.title}`);
    updated++;
  }
}

console.log(`\n🎬 Terminé : ${updated} mis à jour, ${errors} erreurs.`);
