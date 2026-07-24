import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const YT_KEY = process.env.YOUTUBE_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY; // Ajoute cette ligne dans ton .env

if (!SUPABASE_URL || !SUPABASE_KEY || !YT_KEY || !GEMINI_KEY) {
  console.error("Variables manquantes dans .env :");
  if (!SUPABASE_URL) console.error("  - VITE_SUPABASE_URL");
  if (!SUPABASE_KEY) console.error("  - VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!YT_KEY) console.error("  - YOUTUBE_API_KEY");
  if (!GEMINI_KEY) console.error("  - GEMINI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Patterns parasites dans les synopsis
const SYNOPSIS_NOISE = [
  /submit your (short )?film/i,
  /https?:\/\/\S+/g,
  /subscribe/i,
  /abonnez-vous/i,
  /shortverse\.com/i,
  /shortoftheweek\.com/i,
  /watch more/i,
  /follow us/i,
];

function isSynopsisClean(synopsis) {
  if (!synopsis || synopsis.length < 20) return false;
  return !SYNOPSIS_NOISE.some((p) => p.test(synopsis));
}

function extractVideoId(url) {
  const m = url?.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function getYouTubeDescriptions(videoIds) {
  const params = new URLSearchParams({
    part: "snippet",
    id: videoIds.join(","),
    key: YT_KEY,
  });
  const resp = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
  if (!resp.ok) { const err = await resp.json(); throw new Error(err.error?.message || "YouTube API error"); }
  const data = await resp.json();
  const result = {};
  for (const item of data.items || []) {
    result[item.id] = item.snippet?.description || "";
  }
  return result;
}

async function generateSynopsis(title, description) {
  if (!description || description.length < 30) return null;

  const prompt = `Tu es un assistant éditorial pour une plateforme de streaming de courts métrages.

Voici le titre du court métrage : "${title}"
Voici la description YouTube : "${description.slice(0, 1000)}"

Ta tâche : écrire un synopsis de 1 à 2 phrases maximum, en français, qui décrit l'histoire ou le propos du film de manière claire et attrayante. 

Règles strictes :
- Si la description ne contient pas assez d'informations sur le contenu du film (par exemple si c'est juste des crédits techniques, des liens, des appels à s'abonner), réponds uniquement par le mot "SKIP"
- Ne mentionne jamais YouTube, des URLs, des noms de chaînes ou des appels à l'action
- Écris uniquement le synopsis, sans introduction ni conclusion
- Maximum 2 phrases courtes et percutantes

Réponds uniquement avec le synopsis ou "SKIP".`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 150, temperature: 0.3 },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message || "Gemini API error");
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text || text === "SKIP" || text.length < 15) return null;
  return text;
}

async function main() {
  console.log("\nGeneration des synopsis avec Gemini\n");

  // Recuperer les films sans synopsis propre
  let allFilms = [], offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("films")
      .select("id, title, synopsis, video_url")
      .range(offset, offset + 999);
    if (error) { console.error("Erreur:", error.message); process.exit(1); }
    if (!data?.length) break;
    allFilms = allFilms.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  console.log(`${allFilms.length} films au total`);

  // Filtrer ceux qui ont un synopsis manquant ou pollué
  const toUpdate = allFilms.filter((f) => !isSynopsisClean(f.synopsis));
  console.log(`${toUpdate.length} films sans synopsis propre\n`);

  if (!toUpdate.length) { console.log("Rien a faire !"); return; }

  let updated = 0, skipped = 0, errors = 0;

  for (let i = 0; i < toUpdate.length; i += 50) {
    const batch = toUpdate.slice(i, i + 50);
    const videoIds = batch.map((f) => extractVideoId(f.video_url)).filter(Boolean);
    if (!videoIds.length) continue;

    let descriptions = {};
    try {
      descriptions = await getYouTubeDescriptions(videoIds);
    } catch (err) {
      console.error(`Erreur YouTube batch ${i}: ${err.message}`);
      if (err.message.includes("quota")) { console.log("Quota YouTube atteint."); break; }
      continue;
    }

    for (const film of batch) {
      const vidId = extractVideoId(film.video_url);
      if (!vidId) continue;

      const description = descriptions[vidId] || "";
      const idx = i + batch.indexOf(film) + 1;
      process.stdout.write(`[${idx}/${toUpdate.length}] ${film.title.slice(0, 35).padEnd(35)} → `);

      try {
        const synopsis = await generateSynopsis(film.title, description);

        if (synopsis) {
          const { error } = await supabase
            .from("films")
            .update({ synopsis })
            .eq("id", film.id);
          if (error) { console.log(`ERREUR DB: ${error.message}`); errors++; }
          else { console.log(synopsis.slice(0, 60) + "..."); updated++; }
        } else {
          console.log("SKIP (pas assez d'info)");
          skipped++;
        }
      } catch (err) {
        console.log(`ERREUR: ${err.message}`);
        errors++;
        if (err.message.includes("quota") || err.message.includes("429")) {
          console.log("\nQuota Gemini atteint. Relance demain.");
          break;
        }
      }

      // Pause pour respecter le rate limit Gemini
      await new Promise((r) => setTimeout(r, 4500));
    }
  }

  console.log(`\nTermine !`);
  console.log(`  ${updated} synopsis generes`);
  console.log(`  ${skipped} films sans assez d'info`);
  console.log(`  ${errors} erreurs\n`);
}

main();
