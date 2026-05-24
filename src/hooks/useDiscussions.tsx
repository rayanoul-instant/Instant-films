import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Discussion, Comment, Profile } from '@/types/database';
import { useAuth } from './useAuth';

export function useDiscussions(filmId?: string) {
  return useQuery({
    queryKey: ['discussions', filmId],
    queryFn: async () => {
      let query = supabase
        .from('discussions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filmId) {
        query = query.eq('film_id', filmId);
      }

      const { data: discussions, error } = await query;
      
      if (error) throw error;

      // Fetch profiles and films for each discussion
      const discussionsWithData = await Promise.all(
        (discussions || []).map(async (discussion) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, avatar_base')
            .eq('id', discussion.author_id)
            .single();
          
          let film = null;
          if (discussion.film_id) {
            const { data: filmData } = await supabase
              .from('films')
              .select('id, slug, title')
              .eq('id', discussion.film_id)
              .single();
            film = filmData;
          }

          return {
            ...discussion,
            profile: profile as Pick<Profile, 'id' | 'username' | 'avatar_base'> | undefined,
            film: film as { id: string; title: string } | undefined,
          };
        })
      );

      return discussionsWithData as Discussion[];
    },
  });
}

export function useDiscussion(id: string) {
  return useQuery({
    queryKey: ['discussion', id],
    queryFn: async () => {
      const { data: discussion, error } = await supabase
        .from('discussions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_base')
        .eq('id', discussion.author_id)
        .single();

      // Fetch film if exists
      let film = null;
      if (discussion.film_id) {
        const { data: filmData } = await supabase
          .from('films')
          .select('id, title')
          .eq('id', discussion.film_id)
          .single();
        film = filmData;
      }

      return {
        ...discussion,
        profile,
        film,
      } as Discussion;
    },
    enabled: !!id,
  });
}

export function useComments(discussionId: string) {
  return useQuery({
    queryKey: ['comments', discussionId],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('discussion_id', discussionId)
        .is('parent_id', null)
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // Fetch profiles and replies for each comment
      const commentsWithData = await Promise.all(
        (comments || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, avatar_base')
            .eq('id', comment.author_id)
            .single();

          // Fetch replies
          const { data: replies } = await supabase
            .from('comments')
            .select('*')
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true });

          // Fetch profiles for replies
          const repliesWithProfiles = await Promise.all(
            (replies || []).map(async (reply) => {
              const { data: replyProfile } = await supabase
                .from('profiles')
                .select('id, username, avatar_base')
                .eq('id', reply.author_id)
                .single();
              
              return { ...reply, profile: replyProfile };
            })
          );
          
          return { ...comment, profile, replies: repliesWithProfiles };
        })
      );

      return commentsWithData as Comment[];
    },
    enabled: !!discussionId,
  });
}

export function useCreateDiscussion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, content, filmId }: { title: string; content: string; filmId?: string }) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('discussions')
        .insert({
          title,
          content,
          author_id: user.id,
          film_id: filmId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ discussionId, content, parentId }: { discussionId: string; content: string; parentId?: string }) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('comments')
        .insert({
          discussion_id: discussionId,
          author_id: user.id,
          content,
          parent_id: parentId || null,
        });

      if (error) throw error;

      // Update comments count
      try {
        await supabase.rpc('increment_comments_count', { discussion_uuid: discussionId });
      } catch {
        // Ignore errors
      }
    },
    onSuccess: (_, { discussionId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', discussionId] });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    },
  });
}

export function useLikeDiscussion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (discussionId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { data: existing } = await supabase
        .from('discussion_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('discussion_id', discussionId)
        .single();

      if (existing) {
        await supabase
          .from('discussion_likes')
          .delete()
          .eq('id', existing.id);
      } else {
        await supabase
          .from('discussion_likes')
          .insert({ user_id: user.id, discussion_id: discussionId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    },
  });
}
