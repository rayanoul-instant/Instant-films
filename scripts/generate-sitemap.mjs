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

const SITE_URL = 'https://instant-films.com';
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const STATIC_PAGES = [
  { url: '/',        priority: '1.0', changefreq: 'daily' },
  { url: '/search',  priority: '0.8', changefreq: 'weekly' },
  { url: '/legal',   priority: '0.3', changefreq: 'yearly' },
  { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { url: '/terms',   priority: '0.3', changefreq: 'yearly' },
];

function urlEntry(loc, lastmod, changefreq, priority) {
  const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${lastmodLine}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function generate() {
  const [{ data: films, error: e1 }, { data: courts, error: e2 }] = await Promise.all([
    supabase.from('films').select('id, updated_at'),
    supabase.from('courts_metrages').select('id, created_at'),
  ]);

  if (e1) console.warn('films fetch error:', e1.message);
  if (e2) console.warn('courts_metrages fetch error:', e2.message);

  const entries = [
    ...STATIC_PAGES.map(p => urlEntry(`${SITE_URL}${p.url}`, null, p.changefreq, p.priority)),
    ...(films || []).map(f =>
      urlEntry(`${SITE_URL}/films/${f.id}`, f.updated_at?.split('T')[0], 'weekly', '0.7')
    ),
    ...(courts || []).map(c =>
      urlEntry(`${SITE_URL}/courts-metrages/${c.id}`, c.created_at?.split('T')[0], 'monthly', '0.6')
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

  writeFileSync(resolve(__dirname, '../public/sitemap.xml'), xml, 'utf8');
  console.log(`✓ sitemap.xml — ${STATIC_PAGES.length} static, ${(films || []).length} films, ${(courts || []).length} courts métrages`);
}

generate().catch(err => { console.error(err); process.exit(1); });
