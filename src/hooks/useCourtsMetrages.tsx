import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export function useCourtMetrage(id: string) {
  return useQuery({
    queryKey: ['court_metrage', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courts_metrages' as any)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as CourtMetrage;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateCourtMetrageTitre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, titre }: { id: string; titre: string }) => {
      const { error } = await supabase
        .from('courts_metrages' as any)
        .update({ titre })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id, titre }) => {
      queryClient.setQueryData(['court_metrage', id], (old: CourtMetrage | undefined) =>
        old ? { ...old, titre } : old
      );
      queryClient.setQueriesData(
        { queryKey: ['courts_metrages'] },
        (old: CourtMetrage[] | undefined) =>
          old?.map(f => f.id === id ? { ...f, titre } : f)
      );
    },
    onError: (error: any) => {
      toast.error('Failed to update title — ' + (error?.message || 'unknown error'));
    },
  });
}

export function useCourtsMetrages(filters?: { search?: string; genre?: string }) {
  return useQuery({
    queryKey: ['courts_metrages', filters],
    queryFn: async () => {
      let query = supabase.from('courts_metrages' as any).select('*').order('created_at', { ascending: false });

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
