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
        .select('profile:profiles!following_id(id, username, avatar_accessories)')
        .eq('follower_id', user.id);
      if (error) throw error;
      return (data || []).map((f: any) => f.profile).filter(Boolean) as { id: string; username: string; avatar_accessories: any }[];
    },
    enabled: !!user,
  });
}

export function useFriendsList() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['friends-list', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get IDs I follow
      const { data: following } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);
      if (!following || following.length === 0) return [];
      const followingIds = following.map(f => f.following_id);
      // Get mutual (those who follow me back) with profiles in one query
      const { data, error } = await supabase
        .from('followers')
        .select('profile:profiles!follower_id(id, username, avatar_accessories)')
        .eq('following_id', user.id)
        .in('follower_id', followingIds);
      if (error) throw error;
      return (data || []).map((f: any) => f.profile).filter(Boolean) as { id: string; username: string; avatar_accessories: any }[];
    },
    enabled: !!user,
  });
}

// ─── Friend Requests ────────────────────────────────────────────────────────

/** Status of the relationship between current user and targetUserId */
export function useFriendRequestStatus(targetUserId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['friend-request-status', user?.id, targetUserId],
    queryFn: async () => {
      if (!user || !targetUserId) return 'none';

      // Check mutual follow (friends)
      const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
        supabase.from('followers').select('id').eq('follower_id', user.id).eq('following_id', targetUserId).single(),
        supabase.from('followers').select('id').eq('follower_id', targetUserId).eq('following_id', user.id).single(),
      ]);
      if (iFollow && theyFollow) return 'friends';

      // Check outgoing pending request
      const { data: sent } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('from_user_id', user.id)
        .eq('to_user_id', targetUserId)
        .eq('status', 'pending')
        .single();
      if (sent) return 'pending_sent';

      return 'none';
    },
    enabled: !!user && !!targetUserId,
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error('Must be logged in');
      const { error } = await supabase
        .from('friend_requests')
        .insert({ from_user_id: user.id, to_user_id: targetUserId, status: 'pending' });
      if (error) throw error;
    },
    onSuccess: (_, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['friend-request-status', user?.id, targetUserId] });
    },
  });
}

/** Incoming pending requests for the current user, with sender profiles */
export function usePendingFriendRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pending-friend-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('friend_requests')
        .select('id, from_user_id, created_at')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const withProfiles = await Promise.all(
        (data || []).map(async (req) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, avatar_accessories, avatar_base')
            .eq('id', req.from_user_id)
            .single();
          return { ...req, profile };
        })
      );
      return withProfiles;
    },
    enabled: !!user,
  });
}

export function useRespondToFriendRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, fromUserId, action }: { requestId: string; fromUserId: string; action: 'accept' | 'decline' }) => {
      if (!user) throw new Error('Must be logged in');

      if (action === 'accept') {
        const { error } = await supabase.rpc('accept_friend_request', {
          request_id: requestId,
          from_user: fromUserId,
        });
        if (error) throw error;
      } else {
        await supabase.from('friend_requests').delete().eq('id', requestId);
      }
    },
    onSuccess: (_, { fromUserId }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends-count'] });
      queryClient.invalidateQueries({ queryKey: ['is-following'] });
      queryClient.invalidateQueries({ queryKey: ['following-list'] });
      queryClient.invalidateQueries({ queryKey: ['friend-request-status'] });
    },
  });
}
