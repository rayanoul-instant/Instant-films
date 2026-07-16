import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Star, Clock, Bookmark, Edit2, Save, Film, ChevronDown, ThumbsUp, Check, X, Plus, Eye, Trophy, UserPlus, Users, Settings, LogOut, History } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { FilmCard } from '@/components/films/FilmCard';
import { AvatarDisplay, AVATAR_COLORS, AVATAR_HATS, AVATAR_GLASSES, AVATAR_MASKS } from '@/components/films/AvatarDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites, useWatchHistory, useFilms, useToggleFavorite, useTop3, useToggleTop3 } from '@/hooks/useFilms';
import { useFriendsCount, usePendingFriendRequests, useRespondToFriendRequest, useFriendsList } from '@/hooks/useFollowers';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

function useMyRatings(userId?: string) {
  return useQuery({
    queryKey: ['my-ratings', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('film_ratings')
        .select('*, film:films(id, title, thumbnail_url)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!userId,
  });
}

function useMyReviewLikes(userId?: string) {
  return useQuery({
    queryKey: ['my-review-likes', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase.from('review_likes').select('*');
      return data || [];
    },
    enabled: !!userId,
  });
}

export default function AccountPage() {
  const { user, profile, loading, updateProfile, signOut } = useAuth();
  const { data: favorites } = useFavorites();
  const { data: top3Data } = useTop3();
  const { data: history } = useWatchHistory();
  const { data: allFilms } = useFilms();
  const { data: myRatings } = useMyRatings(user?.id);
  const { data: reviewLikes } = useMyReviewLikes(user?.id);
  const { data: friendsCount = 0 } = useFriendsCount(user?.id || '');
  const { data: pendingRequests = [] } = usePendingFriendRequests();
  const { data: friendsList = [] } = useFriendsList();
  const respondToRequest = useRespondToFriendRequest();
  const toggleFavorite = useToggleFavorite();
  const toggleTop3 = useToggleTop3();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [showFriendsDrawer, setShowFriendsDrawer] = useState(false);
  const [friendsTab, setFriendsTab] = useState<'friends' | 'requests'>('friends');
  const [showSettings, setShowSettings] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [avatarColor, setAvatarColor] = useState('#7C3AED');
  const [avatarHat, setAvatarHat] = useState('none');
  const [avatarGlasses, setAvatarGlasses] = useState('none');
  const [avatarMask, setAvatarMask] = useState('none');
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [searchTop3, setSearchTop3] = useState('');

  if (loading) {
    return (
      <Layout>
        <div className="container px-4 py-8">
          <div className="flex gap-6 mb-8">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const openEdit = () => {
    setEditUsername(profile?.username || '');
    setEditBio(profile?.bio || '');
    setIsEditing(true);
  };

  const openAvatarEdit = () => {
    const acc = profile?.avatar_accessories as any;
    setAvatarColor(acc?.color || '#7C3AED');
    setAvatarHat(acc?.hat || 'none');
    setAvatarGlasses(acc?.glasses || 'none');
    setAvatarMask(acc?.mask || 'none');
    setShowAvatarEdit(true);
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) { toast.error('Username cannot be empty'); return; }
    const { error } = await updateProfile({ username: editUsername, bio: editBio });
    if (error) { toast.error('Failed to update profile'); }
    else { toast.success('Profile updated!'); setIsEditing(false); }
  };

  const handleSaveAvatar = async () => {
    const { error } = await updateProfile({
      avatar_accessories: { color: avatarColor, hat: avatarHat, glasses: avatarGlasses, mask: avatarMask } as any,
    });
    if (error) { toast.error('Failed to update avatar'); }
    else { toast.success('Avatar updated!'); setShowAvatarEdit(false); }
  };

  const handleToggleTop3 = async (filmId: string) => {
    await toggleTop3.mutateAsync(filmId);
  };

  const getLikes = (ratingId: string) =>
    reviewLikes?.filter(l => l.rating_id === ratingId).length || 0;

  const avgRating = myRatings && myRatings.length
    ? (myRatings.reduce((s, r) => s + r.rating, 0) / myRatings.length / 2).toFixed(1)
    : null;

  const topFavorites = top3Data?.slice(0, 3) || [];
  const sortedReviews = [...(myRatings || [])].sort(
    (a, b) => getLikes(b.id) - getLikes(a.id)
  );
  const topReview = sortedReviews[0];
  const moreReviews = showAllReviews ? sortedReviews.slice(1) : sortedReviews.slice(1, 4);

  const currentAcc = profile?.avatar_accessories as any;

  // Films available for Top 3 search (not already in top3)
  const top3FilmIds = new Set(top3Data?.map(f => f.film_id) || []);
  const filteredSearchFilms = (allFilms || []).filter(f =>
    !top3FilmIds.has(f.id) &&
    searchTop3.length > 0 &&
    f.title.toLowerCase().includes(searchTop3.toLowerCase())
  ).slice(0, 5);

  return (
    <Layout>
      <div className="container px-4 py-8 max-w-3xl mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cinema-card p-6 md:p-8 mb-8"
        >
          {isEditing ? (
            <div className="space-y-6">
              {/* Username */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Username</label>
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="bg-secondary border-border" />
              </div>
              {/* Bio */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Description</label>
                <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="bg-secondary border-border" placeholder="Tell us about yourself..." rows={3} />
              </div>

              {/* Top 3 */}
              <div>
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4" style={{ color: '#c5a028' }} /> Top 3
                </p>
                <div className="space-y-2">
                  {topFavorites.map((fav, i) => fav.film && (
                    <div key={fav.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                      <span className="text-primary font-bold text-sm">#{i + 1}</span>
                      <div className="w-10 h-7 rounded overflow-hidden flex-shrink-0 bg-muted">
                        {fav.film.thumbnail_url && <img src={fav.film.thumbnail_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <span className="flex-1 text-sm font-medium truncate">{fav.film.title}</span>
                      <button onClick={() => handleToggleTop3(fav.film_id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {topFavorites.length < 3 && (
                    <div className="border border-dashed border-border rounded-lg p-3">
                      <Input
                        placeholder="Rechercher un film à ajouter..."
                        value={searchTop3}
                        onChange={(e) => setSearchTop3(e.target.value)}
                        className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
                      />
                      {filteredSearchFilms.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {filteredSearchFilms.map(f => (
                            <button
                              key={f.id}
                              onClick={() => { handleToggleTop3(f.id); setSearchTop3(''); }}
                              className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                            >
                              <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                              <span className="text-sm truncate">{f.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} className="btn-cinema">
                  <Save className="w-4 h-4 mr-2" /> Enregistrer
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="border-border">Annuler</Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-row gap-4 items-center">
                <div className="relative flex-shrink-0">
                  <AvatarDisplay
                    color={currentAcc?.color}
                    hat={currentAcc?.hat}
                    glasses={currentAcc?.glasses}
                    mask={currentAcc?.mask}
                    size="xl"
                  />
                  <button
                    onClick={openAvatarEdit}
                    title="Personnaliser l'avatar"
                    className="absolute -top-1 -left-1 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-base hover:bg-secondary transition-colors shadow-sm"
                  >
                    😊
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div>
                      <h1 className="font-display text-2xl md:text-3xl font-bold mb-1">
                        {profile?.username || 'User'}
                      </h1>
                      <p className="text-muted-foreground text-sm">{user.email}</p>
                      {profile?.bio && <p className="text-muted-foreground text-sm mt-1">{profile.bio}</p>}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={openEdit} className="border-border px-2 sm:px-3">
                        <Edit2 className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="border-border px-2 sm:px-3">
                        <Settings className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Settings</span>
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setFriendsTab('friends'); setShowFriendsDrawer(true); }}
                        className="flex items-center gap-2 relative"
                      >
                        <User className="w-4 h-4 text-primary" />
                        <span className="font-semibold">{friendsCount}</span>
                        <span className="text-muted-foreground text-sm">friends</span>
                        {pendingRequests.length > 0 && (
                          <span className="absolute -top-2 -right-3 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {pendingRequests.length}
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{history?.length || 0}</span>
                      <span className="text-muted-foreground text-sm">watched</span>
                    </div>
                    {avgRating && (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="font-semibold">{avgRating}/5</span>
                        <span className="text-muted-foreground text-sm">avg rating</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Top 3 Favorites */}
        {!isEditing && (
          <div className="mb-8">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" style={{ color: '#c5a028' }} />
              Top 3 Favorites
            </h2>
            {topFavorites.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {topFavorites.map((fav) => fav.film && (
                  <FilmCard key={fav.id} film={fav.film} isTop3 />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground cinema-card">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No favorites yet.</p>
                <Button variant="outline" size="sm" onClick={openEdit} className="mt-3 border-border">
                  Add your Top 3
                </Button>
              </div>
            )}
          </div>
        )}

        {/* My Reviews */}
        {!isEditing && (
          <div>
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary fill-primary" />
              My Reviews
            </h2>
            {(myRatings || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No reviews yet.</p>
                <Link to="/search">
                  <Button variant="outline" className="mt-4 border-border">Discover films</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {topReview && (
                  <div className="cinema-card p-4 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <ThumbsUp className="w-3.5 h-3.5 text-primary fill-primary" />
                      <span className="text-xs text-primary font-medium">Most liked</span>
                    </div>
                    <MyReviewItem r={topReview} likes={getLikes(topReview.id)} />
                  </div>
                )}
                {moreReviews.map((r) => (
                  <div key={r.id} className="cinema-card p-4">
                    <MyReviewItem r={r} likes={getLikes(r.id)} />
                  </div>
                ))}
                {(myRatings || []).length > 4 && (
                  <button
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={cn("w-4 h-4 transition-transform", showAllReviews && "rotate-180")} />
                    {showAllReviews ? 'Show less' : `Show ${(myRatings?.length || 0) - 4} more reviews`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Saved Films */}
        {!isEditing && (
          <div className="mt-8">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-accent fill-accent" />
              Saved
            </h2>
            {(favorites || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No saved films yet. Tap the bookmark on a film to save it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {favorites?.map((fav) => fav.film && (
                  <FilmCard key={fav.id} film={fav.film} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Avatar Edit Modal */}
      {showAvatarEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAvatarEdit(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="relative bg-card border border-border rounded-2xl p-6 z-10 w-full max-w-sm overflow-y-auto"
            style={{ maxHeight: '85vh' }}
          >
            <h2 className="font-display text-lg font-bold mb-5">Mon avatar</h2>
            <div className="flex justify-center mb-6">
              <AvatarDisplay
                color={avatarColor}
                hat={avatarHat === 'none' ? undefined : avatarHat}
                glasses={avatarGlasses === 'none' ? undefined : avatarGlasses}
                mask={avatarMask === 'none' ? undefined : avatarMask}
                size="xl"
              />
            </div>
            <div className="space-y-5">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Couleur</p>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button key={c.id} onClick={() => setAvatarColor(c.value)} title={c.label}
                      className={cn("w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center",
                        avatarColor === c.value ? "border-white scale-110" : "border-transparent opacity-70 hover:opacity-100"
                      )}
                      style={{ backgroundColor: c.value }}
                    >
                      {avatarColor === c.value && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Chapeau</p>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_HATS.map((h) => (
                    <button key={h.id} onClick={() => setAvatarHat(h.id)}
                      className={cn("p-2 rounded-lg border transition-all",
                        avatarHat === h.id ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-muted-foreground"
                      )}>
                      {h.image ? <img src={h.image} alt={h.label} className="w-10 h-10 object-contain" /> : <span className="text-xs px-1">—</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Lunettes</p>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_GLASSES.map((g) => (
                    <button key={g.id} onClick={() => setAvatarGlasses(g.id)}
                      className={cn("p-2 rounded-lg border transition-all",
                        avatarGlasses === g.id ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-muted-foreground"
                      )}>
                      {g.image ? <img src={g.image} alt={g.label} className="w-10 h-10 object-contain" /> : <span className="text-xs px-1">—</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Masque</p>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_MASKS.map((m) => (
                    <button key={m.id} onClick={() => setAvatarMask(m.id)}
                      className={cn("p-2 rounded-lg border transition-all",
                        avatarMask === m.id ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-muted-foreground"
                      )}>
                      {m.image ? <img src={m.image} alt={m.label} className="w-10 h-10 object-contain" /> : <span className="text-xs px-1">—</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleSaveAvatar} className="btn-cinema flex-1">
                <Save className="w-4 h-4 mr-2" /> Enregistrer
              </Button>
              <Button variant="outline" onClick={() => setShowAvatarEdit(false)} className="border-border">Annuler</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Friends Drawer */}
      {showFriendsDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowFriendsDrawer(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="relative bg-card border border-border rounded-2xl z-10 flex flex-col w-full max-w-sm"
            style={{ maxHeight: '75vh' }}
          >

            {/* Tabs */}
            <div className="flex border-b border-border flex-shrink-0">
              <button
                onClick={() => setFriendsTab('friends')}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors',
                  friendsTab === 'friends' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground'
                )}
              >
                Friends ({friendsList.length})
              </button>
              <button
                onClick={() => setFriendsTab('requests')}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors relative',
                  friendsTab === 'requests' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground'
                )}
              >
                Requests
                {pendingRequests.length > 0 && (
                  <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-4 pb-8 space-y-2">
              {friendsTab === 'friends' && (
                friendsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No friends yet.</p>
                ) : (
                  friendsList.map((f: any) => (
                    <Link
                      key={f.id}
                      to={`/user/${f.id}`}
                      onClick={() => setShowFriendsDrawer(false)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors"
                    >
                      <AvatarDisplay
                        color={f.avatar_accessories?.color}
                        hat={f.avatar_accessories?.hat}
                        glasses={f.avatar_accessories?.glasses}
                        mask={f.avatar_accessories?.mask}
                        size="sm"
                      />
                      <span className="font-medium text-sm">{f.username}</span>
                    </Link>
                  ))
                )
              )}

              {friendsTab === 'requests' && (
                pendingRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No pending requests.</p>
                ) : (
                  pendingRequests.map((req: any) => (
                    <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
                      <Link
                        to={`/user/${req.profile?.id}`}
                        onClick={() => setShowFriendsDrawer(false)}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <AvatarDisplay
                          color={req.profile?.avatar_accessories?.color}
                          hat={req.profile?.avatar_accessories?.hat}
                          glasses={req.profile?.avatar_accessories?.glasses}
                          mask={req.profile?.avatar_accessories?.mask}
                          size="sm"
                        />
                        <span className="font-medium text-sm truncate">{req.profile?.username || 'User'}</span>
                      </Link>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => respondToRequest.mutate(
                            { requestId: req.id, fromUserId: req.from_user_id, action: 'accept' },
                            { onSuccess: () => toast.success('Friend added!') }
                          )}
                          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:opacity-80 transition-opacity"
                        >
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </button>
                        <button
                          onClick={() => respondToRequest.mutate({ requestId: req.id, fromUserId: req.from_user_id, action: 'decline' })}
                          className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:opacity-80 transition-opacity"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Settings Drawer */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSettings(false)} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="relative bg-card border border-border rounded-2xl p-6 pb-8 z-10 w-full max-w-sm"
          >
            <h2 className="font-display text-lg font-bold mb-4">Settings</h2>

            <div className="space-y-1">
              <Link
                to="/history"
                onClick={() => setShowSettings(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary transition-colors"
              >
                <History className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">History</span>
              </Link>

              <button
                onClick={async () => { await signOut(); setShowSettings(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary transition-colors text-left text-destructive"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Log out</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}

function MyReviewItem({ r, likes }: { r: any; likes: number }) {
  return (
    <Link to={`/films/${r.film_id}`} className="block hover:opacity-80 transition-opacity">
      <div className="flex items-center gap-3">
        <div className="w-12 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {r.film?.thumbnail_url ? (
            <img src={r.film.thumbnail_url} alt={r.film.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-xs">🎬</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-sm line-clamp-1">{r.film?.title}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {likes > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ThumbsUp className="w-3 h-3" />{likes}
                </span>
              )}
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn("w-3 h-3", s <= Math.round(r.rating / 2) ? "text-primary fill-primary" : "text-muted-foreground/30")} />
                ))}
              </div>
            </div>
          </div>
          {r.review && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.review}</p>}
          <span className="text-xs text-muted-foreground/60">
            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Link>
  );
}
