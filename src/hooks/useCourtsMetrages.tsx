import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CourtMetrage {
  id: string;
  titre: string;
  auteur: string | null;
  annee: number | null;
  duree: string | null;
  themes: string | null;
  synopsis: string | null;
  lien: string | null;
  thumbnail_url: string | null;
  genres: string[];
  created_at: string;
}

export function useCourtsMetrages(filters?: { search?: string; genre?: string }) {
  return useQuery({
    queryKey: ['courts_metrages', filters],
    queryFn: async () => {
      let query = (supabase as any).from('courts_metrages').select('*').order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`titre.ilike.%${filters.search}%,auteur.ilike.%${filters.search}%`);
      }
      if (filters?.genre) {
        query = query.contains('genres', [filters.genre]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CourtMetrage[];
    },
  });
}
