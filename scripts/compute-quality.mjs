/**
 * Calcule quality_score (0-100), quality_breakdown et quality_rated_at à
 * partir des stats YouTube déjà en base (yt_views, yt_likes, yt_comments).
 *
 * N'utilise PAS Gemini — formule déterministe, aucun appel API externe.
 * Privilégie le taux d'engagement (likes/vues, commentaires/vues) sur le
 * volume de vues brut : poids 65% engagement / 35% vues (voir WEIGHTS).
 *
 * Formule (voir aussi quality_breakdown pour le détail par film) :
 *   like_rate_score    = min(100, (likes/vues)      / LIKE_RATE_BENCHMARK    * 100)
 *   comment_rate_score = min(100, (commentaires/vues) / COMMENT_RATE_BENCHMARK * 100)
 *   engagement_score   = like_rate_score*0.7 + comment_rate_score*0.3
 *                        (repli sur un seul des deux si l'autre est masqué par le
 *                        créateur ; score neutre de 40 si les deux sont indisponibles)
 *   views_score        = min(100, log10(vues+1) / log10(VIEWS_BENCHMARK) * 100)
 *   quality_score       = round(engagement_score*0.65 + views_score*0.35)
 *
 * Cible les films où quality_rated_at est vide ET yt_fetched_at est rempli
 * (il faut les stats YouTube pour pouvoir noter). Relançable sans refaire le
 * travail déjà fait.
 *
 * Usage (l'un des deux flags est obligatoire) :
 *   node --env-file=.env scripts/compute-quality.mjs --sample=10
 *   node --env-file=.env scripts/compute-quality.mjs --full
 */
import { createClient } from "@supabase/supabase-js";
import { requireServiceRoleKey, updateAndVerify } from "./_write-guard.mjs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("Variables manquantes dans .env : VITE_SUPABASE_URL");
  process.exit(1);
}
requireServiceRoleKey();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const sampleArg = process.argv.find((a) => a.startsWith("--sample="));
const FULL = process.argv.includes("--full");
const SAMPLE = sampleArg ? parseInt(sampleArg.split("=")[1], 10) : null;

if (!FULL && !SAMPLE) {
  console.error("Usage : --sample=N (test) ou --full (tous les films restants). Aucun des deux n'a été passé.");
  process.exit(1);
}

// Benchmarks : valeurs "excellentes" qui donnent un score de 100 sur leur composante.
const LIKE_RATE_BENCHMARK = 0.06;      // 6% likes/vues
const COMMENT_RATE_BENCHMARK = 0.005;  // 0.5% commentaires/vues
const VIEWS_BENCHMARK = 2_000_000;     // 2M vues (échelle log)
const WEIGHTS = { engagement: 0.65, views: 0.35 };
const ENGAGEMENT_SUB_WEIGHTS = { likeRate: 0.7, commentRate: 0.3 };
const NEUTRAL_ENGAGEMENT_SCORE = 40; // ni pénalisé ni favorisé si likes+commentaires indisponibles

function computeQuality(film) {
  const views = film.yt_views || 0;
  const hasLikes = film.yt_likes != null;
  const hasComments = film.yt_comments != null;

  const likeRate = hasLikes && views > 0 ? film.yt_likes / views : null;
  const commentRate = hasComments && views > 0 ? film.yt_comments / views : null;

  const likeRateScore = likeRate != null ? Math.min(100, (likeRate / LIKE_RATE_BENCHMARK) * 100) : null;
  const commentRateScore = commentRate != null ? Math.min(100, (commentRate / COMMENT_RATE_BENCHMARK) * 100) : null;

  let engagementScore, note = null;
  if (likeRateScore != null && commentRateScore != null) {
    engagementScore = likeRateScore * ENGAGEMENT_SUB_WEIGHTS.likeRate + commentRateScore * ENGAGEMENT_SUB_WEIGHTS.commentRate;
  } else if (likeRateScore != null) {
    engagementScore = likeRateScore;
    note = "commentaires indisponibles (désactivés) — score basé sur les likes uniquement";
  } else if (commentRateScore != null) {
    engagementScore = commentRateScore;
    note = "likes indisponibles (masqués par le créateur) — score basé sur les commentaires uniquement";
  } else {
    engagementScore = NEUTRAL_ENGAGEMENT_SCORE;
    note = "likes et commentaires indisponibles — score neutre par défaut";
  }

  const viewsScore = views > 0 ? Math.min(100, (Math.log10(views + 1) / Math.log10(VIEWS_BENCHMARK)) * 100) : 0;

  const quality_score = Math.round(
    Math.max(0, Math.min(100, engagementScore * WEIGHTS.engagement + viewsScore * WEIGHTS.views))
  );

  return {
    quality_score,
    breakdown: {
      views,
      likes: film.yt_likes ?? null,
      comments: film.yt_comments ?? null,
      like_rate: likeRate != null ? Number(likeRate.toFixed(5)) : null,
      comment_rate: commentRate != null ? Number(commentRate.toFixed(5)) : null,
      like_rate_score: likeRateScore != null ? Math.round(likeRateScore) : null,
      comment_rate_score: commentRateScore != null ? Math.round(commentRateScore) : null,
      views_score: Math.round(viewsScore),
      engagement_score: Math.round(engagementScore),
      weights: WEIGHTS,
      benchmarks: { like_rate: LIKE_RATE_BENCHMARK, comment_rate: COMMENT_RATE_BENCHMARK, views: VIEWS_BENCHMARK },
      note,
    },
  };
}

async function main() {
  console.log(`\nCalcul du quality_score${SAMPLE ? ` — SAMPLE=${SAMPLE} (test)` : " (--full)"}\n`);

  let allFilms = [], offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("films")
      .select("id, title, yt_views, yt_likes, yt_comments, yt_fetched_at, quality_rated_at")
      .range(offset, offset + 999);
    if (error) { console.error("Erreur:", error.message); process.exit(1); }
    if (!data?.length) break;
    allFilms = allFilms.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  console.log(`${allFilms.length} films au total`);

  const notFetched = allFilms.filter((f) => !f.yt_fetched_at && !f.quality_rated_at).length;
  let toRate = allFilms.filter((f) => !f.quality_rated_at && f.yt_fetched_at);
  console.log(`${toRate.length} films prêts à noter (stats YouTube disponibles)`);
  if (notFetched > 0) console.log(`${notFetched} films pas encore notés mais sans stats YouTube — lancer fetch-youtube-stats.mjs d'abord`);
  if (SAMPLE) {
    toRate = toRate.slice(0, SAMPLE);
    console.log(`→ limité aux ${toRate.length} premiers pour ce test`);
  }
  console.log("");

  if (!toRate.length) { console.log("Rien a faire !"); return; }

  let updated = 0;

  for (const film of toRate) {
    const { quality_score, breakdown } = computeQuality(film);

    const { error } = await updateAndVerify(supabase, "films", film.id, {
      quality_score,
      quality_breakdown: breakdown,
      quality_rated_at: new Date().toISOString(),
    });
    if (error) {
      console.log(`\nÉchec écriture "${film.title}" (id=${film.id}): ${error.message}`);
      console.error(`Arrêt — ${updated} films déjà notés avant l'échec.`);
      process.exit(1);
    }
    updated++;
    console.log(`[${updated}/${toRate.length}] ${film.title.slice(0, 50).padEnd(50)} → ${quality_score}/100`);
  }

  const remaining = toRate.length - updated;
  console.log(`\nTermine !`);
  console.log(`  Traités  : ${updated}/${toRate.length}`);
  console.log(`  Restants : ${remaining}\n`);
}

main();
