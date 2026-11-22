/**
 * Film of the day (homepage hero).
 *
 * - Leave FEATURED_FILM_ID as `null` for automatic mode: one film is picked per day
 *   (seeded by today's UTC date, so every visitor sees the same film that day),
 *   among films that have a thumbnail, excluding the "Mainstream" genre.
 * - To force a specific film, paste its id from the Supabase `films` table, e.g.
 *     export const FEATURED_FILM_ID: string | null = '3f2c...-...';
 *   If that id doesn't match any film, the site falls back to automatic mode.
 *
 * Note for Claude: when the user says "feature the film [title]", look up that film's
 * id in the Supabase `films` table, set FEATURED_FILM_ID to it and confirm the title.
 * When the user says "back to automatic", set it back to null.
 */
export const FEATURED_FILM_ID: string | null = '27685516-79c1-4982-9f09-5cfbd77e137f'; // EVERY LIVING BREATHING MOMENT — Angelo Visser
