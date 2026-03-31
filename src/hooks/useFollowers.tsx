import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useFollowersCount(userId: string) {
  return useQuery({
    queryKey: ['followers-count', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });
}

export function useFollowingCount(userId: string) {
  return useQuery({
    queryKey: ['following-count', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });
}

export function useIsFollowing(targetUserId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-following', user?.id, targetUserId],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();
      return !!data;
    },
    enabled: !!user && !!targetUserId,
  });
}

export function useToggleFollow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error('Must be logged in');
      const { data: existing } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();

      if (existing) {
        await supabase.from('followers').delete().eq('id', existing.id);
      } else {
        await supabase.from('followers').insert({ follower_id: user.id, following_id: targetUserId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followers-count'] });
      queryClient.invalidateQueries({ queryKey: ['following-count'] });
      queryClient.invalidateQueries({ queryKey: ['is-following'] });
    },
  });
}

export function useFriendsCount(userId: string) {
  return useQuery({
    queryKey: ['friends-count', userId],
    queryFn: async () => {
      const { data: following } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', userId);
      if (!following || following.length === 0) return 0;
      const followingIds = following.map(f => f.following_id);
      const { count } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)
        .in('follower_id', followingIds);
      return count || 0;
    },
    enabled: !!userId,
  });
}

export function useFollowingList() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['following-list', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);
      if (error) throw error;
      // Get profiles for each following
      const profiles = await Promise.all(
        (data || []).map(async (f) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, avatar_accessories')
            .eq('id', f.following_id)
            .single();
          return profile;
        })
      );
      return profiles.filter(Boolean) as { id: string; username: string; avatar_accessories: any }[];
    },
    enabled: !!user,
  });
}
