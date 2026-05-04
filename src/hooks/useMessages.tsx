import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUnreadMessagesCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}
