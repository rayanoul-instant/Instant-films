import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const [profileRes, ratingsRes, watchRes, favRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase
          .from('film_ratings')
          .select('*, film:films(id, title, thumbnail_url, director)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('watch_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('favorites')
          .select('id, user_id, film_id, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (profileRes.error) throw profileRes.error;

      // Fetch film details separately to avoid FK join issue
      const favs = favRes.data || [];
      let favorites: any[] = [];
      if (favs.length > 0) {
        const filmIds = favs.map((f: any) => f.film_id);
        const { data: films } = await supabase.from('films').select('*').in('id', filmIds);
        const filmsMap = new Map((films || []).map((f: any) => [f.id, f]));
        favorites = favs.map((f: any) => ({ ...f, film: filmsMap.get(f.film_id) || null }));
      }

      return {
        profile: profileRes.data,
        ratings: ratingsRes.data || [],
        watchCount: watchRes.count || 0,
        favorites,
      };
    },
    enabled: !!userId,
  });
}

export function useUserReviewLikes(userId: string) {
  return useQuery({
    queryKey: ['user-review-likes', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('review_likes')
        .select('rating_id')
        .eq('user_id', userId);
      return (data || []).map(l => l.rating_id) as string[];
    },
    enabled: !!userId,
  });
}
