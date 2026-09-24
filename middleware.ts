import { next } from '@vercel/edge';

export const config = {
  matcher: '/films/:slug',
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SYNOPSIS_NOISE = [
  /submit your (short )?film/i,
  /https?:\/\/\S+/,
  /subscribe/i,
  /abonnez-vous/i,
  /shortverse\.com/i,
  /shortoftheweek\.com/i,
  /watch more/i,
  /follow us/i,
];

function isSynopsisClean(synopsis: string | null | undefined): boolean {
  if (!synopsis || synopsis.length < 20) return false;
  return !SYNOPSIS_NOISE.some((p) => p.test(synopsis));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface FilmRow {
  slug: string;
  title: string;
  display_title: string | null;
  synopsis: string | null;
  director: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  release_year: number | null;
}

export default async function middleware(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return next();

  const url = new URL(request.url);
  const slug = url.pathname.replace(/^\/films\//, '');
  if (!slug) return next();

  const filterField = UUID_REGEX.test(slug) ? 'id' : 'slug';

  let film: FilmRow | undefined;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/films?${filterField}=eq.${encodeURIComponent(slug)}` +
        `&select=slug,title,display_title,synopsis,director,thumbnail_url,duration_minutes,release_year&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return next();
    const rows: FilmRow[] = await res.json();
    film = rows[0];
  } catch {
    return next();
  }

  if (!film) return next();

  const htmlRes = await fetch(new URL('/index.html', url));
  if (!htmlRes.ok) return next();
  let html = await htmlRes.text();

  const title = `${film.display_title || film.title} - Instant Films`;
  const description = isSynopsisClean(film.synopsis)
    ? film.synopsis!
    : 'Watch this short film on Instant Films.';
  const canonical = `${url.origin}/films/${film.slug}`;
  const image = film.thumbnail_url || `${url.origin}/logo-instant.png`;

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);

  html = html
    .replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`)
    .replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${safeDescription}" />`)
    .replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${safeTitle}" />`)
    .replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${safeDescription}" />`)
    .replace(/<meta property="og:image" content=".*?"\s*\/?>/, `<meta property="og:image" content="${safeImage}" />`)
    .replace(/<meta property="og:type" content=".*?"\s*\/?>/, `<meta property="og:type" content="video.other" />`)
    .replace(/<meta name="twitter:image" content=".*?"\s*\/?>/, `<meta name="twitter:image" content="${safeImage}" />`);

  const extraHead = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:title" content="${safeTitle}" />`,
    `<meta name="twitter:description" content="${safeDescription}" />`,
  ].join('\n    ');
  html = html.replace('</head>', `    ${extraHead}\n  </head>`);

  const noscriptFallback = `<noscript>
      <h1>${escapeHtml(film.display_title || film.title)}</h1>
      ${film.director ? `<p>Réalisé par ${escapeHtml(film.director)}</p>` : ''}
      <p>${safeDescription}</p>
      ${film.release_year ? `<p>${film.release_year}</p>` : ''}
      ${film.duration_minutes ? `<p>${film.duration_minutes} min</p>` : ''}
    </noscript>`;
  html = html.replace('<div id="root">', `<div id="root">${noscriptFallback}`);

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
