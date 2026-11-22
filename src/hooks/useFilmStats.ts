import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FilmStats {
  /** Average rating on a 5-point scale (ratings are stored out of 10). */
  average: number;
  count: number;
}

const PAGE_SIZE = 1000;

/**
 * Average rating + number of reviews for every film, from film_ratings.
 * One shared query for all film cards (react-query dedupes it), instead of one per card.
 */
export function useFilmStats() {
  return useQuery({
    queryKey: ['film-stats'],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const totals = new Map<string, { sum: number; count: number }>();

      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('film_ratings')
          .select('film_id, rating')
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        (data || []).forEach(({ film_id, rating }) => {
          const entry = totals.get(film_id) || { sum: 0, count: 0 };
          entry.sum += rating;
          entry.count += 1;
          totals.set(film_id, entry);
        });
        if (!data || data.length < PAGE_SIZE) break;
      }

      const stats = new Map<string, FilmStats>();
      totals.forEach(({ sum, count }, filmId) => {
        stats.set(filmId, { average: sum / count / 2, count });
      });
      return stats;
    },
  });
}
