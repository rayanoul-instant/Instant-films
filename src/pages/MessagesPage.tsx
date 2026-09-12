import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Send, Search, ArrowLeft, Trash2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarDisplay } from '@/components/films/AvatarDisplay';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  userId: string;
  username: string;
  avatarAccessories: any;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
}

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const MOCK_CONVERSATIONS: Conversation[] = [
  { userId: 'mock-2', username: 'gulyxfilms', avatarAccessories: { color: '#2563EB', hat: 'h9' }, lastMessage: 'T\'as vu le dernier court-métrage ?', lastMessageAt: ago(60 * 60 * 1000), unread: false },
  { userId: 'mock-3', username: 'paccino', avatarAccessories: { color: '#EA580C', mask: 'm6', body: 'b18' }, lastMessage: 'Trop bien celui-là', lastMessageAt: ago(4 * 30 * 24 * 60 * 60 * 1000), unread: false },
  { userId: 'mock-4', username: 'aurianelayon', avatarAccessories: { color: '#DB2777', hat: 'h14', body: 'b19' }, lastMessage: 'Like a fool', lastMessageAt: ago(3 * 30 * 24 * 60 * 60 * 1000), unread: false },
  { userId: 'mock-5', username: 'ducarlane', avatarAccessories: { color: '#16A34A', mask: 'm17' }, lastMessage: 'On se capte demain', lastMessageAt: ago(3 * 30 * 24 * 60 * 60 * 1000), unread: false },
  { userId: 'mock-1', username: 'Regellesinge', avatarAccessories: { color: '#7C3AED', mask: 'm11', body: 'b12' }, lastMessage: 'Mdr', lastMessageAt: ago(30 * 1000), unread: true },
  { userId: 'mock-6', username: 'lucieshorts', avatarAccessories: { color: '#DC2626', hat: 'h13', body: 'b10' }, lastMessage: 'On regarde ça ce soir ?', lastMessageAt: ago(5 * 30 * 24 * 60 * 60 * 1000), unread: false },
];

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  useEffect(() => {
    if (selectedUser && user) loadMessages(selectedUser);
  }, [selectedUser, user]);

  useEffect(() => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    });
  }, [messages]);

  // Pre-select conversation from URL param ?with=userId
  useEffect(() => {
    const withId = searchParams.get('with');
    if (withId && user && withId !== user.id) {
      supabase
        .from('profiles')
        .select('id, username, avatar_accessories')
        .eq('id', withId)
        .single()
        .then(({ data }) => {
          if (data) startConversation(data.id, data.username, data.avatar_accessories);
        });
    }
  }, [user, searchParams]);

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
        .select('username, avatar_accessories')
        .eq('id', userId)
        .single();
      convs.push({
        userId,
        username: profile?.username || 'User',
        avatarAccessories: profile?.avatar_accessories,
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
    if (error) { toast.error('Failed to send message'); return; }
    setNewMessage('');
    loadMessages(selectedUser);
    loadConversations();
  };

  const handleSearchUsers = async (query: string) => {
    setSearchUser(query);
    if (query.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_accessories')
      .ilike('username', `%${query}%`)
      .neq('id', user?.id || '')
      .limit(5);
    setSearchResults(data || []);
  };

  const startConversation = (userId: string, username: string, avatarAcc?: any) => {
    setSelectedUser(userId);
    setSelectedUsername(username);
    setSelectedAvatar(avatarAcc || null);
    setSearchUser('');
    setSearchResults([]);
  };

  const handleDeleteMessage = async (msgId: string) => {
    await supabase.from('messages').delete().eq('id', msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
    loadConversations();
  };

  const closeConversation = () => {
    setSelectedUser(null);
    setSelectedUsername('');
    setSelectedAvatar(null);
    setMessages([]);
    loadConversations();
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );
  // ── Logged-out preview ──────────────────────────────────────────────────────
  if (!user) {
    return (
      <Layout>
        <div className="relative">
          <div className="container px-4 py-6 max-w-2xl blur-[1.5px] pointer-events-none select-none">
            <h1 className="text-2xl font-bold mb-4">Messages</h1>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search for a user..." className="pl-10 bg-secondary border-border" readOnly tabIndex={-1} />
            </div>

            <div className="space-y-1">
              {MOCK_CONVERSATIONS.map((conv) => (
                <div key={conv.userId} className="w-full flex items-center gap-3 p-3 rounded-xl text-left">
                  <AvatarDisplay
                    color={conv.avatarAccessories?.color}
                    hat={conv.avatarAccessories?.hat}
                    glasses={conv.avatarAccessories?.glasses}
                    mask={conv.avatarAccessories?.mask}
                    body={conv.avatarAccessories?.body}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-sm">{conv.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{conv.lastMessage}</p>
                  </div>
                  {conv.unread && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Sign-up gate popup */}
          <div className="fixed inset-x-0 top-0 bottom-24 md:bottom-0 z-40 flex items-center justify-center px-6">
            <div
              className="w-full max-w-sm rounded-3xl p-8 text-center"
              style={{
                background: 'linear-gradient(145deg, hsl(270 25% 25% / 0.55), hsl(265 30% 15% / 0.5))',
                backdropFilter: 'blur(24px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
                boxShadow: '0 8px 32px hsl(270 40% 10% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.08), inset 0 -1px 0 hsl(270 30% 20% / 0.3)',
                border: '1px solid hsl(0 0% 100% / 0.12)',
              }}
            >
              <h2 className="text-2xl font-bold mb-2">Chat with the community</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Discuss short films, share your favorites with friends
              </p>
              <Link to="/auth">
                <Button className="btn-cinema w-full rounded-full h-12 text-base">
                  Create an account
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-3">it only takes 30s</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Conversation view ──────────────────────────────────────────────────────
  if (selectedUser) {
    return (
      <Layout hideFooter>
        {/* Full-screen fixed on mobile, constrained on desktop */}
        <div className="fixed inset-0 z-30 bg-background flex flex-col md:static md:inset-auto md:z-auto md:h-[calc(100vh-5rem)]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>


          {/* Header — locked to top */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
            <button onClick={closeConversation} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link to={`/user/${selectedUser}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <AvatarDisplay
                color={selectedAvatar?.color}
                hat={selectedAvatar?.hat}
                glasses={selectedAvatar?.glasses}
                mask={selectedAvatar?.mask}
                size="sm"
              />
              <span className="font-semibold">{selectedUsername}</span>
            </Link>
          </div>

          {/* Messages — scrollable area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const filmMatch = msg.content.match(/🎬 \[film:([^:]+):([^:]+):([^\]]*)\]/);
              const isMine = msg.sender_id === user.id;
              return (
                <div key={msg.id} className={`flex items-end gap-2 group ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {isMine && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {filmMatch ? (
                    <Link
                      to={`/films/${filmMatch[1]}`}
                      className={`max-w-[75%] rounded-2xl overflow-hidden block ${
                        isMine
                          ? 'bg-primary/20 border border-primary/30 rounded-br-sm'
                          : 'bg-secondary border border-border rounded-bl-sm'
                      }`}
                    >
                      {filmMatch[3] && <img src={filmMatch[3]} alt={filmMatch[2]} className="w-full aspect-video object-cover" />}
                      <div className="px-4 py-2">
                        <p className="text-sm font-medium">🎬 {filmMatch[2]}</p>
                        <p className="text-xs text-primary mt-0.5">Tap to watch →</p>
                      </div>
                    </Link>
                  ) : (
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      isMine
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-secondary text-secondary-foreground rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input — locked above BottomNav on mobile */}
          <div className="flex-shrink-0 bg-card border-t border-border">
            <div className="p-3 flex gap-2">
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
            {/* Spacer for BottomNav on mobile */}
            <div className="h-24 md:hidden" />
          </div>

        </div>
      </Layout>
    );
  }

  // ── Conversations list ─────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="container px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>

        {/* Search */}
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
                  onClick={() => startConversation(u.id, u.username, u.avatar_accessories)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
                >
                  <AvatarDisplay
                    color={u.avatar_accessories?.color}
                    hat={u.avatar_accessories?.hat}
                    glasses={u.avatar_accessories?.glasses}
                    mask={u.avatar_accessories?.mask}
                    size="sm"
                  />
                  <span className="font-medium text-sm">{u.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation list */}
        {loadingConversations ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No conversations yet. Search for a user to start.
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => startConversation(conv.userId, conv.username, conv.avatarAccessories)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
              >
                <AvatarDisplay
                  color={conv.avatarAccessories?.color}
                  hat={conv.avatarAccessories?.hat}
                  glasses={conv.avatarAccessories?.glasses}
                  mask={conv.avatarAccessories?.mask}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm">{conv.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{conv.lastMessage}</p>
                </div>
                {conv.unread && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
