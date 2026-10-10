import { next } from '@vercel/edge';

export const config = {
  matcher: ['/films/:slug', '/genre/:genre', '/realisateur/:slug', '/search'],
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SITE_NAME = 'Instant Films';

// En dessous de ce seuil, on laisse la page se rendre normalement côté client
// (pas de SSR, pas d'indexation encouragée pour un contenu trop pauvre).
const MIN_FILMS_FOR_SEO = 4;

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

// Copie de src/types/database.ts — le middleware tourne dans un bundle Edge
// séparé, on duplique cette fonction pure plutôt que de risquer un import
// cross-bundle fragile.
function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Genres narratifs réels uniquement — mainstream/kid sont des tags admin
// masqués de la navigation normale (useFilms.tsx), jamais exposés en SSR/SEO.
const GENRE_LABELS: Record<string, string> = {
  drama: 'Drama',
  comedy: 'Comedy',
  animation: 'Animation',
  horror: 'Horror',
  romance: 'Romance',
  scifi: 'Sci-Fi',
  experimental: 'Experimental',
};

const GENRE_DESCRIPTIONS: Record<string, string> = {
  drama: 'Intense and moving human stories told in short form.',
  comedy: 'Laughs and lightness — the best comedies in just a few minutes.',
  animation: 'Unique and creative visual worlds, from hand-drawn to 3D.',
  horror: 'Chills and suspense guaranteed — horror distilled into short films.',
  romance: 'Touching love stories told in just a few minutes.',
  scifi: 'Alternative futures and imaginary worlds — science fiction in short form.',
  experimental: 'Visual art and avant-garde cinema — films that push the boundaries.',
};

// ---------------------------------------------------------------------------
// Helpers partagés
// ---------------------------------------------------------------------------

async function fetchIndexHtml(url: URL): Promise<string | null> {
  const res = await fetch(new URL('/index.html', url));
  if (!res.ok) return null;
  return res.text();
}

interface HeadTagsOptions {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  ogType?: string;
  robots?: string;
}

function injectHeadTags(html: string, opts: HeadTagsOptions): string {
  const safeTitle = escapeHtml(opts.title);
  const safeDescription = escapeHtml(opts.description);
  const safeImage = opts.image ? escapeHtml(opts.image) : null;

  html = html
    .replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`)
    .replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${safeDescription}" />`)
    .replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${safeTitle}" />`)
    .replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${safeDescription}" />`);

  if (safeImage) {
    html = html
      .replace(/<meta property="og:image" content=".*?"\s*\/?>/, `<meta property="og:image" content="${safeImage}" />`)
      .replace(/<meta name="twitter:image" content=".*?"\s*\/?>/, `<meta name="twitter:image" content="${safeImage}" />`);
  }
  if (opts.ogType) {
    html = html.replace(/<meta property="og:type" content=".*?"\s*\/?>/, `<meta property="og:type" content="${opts.ogType}" />`);
  }

  const extraHead = [
    `<link rel="canonical" href="${opts.canonical}" />`,
    `<meta property="og:url" content="${opts.canonical}" />`,
    `<meta name="twitter:title" content="${safeTitle}" />`,
    `<meta name="twitter:description" content="${safeDescription}" />`,
    opts.robots ? `<meta name="robots" content="${opts.robots}" />` : '',
  ].filter(Boolean).join('\n    ');

  return html.replace('</head>', `    ${extraHead}\n  </head>`);
}

function injectJsonLd(html: string, data: Record<string, unknown>): string {
  const script = `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  return html.replace('</head>', `    ${script}\n  </head>`);
}

function injectNoscript(html: string, innerHtml: string): string {
  return html.replace('<div id="root">', `<div id="root"><noscript>${innerHtml}</noscript>`);
}

function breadcrumbs(origin: string, items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// PostgREST attend un littéral tableau Postgres ("{valeur}") dans les filtres
// cs/not.cs — les accolades littérales dans une URL ne sont pas valides (RFC 3986)
// et provoquent un 400 silencieux si elles ne sont pas encodées.
function arrLiteral(value: string): string {
  return `%7B${encodeURIComponent(value)}%7D`;
}

/** Compte exact via l'en-tête Content-Range de PostgREST, sans rapatrier les lignes. */
async function countFilms(filterQuery: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/films?select=id&limit=1&${filterQuery}`, {
    headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact' },
  });
  if (!res.ok) return 0;
  const range = res.headers.get('content-range'); // ex: "0-0/42"
  const total = range?.split('/')[1];
  return total && total !== '*' ? parseInt(total, 10) : 0;
}

// ---------------------------------------------------------------------------
// /films/:slug
// ---------------------------------------------------------------------------

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

async function handleFilm(url: URL) {
  const slug = url.pathname.replace(/^\/films\//, '');
  if (!slug) return next();

  const filterField = UUID_REGEX.test(slug) ? 'id' : 'slug';

  let film: FilmRow | undefined;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/films?${filterField}=eq.${encodeURIComponent(slug)}` +
        `&select=slug,title,display_title,synopsis,director,thumbnail_url,duration_minutes,release_year&limit=1`,
      { headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return next();
    const rows: FilmRow[] = await res.json();
    film = rows[0];
  } catch {
    return next();
  }
  if (!film) return next();

  const html = await fetchIndexHtml(url);
  if (!html) return next();

  const title = `${film.display_title || film.title} - ${SITE_NAME}`;
  const description = isSynopsisClean(film.synopsis) ? film.synopsis! : 'Watch this short film on Instant Films.';
  const canonical = `${url.origin}/films/${film.slug}`;
  const image = film.thumbnail_url || `${url.origin}/logo-instant.png`;

  let out = injectHeadTags(html, { title, description, canonical, image, ogType: 'video.other' });

  const noscript = `
      <h1>${escapeHtml(film.display_title || film.title)}</h1>
      ${film.director ? `<p>Réalisé par ${escapeHtml(film.director)}</p>` : ''}
      <p>${escapeHtml(description)}</p>
      ${film.release_year ? `<p>${film.release_year}</p>` : ''}
      ${film.duration_minutes ? `<p>${film.duration_minutes} min</p>` : ''}
    `;
  out = injectNoscript(out, noscript);

  return new Response(out, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

// ---------------------------------------------------------------------------
// /genre/:genre
// ---------------------------------------------------------------------------

async function handleGenre(url: URL) {
  const genre = url.pathname.replace(/^\/genre\//, '');
  const label = GENRE_LABELS[genre];
  if (!label) return next(); // genre inconnu, ou mainstream/kid (masqués)

  const count = await countFilms(
    `and=(genres.cs.${arrLiteral(genre)},genres.not.cs.${arrLiteral('mainstream')},genres.not.cs.${arrLiteral('kid')})`
  );
  if (count < MIN_FILMS_FOR_SEO) return next();

  const html = await fetchIndexHtml(url);
  if (!html) return next();

  const title = `${label} Short Films to Watch Online | ${SITE_NAME}`;
  const flavorText = GENRE_DESCRIPTIONS[genre] || `Discover the best ${label} short films on ${SITE_NAME}.`;
  const description = `${flavorText} Watch ${count} free ${label.toLowerCase()} short films on ${SITE_NAME}.`;
  const canonical = `${url.origin}/genre/${genre}`;

  let out = injectHeadTags(html, { title, description, canonical, ogType: 'website' });
  out = injectJsonLd(out, breadcrumbs(url.origin, [
    { name: 'Home', url: url.origin },
    { name: label, url: canonical },
  ]));
  out = injectNoscript(out, `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>`);

  return new Response(out, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

// ---------------------------------------------------------------------------
// /realisateur/:slug
// ---------------------------------------------------------------------------

async function findDirectorBySlug(slug: string): Promise<string | null> {
  let all: string[] = [];
  let offset = 0;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/films?select=director&director=not.is.null&limit=1000&offset=${offset}`,
      { headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) break;
    const rows: { director: string }[] = await res.json();
    if (!rows.length) break;
    all = all.concat(rows.map((r) => r.director));
    if (rows.length < 1000) break;
    offset += 1000;
  }
  const unique = [...new Set(all)];
  return unique.find((d) => slugify(d) === slug) || null;
}

async function handleDirector(url: URL) {
  const slug = url.pathname.replace(/^\/realisateur\//, '');
  if (!slug) return next();

  const director = await findDirectorBySlug(slug);
  if (!director) return next();

  const count = await countFilms(`director=eq.${encodeURIComponent(director)}`);
  if (count < MIN_FILMS_FOR_SEO) return next();

  const html = await fetchIndexHtml(url);
  if (!html) return next();

  const title = `${director}'s Films | ${SITE_NAME}`;
  const description = `Watch ${count} short films by ${director} on ${SITE_NAME} — stream, rate, and discover their work online.`;
  const canonical = `${url.origin}/realisateur/${slug}`;

  let out = injectHeadTags(html, { title, description, canonical, ogType: 'website' });
  out = injectJsonLd(out, breadcrumbs(url.origin, [
    { name: 'Home', url: url.origin },
    { name: director, url: canonical },
  ]));
  out = injectNoscript(out, `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>`);

  return new Response(out, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

// ---------------------------------------------------------------------------
// /search
// ---------------------------------------------------------------------------

async function handleSearch(url: URL) {
  const html = await fetchIndexHtml(url);
  if (!html) return next();

  const title = `Search Short Films | ${SITE_NAME}`;
  const description = `Browse and search hundreds of free short films on ${SITE_NAME} by genre, director, or title.`;

  const genreParam = url.searchParams.get('genre');
  const searchParam = url.searchParams.get('search');
  const hasQuery = !!genreParam || !!searchParam;

  if (hasQuery) {
    // Pas de contenu SSR dédié pour une recherche libre ou filtrée (combinaisons
    // infinies) — noindex pour éviter le duplicate/thin content. /search?genre=X
    // pointe son canonical vers /genre/:genre, la vraie URL de ce contenu.
    const canonical = genreParam && GENRE_LABELS[genreParam]
      ? `${url.origin}/genre/${genreParam}`
      : `${url.origin}/search`;
    const out = injectHeadTags(html, { title, description, canonical, ogType: 'website', robots: 'noindex, follow' });
    return new Response(out, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  const canonical = `${url.origin}/search`;
  let out = injectHeadTags(html, { title, description, canonical, ogType: 'website' });
  out = injectJsonLd(out, breadcrumbs(url.origin, [
    { name: 'Home', url: url.origin },
    { name: 'Search', url: canonical },
  ]));

  return new Response(out, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

// ---------------------------------------------------------------------------

export default async function middleware(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return next();

  const url = new URL(request.url);

  if (url.pathname.startsWith('/films/')) return handleFilm(url);
  if (url.pathname.startsWith('/genre/')) return handleGenre(url);
  if (url.pathname.startsWith('/realisateur/')) return handleDirector(url);
  if (url.pathname === '/search') return handleSearch(url);

  return next();
}
