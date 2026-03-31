import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Star, Clock, Bookmark, Edit2, Save, Film, ChevronDown, ThumbsUp, Check, X, Plus, Eye, Trophy } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { FilmCard } from '@/components/films/FilmCard';
import { AvatarDisplay, AVATAR_COLORS, AVATAR_HATS, AVATAR_FACE, AVATAR_EXTRAS } from '@/components/films/AvatarDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites, useWatchHistory, useFilms, useToggleFavorite } from '@/hooks/useFilms';
import { useFriendsCount } from '@/hooks/useFollowers';
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
  const { user, profile, loading, updateProfile } = useAuth();
  const { data: favorites } = useFavorites();
  const { data: history } = useWatchHistory();
  const { data: allFilms } = useFilms();
  const { data: myRatings } = useMyRatings(user?.id);
  const { data: reviewLikes } = useMyReviewLikes(user?.id);
  const { data: friendsCount = 0 } = useFriendsCount(user?.id || '');
  const toggleFavorite = useToggleFavorite();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<'profile' | 'avatar' | 'top3'>('profile');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [avatarColor, setAvatarColor] = useState('#7C3AED');
  const [avatarHat, setAvatarHat] = useState('none');
  const [avatarFace, setAvatarFace] = useState('none');
  const [avatarExtra, setAvatarExtra] = useState('none');
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
    const acc = profile?.avatar_accessories as any;
    setEditUsername(profile?.username || '');
    setEditBio(profile?.bio || '');
    setAvatarColor(acc?.color || '#7C3AED');
    setAvatarHat(acc?.hat || 'none');
    setAvatarFace(acc?.face || 'none');
    setAvatarExtra(acc?.extra || 'none');
    setEditTab('profile');
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) { toast.error('Username cannot be empty'); return; }
    const { error } = await updateProfile({
      username: editUsername,
      bio: editBio,
      avatar_accessories: { color: avatarColor, hat: avatarHat, face: avatarFace, extra: avatarExtra } as any,
    });
    if (error) { toast.error('Failed to update profile'); }
    else { toast.success('Profile updated!'); setIsEditing(false); }
  };

  const handleToggleTop3 = async (filmId: string) => {
    await toggleFavorite.mutateAsync(filmId);
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
  };

  const getLikes = (ratingId: string) =>
    reviewLikes?.filter(l => l.rating_id === ratingId).length || 0;

  const avgRating = myRatings && myRatings.length
    ? (myRatings.reduce((s, r) => s + r.rating, 0) / myRatings.length / 2).toFixed(1)
    : null;

  const topFavorites = favorites?.slice(0, 3) || [];
  const sortedReviews = [...(myRatings || [])].sort(
    (a, b) => getLikes(b.id) - getLikes(a.id)
  );
  const topReview = sortedReviews[0];
  const moreReviews = showAllReviews ? sortedReviews.slice(1) : sortedReviews.slice(1, 4);

  const currentAcc = profile?.avatar_accessories as any;

  // Films available for Top 3 search (not already in favorites)
  const favoriteFilmIds = new Set(favorites?.map(f => f.film_id) || []);
  const filteredSearchFilms = (allFilms || []).filter(f =>
    !favoriteFilmIds.has(f.id) &&
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
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit">
                {(['profile', 'avatar', 'top3'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setEditTab(tab)}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-medium transition-all",
                      editTab === tab
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === 'profile' ? 'Profile' : tab === 'avatar' ? 'Avatar' : 'Top 3'}
                  </button>
                ))}
              </div>

              {/* Profile Tab */}
              {editTab === 'profile' && (
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <AvatarDisplay
                    color={avatarColor}
                    hat={avatarHat === 'none' ? undefined : avatarHat}
                    face={avatarFace === 'none' ? undefined : avatarFace}
                    extra={avatarExtra === 'none' ? undefined : avatarExtra}
                    size="xl"
                  />
                  <div className="flex-1 space-y-4 w-full">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Username</label>
                      <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="bg-secondary border-border" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Bio</label>
                      <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="bg-secondary border-border" placeholder="Tell us about yourself..." rows={2} />
                    </div>
                  </div>
                </div>
              )}

              {/* Avatar Tab */}
              {editTab === 'avatar' && (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <AvatarDisplay
                      color={avatarColor}
                      hat={avatarHat === 'none' ? undefined : avatarHat}
                      face={avatarFace === 'none' ? undefined : avatarFace}
                      extra={avatarExtra === 'none' ? undefined : avatarExtra}
                      size="xl"
                    />
                  </div>
                  {/* Color */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Color</p>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setAvatarColor(c.value)}
                          title={c.label}
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
                  {/* Hat */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Hat</p>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_HATS.map((h) => (
                        <button key={h.id} onClick={() => setAvatarHat(h.id)}
                          className={cn("px-3 py-1.5 rounded-lg text-sm border transition-all",
                            avatarHat === h.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:border-muted-foreground"
                          )}>
                          {h.emoji || '—'} {h.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Face */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Face accessory</p>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_FACE.map((f) => (
                        <button key={f.id} onClick={() => setAvatarFace(f.id)}
                          className={cn("px-3 py-1.5 rounded-lg text-sm border transition-all",
                            avatarFace === f.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:border-muted-foreground"
                          )}>
                          {f.emoji || '—'} {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Extra */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Extra</p>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_EXTRAS.map((e) => (
                        <button key={e.id} onClick={() => setAvatarExtra(e.id)}
                          className={cn("px-3 py-1.5 rounded-lg text-sm border transition-all",
                            avatarExtra === e.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:border-muted-foreground"
                          )}>
                          {e.emoji || '—'} {e.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Top 3 Tab */}
              {editTab === 'top3' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Choose up to 3 favorite films to display on your profile. You currently have {favorites?.length || 0} favorites — the first 3 will be shown.</p>

                  {/* Current top 3 */}
                  <div className="space-y-2">
                    {topFavorites.map((fav, i) => fav.film && (
                      <div key={fav.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                        <span className="text-primary font-bold text-sm">#{i + 1}</span>
                        <div className="w-10 h-7 rounded overflow-hidden flex-shrink-0 bg-muted">
                          {fav.film.thumbnail_url && <img src={fav.film.thumbnail_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <span className="flex-1 text-sm font-medium truncate">{fav.film.title}</span>
                        <button
                          onClick={() => handleToggleTop3(fav.film_id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {topFavorites.length < 3 && (
                      <div className="border border-dashed border-border rounded-lg p-3">
                        <Input
                          placeholder="Search a film to add..."
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
              )}

              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} className="btn-cinema">
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="border-border">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <AvatarDisplay
                color={currentAcc?.color}
                hat={currentAcc?.hat}
                face={currentAcc?.face}
                extra={currentAcc?.extra}
                size="xl"
              />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-3">
                  <div>
                    <h1 className="font-display text-2xl md:text-3xl font-bold mb-1">
                      {profile?.username || 'User'}
                    </h1>
                    <p className="text-muted-foreground text-sm">{user.email}</p>
                    {profile?.bio && <p className="text-muted-foreground text-sm mt-1">{profile.bio}</p>}
                  </div>
                  <Button variant="outline" size="sm" onClick={openEdit} className="border-border flex-shrink-0">
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </Button>
                </div>

                <div className="flex flex-wrap justify-center sm:justify-start gap-5">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{friendsCount}</span>
                    <span className="text-muted-foreground text-sm">friends</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
