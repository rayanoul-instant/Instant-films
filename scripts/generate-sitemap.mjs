import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const content = readFileSync(resolve(__dirname, '../.env'), 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#=\s]+)\s*=\s*["']?([^"'\n]*)["']?/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
  } catch {}
}

loadEnv();

const SITE_URL = 'https://www.instant-films.com';
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const GENRES = ['drama', 'comedy', 'animation', 'horror', 'romance', 'scifi', 'experimental', 'kid', 'mainstream'];

const STATIC_PAGES = [
  { url: '/',        priority: '1.0', changefreq: 'daily' },
  { url: '/search',  priority: '0.8', changefreq: 'weekly' },
  { url: '/legal',   priority: '0.3', changefreq: 'yearly' },
  { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { url: '/terms',   priority: '0.3', changefreq: 'yearly' },
  ...GENRES.map(g => ({ url: `/genre/${g}`, priority: '0.7', changefreq: 'weekly' })),
];

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function urlEntry(loc, lastmod, changefreq, priority) {
  const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${lastmodLine}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function fetchAll(table, columns) {
  const PAGE = 1000;
  let rows = [], from = 0, done = false;
  while (!done) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) return { data: rows, error };
    rows = rows.concat(data || []);
    done = !data || data.length < PAGE;
    from += PAGE;
  }
  return { data: rows, error: null };
}

async function generate() {
  const [{ data: films, error: e1 }, { data: courts, error: e2 }, { data: dirRows, error: e3 }] = await Promise.all([
    fetchAll('films', 'slug, updated_at'),
    fetchAll('courts_metrages', 'id, created_at'),
    fetchAll('films', 'director'),
  ]);
  const directors = (dirRows || []).filter(d => d.director);

  if (e1) console.warn('films fetch error:', e1.message);
  if (e2) console.warn('courts_metrages fetch error:', e2.message);
  if (e3) console.warn('directors fetch error:', e3.message);

  const uniqueDirectors = [...new Set(directors.map(d => d.director))];

  const entries = [
    ...STATIC_PAGES.map(p => urlEntry(`${SITE_URL}${p.url}`, null, p.changefreq, p.priority)),
    ...(films || []).map(f =>
      urlEntry(`${SITE_URL}/films/${f.slug}`, f.updated_at?.split('T')[0], 'weekly', '0.7')
    ),
    ...(courts || []).map(c =>
      urlEntry(`${SITE_URL}/courts-metrages/${c.id}`, c.created_at?.split('T')[0], 'monthly', '0.6')
    ),
    ...uniqueDirectors.map(d =>
      urlEntry(`${SITE_URL}/realisateur/${slugify(d)}`, null, 'monthly', '0.6')
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

  writeFileSync(resolve(__dirname, '../public/sitemap.xml'), xml, 'utf8');
  console.log(`✓ sitemap.xml — ${STATIC_PAGES.length} static + genre, ${(films || []).length} films, ${(courts || []).length} courts métrages, ${uniqueDirectors.length} réalisateurs`);
}

generate().catch(err => { console.error(err); process.exit(1); });
