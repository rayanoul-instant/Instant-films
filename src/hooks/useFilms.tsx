import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Film, FilmGenre, FilmRating, ReviewLike } from '@/types/database';
import { useAuth } from './useAuth';

export function useFilms(filters?: {
  genre?: FilmGenre;
  search?: string;
  sortBy?: 'newest' | 'popular' | 'rating';
}) {
  return useQuery({
    queryKey: ['films', filters],
    queryFn: async () => {
      let query = supabase
        .from('films')
        .select('*');

      if (filters?.genre) {
        query = query.contains('genres', [filters.genre]);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,synopsis.ilike.%${filters.search}%,director.ilike.%${filters.search}%`);
      }

      if (filters?.sortBy === 'newest') {
        query = query
          .order('quality_score', { ascending: false })
          .order('created_at', { ascending: false });
      } else if (filters?.sortBy === 'popular') {
        query = query
          .order('quality_score', { ascending: false })
          .order('view_count', { ascending: false });
      } else {
        query = query
          .order('quality_score', { ascending: false })
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      let films = data as Film[];

      // Exclude mainstream/kid unless explicitly browsing that category
      const HIDDEN_GENRES = ['mainstream', 'kid'];
      if (!HIDDEN_GENRES.includes(filters?.genre || '')) {
        films = films.filter(f => {
          const g = f.genres || [];
          return !g.includes('mainstream') && !g.includes('kid');
        });
      }

      return films;
    },
  });
}

export function useFeaturedFilms() {
  return useQuery({
    queryKey: ['films', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('films')
        .select('*')
        .not('genres', 'cs', '{"mainstream"}')
        .not('genres', 'cs', '{"kid"}')
        .not('genres', 'cs', '{"kid"}')
        .order('quality_score', { ascending: false })
        .order('view_count', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as Film[];
    },
  });
}

export function useFilm(id: string) {
  return useQuery({
    queryKey: ['film', id],
    queryFn: async () => {
      const { data: film, error } = await supabase
        .from('films')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;

      // Get average rating
      const { data: avgData } = await supabase
        .rpc('get_film_average_rating', { film_uuid: id });

      return { ...film, average_rating: avgData || 0 } as Film;
    },
    enabled: !!id,
  });
}

export function useFilmRatings(filmId: string) {
  return useQuery({
    queryKey: ['film-ratings', filmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('film_ratings')
        .select('*, profile:profiles(id, username, avatar_accessories)')
        .eq('film_id', filmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as FilmRating[];
    },
    enabled: !!filmId,
  });
}

export function useRateFilm() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ filmId, rating, review }: { filmId: string; rating: number; review?: string }) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('film_ratings')
        .upsert({
          film_id: filmId,
          user_id: user.id,
          rating,
          review,
        }, {
          onConflict: 'film_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: (_, { filmId }) => {
      queryClient.invalidateQueries({ queryKey: ['film-ratings', filmId] });
      queryClient.invalidateQueries({ queryKey: ['film', filmId] });
    },
  });
}

export function useFavorites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('favorites')
        .select('*, film:films(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (filmId: string) => {
      if (!user) throw new Error('Must be logged in');

      // Check if already favorited
      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('film_id', filmId)
        .single();

      if (existing) {
        await supabase
          .from('favorites')
          .delete()
          .eq('id', existing.id);
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, film_id: filmId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

export function useTop3() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['top3', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: top3rows, error } = await supabase
        .from('top3')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) { console.error('top3 fetch error:', error); return []; }
      if (!top3rows || top3rows.length === 0) return [];

      const filmIds = top3rows.map(r => r.film_id);
      const { data: films } = await supabase
        .from('films')
        .select('*')
        .in('id', filmIds);

      const filmsMap = new Map((films || []).map(f => [f.id, f]));
      return top3rows.map(r => ({ ...r, film: filmsMap.get(r.film_id) || null }));
    },
    enabled: !!user,
  });
}

export function useToggleTop3() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (filmId: string) => {
      if (!user) throw new Error('Must be logged in');
      const { data: existing } = await supabase
        .from('top3')
        .select('id')
        .eq('user_id', user.id)
        .eq('film_id', filmId)
        .single();
      if (existing) {
        const { error } = await supabase.from('top3').delete().eq('id', existing.id);
        if (error) { console.error('top3 delete error:', error); throw error; }
      } else {
        const { error } = await supabase.from('top3').insert({ user_id: user.id, film_id: filmId });
        if (error) { console.error('top3 insert error:', error); throw error; }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['top3'] });
    },
  });
}

export function useWatchHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['watch-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('watch_history')
        .select('*, film:films(*)')
        .eq('user_id', user.id)
        .order('watched_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useRecommendations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recommendations', user?.id],
    queryFn: async () => {
      // Sans compte : meilleurs films d'abord
      if (!user) {
        const { data } = await supabase
          .from('films')
          .select('*')
          .not('genres', 'cs', '{"mainstream"}')
        .not('genres', 'cs', '{"kid"}')
          .order('quality_score', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(8);
        return (data || []) as Film[];
      }

      // Récupère les films likés
      const { data: favs } = await supabase
        .from('favorites')
        .select('film_id')
        .eq('user_id', user.id);

      const favIds = (favs || []).map(f => f.film_id);

      if (favIds.length === 0) {
        // Pas encore de likes : meilleurs films d'abord
        const { data } = await supabase
          .from('films')
          .select('*')
          .not('genres', 'cs', '{"mainstream"}')
        .not('genres', 'cs', '{"kid"}')
          .order('quality_score', { ascending: false })
          .order('view_count', { ascending: false })
          .limit(8);
        return (data || []) as Film[];
      }

      // Récupère les détails des films likés pour extraire genres/director
      const { data: likedFilms } = await supabase
        .from('films')
        .select('genres, director')
        .in('id', favIds);

      const genres = [...new Set((likedFilms || []).flatMap(f => f.genres || []))];
      const directors = [...new Set((likedFilms || []).map(f => f.director).filter(Boolean))];

      // Cherche des films similaires (mêmes genres ou même réalisateur) non déjà likés
      let query = supabase
        .from('films')
        .select('*')
        .not('id', 'in', `(${favIds.join(',')})`)
        .not('genres', 'cs', '{"mainstream"}')
        .not('genres', 'cs', '{"kid"}')
        .limit(8);

      if (genres.length > 0) {
        query = query.overlaps('genres', genres);
      }

      const { data: byGenre } = await query;
      let results = (byGenre || []) as Film[];

      // Complète avec films du même réalisateur si pas assez
      if (results.length < 4 && directors.length > 0) {
        const { data: byDirector } = await supabase
          .from('films')
          .select('*')
          .in('director', directors)
          .not('id', 'in', `(${favIds.join(',')})`)
          .limit(8);

        const existingIds = new Set(results.map(f => f.id));
        const extra = (byDirector || []).filter(f => !existingIds.has(f.id));
        results = [...results, ...extra].slice(0, 8);
      }

      return results as Film[];
    },
  });
}

export function useTopReviews(minLikes = 3) {
  return useQuery({
    queryKey: ['top-reviews', minLikes],
    queryFn: async () => {
      // Get review_likes counts per rating
      const { data: likes } = await supabase
        .from('review_likes')
        .select('rating_id');

      if (!likes || likes.length === 0) return [];

      // Count likes per rating
      const countMap = new Map<string, number>();
      for (const l of likes) {
        countMap.set(l.rating_id, (countMap.get(l.rating_id) || 0) + 1);
      }

      // Keep only ratings with >= minLikes
      const qualifiedIds = [...countMap.entries()]
        .filter(([, count]) => count >= minLikes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      if (qualifiedIds.length === 0) return [];

      const { data } = await supabase
        .from('film_ratings')
        .select('*, profile:profiles(id, username, avatar_accessories), film:films(id, title, thumbnail_url)')
        .in('id', qualifiedIds)
        .not('review', 'is', null);

      // Re-sort by likes count
      return (data || []).sort((a, b) => (countMap.get(b.id) || 0) - (countMap.get(a.id) || 0))
        .map(r => ({ ...r, likesCount: countMap.get(r.id) || 0 }));
    },
  });
}

export function useReviewLikes(filmId: string) {
  return useQuery({
    queryKey: ['review-likes', filmId],
    queryFn: async () => {
      const { data } = await supabase
        .from('review_likes')
        .select('*')
        .eq('film_id', filmId);
      return data || [];
    },
    enabled: !!filmId,
  });
}

export function useDeleteRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ratingId, filmId }: { ratingId: string; filmId: string }) => {
      const { error } = await supabase.from('film_ratings').delete().eq('id', ratingId);
      if (error) throw error;
    },
    onSuccess: (_, { filmId }) => {
      queryClient.invalidateQueries({ queryKey: ['film-ratings', filmId] });
      queryClient.invalidateQueries({ queryKey: ['film', filmId] });
    },
  });
}

export function useToggleReviewLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ratingId, filmId }: { ratingId: string; filmId: string }) => {
      if (!user) throw new Error('Must be logged in');
      const { data: existing } = await supabase
        .from('review_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('rating_id', ratingId)
        .single();

      if (existing) {
        await supabase.from('review_likes').delete().eq('id', existing.id);
      } else {
        await supabase.from('review_likes').insert({ user_id: user.id, rating_id: ratingId, film_id: filmId });
      }
      return filmId;
    },
    onSuccess: (filmId) => {
      queryClient.invalidateQueries({ queryKey: ['review-likes', filmId] });
    },
  });
}

export function useDeleteFilm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (filmId: string) => {
      // Fetch film info before deleting to save to blacklist
      const { data: film } = await supabase
        .from('films')
        .select('video_url, title')
        .eq('id', filmId)
        .single();

      if (film?.video_url) {
        await supabase.from('deleted_films').upsert(
          { video_url: film.video_url, title: film.title },
          { onConflict: 'video_url' }
        );
      }

      const { error } = await supabase.from('films').delete().eq('id', filmId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['films'] });
    },
  });
}

export function useToggleMainstream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ filmId, genres, tag = 'mainstream' }: { filmId: string; genres: string[]; tag?: string }) => {
      const hasTag = genres.includes(tag);
      const newGenres = hasTag ? genres.filter(g => g !== tag) : [...genres, tag];
      const { error } = await supabase.from('films').update({ genres: newGenres }).eq('id', filmId);
      if (error) throw error;
      return newGenres;
    },
    onSuccess: (_, { filmId }) => {
      queryClient.invalidateQueries({ queryKey: ['film', filmId] });
      queryClient.invalidateQueries({ queryKey: ['films'] });
    },
  });
}

export function useAddToHistory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (filmId: string) => {
      if (!user) return;

      await supabase
        .from('watch_history')
        .insert({ user_id: user.id, film_id: filmId });

      // Increment view count
      try {
        await supabase.rpc('increment_view_count', { film_uuid: filmId });
      } catch {
        // Ignore errors
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-history'] });
    },
  });
}
