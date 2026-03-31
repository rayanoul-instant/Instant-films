import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Send, Search } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  userId: string;
  username: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    if (selectedUser && user) loadMessages(selectedUser);
  }, [selectedUser, user]);

  const loadConversations = async () => {
    if (!user) return;
    setLoadingConversations(true);

    const { data: sent } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    const { data: received } = await supabase
      .from('messages')
      .select('*')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false });

    const allMessages = [...(sent || []), ...(received || [])];
    const userMap = new Map<string, any>();

    for (const msg of allMessages) {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!userMap.has(otherId) || new Date(msg.created_at) > new Date(userMap.get(otherId).created_at)) {
        userMap.set(otherId, msg);
      }
    }

    const convs: Conversation[] = [];
    for (const [userId, msg] of userMap) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
      convs.push({
        userId,
        username: profile?.username || 'User',
        lastMessage: msg.content,
        lastMessageAt: msg.created_at,
        unread: msg.receiver_id === user.id && !msg.is_read,
      });
    }

    convs.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    setConversations(convs);
    setLoadingConversations(false);
  };

  const loadMessages = async (otherUserId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', user.id);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUser || !user) return;
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selectedUser,
      content: newMessage,
    });
    if (error) {
      toast.error('Failed to send message');
      return;
    }
    setNewMessage('');
    loadMessages(selectedUser);
    loadConversations();
  };

  const handleSearchUsers = async (query: string) => {
    setSearchUser(query);
    if (query.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${query}%`)
      .neq('id', user?.id || '')
      .limit(5);
    setSearchResults(data || []);
  };

  const startConversation = (userId: string, username: string) => {
    setSelectedUser(userId);
    setSelectedUsername(username);
    setSearchUser('');
    setSearchResults([]);
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></Layout>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <Layout>
      <div className="container px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>

        {/* Search Users */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search for a user..."
            value={searchUser}
            onChange={(e) => handleSearchUsers(e.target.value)}
            className="pl-10 bg-secondary border-border"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-lg mt-1 z-10 shadow-lg">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startConversation(u.id, u.username)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {u.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">{u.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[60vh]">
          {/* Conversations List */}
          <div className="md:col-span-1 overflow-y-auto border border-border rounded-xl bg-card">
            {loadingConversations ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No conversations yet. Search for a user to start.
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => startConversation(conv.userId, conv.username)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-secondary transition-colors border-b border-border last:border-0 text-left ${
                    selectedUser === conv.userId ? 'bg-secondary' : ''
                  }`}
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {conv.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{conv.username}</span>
                      {conv.unread && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{conv.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Chat Area */}
          <div className={`md:col-span-2 flex flex-col border border-border rounded-xl bg-card overflow-hidden ${!selectedUser ? 'hidden md:flex' : ''}`}>
            {selectedUser ? (
              <>
                <div className="px-4 py-3 border-b border-border bg-secondary/50 flex items-center justify-between">
                  <Link to={`/user/${selectedUser}`} className="font-semibold text-sm hover:text-primary transition-colors">
                    {selectedUsername}
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => {
                    const filmMatch = msg.content.match(/🎬 \[film:([^:]+):([^:]+):([^\]]*)\]/);
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        {filmMatch ? (
                          <Link
                            to={`/films/${filmMatch[1]}`}
                            className={`max-w-[75%] rounded-2xl overflow-hidden block ${
                              msg.sender_id === user.id
                                ? 'bg-primary/20 border border-primary/30 rounded-br-sm'
                                : 'bg-secondary border border-border rounded-bl-sm'
                            }`}
                          >
                            {filmMatch[3] && (
                              <img src={filmMatch[3]} alt={filmMatch[2]} className="w-full aspect-video object-cover" />
                            )}
                            <div className="px-4 py-2">
                              <p className="text-sm font-medium">🎬 {filmMatch[2]}</p>
                              <p className="text-xs text-primary mt-0.5">Tap to watch →</p>
                            </div>
                          </Link>
                        ) : (
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                            msg.sender_id === user.id
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-secondary text-secondary-foreground rounded-bl-sm'
                          }`}>
                            {msg.content}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    placeholder="Write a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="bg-secondary border-border"
                  />
                  <Button onClick={handleSend} size="icon" className="btn-cinema flex-shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </Layout>
  );
}
