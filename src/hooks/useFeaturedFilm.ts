import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FEATURED_FILM_ID } from '@/config/featuredFilm';
import { Film } from '@/types/database';

/** Today's date in UTC (YYYY-MM-DD) so every visitor gets the same seed. */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** FNV-1a hash: small, deterministic string → unsigned int. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Film of the day: manual override from src/config/featuredFilm.ts, else a daily automatic pick. */
export function useFeaturedFilm() {
  const day = todayKey();

  return useQuery({
    queryKey: ['films', 'film-of-the-day', FEATURED_FILM_ID, day],
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<Film | null> => {
      if (FEATURED_FILM_ID) {
        const { data } = await supabase
          .from('films')
          .select('*')
          .eq('id', FEATURED_FILM_ID)
          .maybeSingle();
        if (data) return data as unknown as Film;
      }

      const { data, error } = await supabase
        .from('films')
        .select('*')
        .not('thumbnail_url', 'is', null)
        .not('genres', 'cs', '{"mainstream"}')
        .order('id', { ascending: true });
      if (error) throw error;

      const candidates = (data || []) as unknown as Film[];
      if (candidates.length === 0) return null;
      return candidates[hashString(day) % candidates.length];
    },
  });
}
