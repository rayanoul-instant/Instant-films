import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Calendar, User, Star, Bookmark, Share2, ThumbsUp, MessageSquare, Film, ArrowUpRight, Send, Trophy, Trash2, Pencil, Check, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { VideoPlayer } from '@/components/films/VideoPlayer';
import { StarRating } from '@/components/films/StarRating';
import { AvatarDisplay } from '@/components/films/AvatarDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useFilm, useFilmRatings, useRateFilm, useToggleFavorite, useFavorites, useAddToHistory, useTop3, useToggleTop3, useReviewLikes, useToggleReviewLike, useToggleMainstream, useDeleteFilm, useDeleteRating, useUpdateFilmTitle } from '@/hooks/useFilms';
import { useAuth } from '@/hooks/useAuth';
import { useFollowingList } from '@/hooks/useFollowers';
import { GENRE_LABELS, FilmGenre, getFilmTitle } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePageMeta } from '@/hooks/usePageMeta';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

const SYNOPSIS_NOISE = [
  /submit your (short )?film/i,
  /https?:\/\/\S+/,
  /subscribe/i,
  /abonnez-vous/i,
  /shortverse\.com/i,
  /shortoftheweek\.com/i,
  /watch more/i,
  /follow us/i,
];

function isSynopsisClean(synopsis: string | null | undefined): boolean {
  if (!synopsis || synopsis.length < 20) return false;
  return !SYNOPSIS_NOISE.some((p) => p.test(synopsis));
}

export default function FilmDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { data: film, isLoading } = useFilm(slug!);
  const filmId = film?.id || '';
  const { data: ratings } = useFilmRatings(filmId);
  const { data: favorites } = useFavorites();
  const { data: reviewLikes } = useReviewLikes(filmId);
  const { data: followingList } = useFollowingList();
  const rateFilm = useRateFilm();
  const toggleFavorite = useToggleFavorite();
  const addToHistory = useAddToHistory();
  const { data: top3 } = useTop3();
  const toggleTop3 = useToggleTop3();
  const toggleReviewLike = useToggleReviewLike();
  const toggleMainstream = useToggleMainstream();
  const deleteFilm = useDeleteFilm();
  const deleteRating = useDeleteRating();
  const updateFilmTitle = useUpdateFilmTitle();
  const queryClient = useQueryClient();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const isAdmin = profile?.is_admin === true;
  usePageMeta(
    film ? `${getFilmTitle(film)} - Instant Films` : 'Instant Films',
    film?.synopsis || 'Watch this short film on Instant Films.'
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [userRating, setUserRating] = useState(0);
  const [review, setReview] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [showTop3Popup, setShowTop3Popup] = useState(false);
  const rateRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isFavorited = favorites?.some((f) => f.film_id === filmId);

  const handleRate = async () => {
    if (!user) { toast.error('Sign in to rate this film'); return; }
    if (userRating === 0) { toast.error('Please select a rating'); return; }
    try {
      // Store rating on /10 scale internally, convert from /5
      await rateFilm.mutateAsync({ filmId: filmId, rating: userRating * 2, review: review || undefined });
      toast.success('Your rating has been saved');
      setShowReviewForm(false);
      setReview('');
    } catch {
      toast.error('Failed to save rating');
    }
  };

  const handleFavorite = () => {
    if (!user) { toast.error('Sign in to add to favorites'); return; }
    toggleFavorite.mutate(filmId);
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const handleSendFilm = async (receiverId: string, receiverUsername: string) => {
    if (!user || !film) return;
    const filmUrl = `${window.location.origin}/films/${filmId}`;
    const message = `🎬 [film:${filmId}:${getFilmTitle(film)}:${film.thumbnail_url || ''}]`;
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content: message,
    });
    toast.success(`Film shared with ${receiverUsername}!`);
    setSentTo(prev => new Set(prev).add(receiverId));
  };

  const handlePlay = () => { if (user) addToHistory.mutate(filmId); };

  const isInTop3 = top3?.some(f => f.film_id === filmId) || false;

  const handleTop3 = () => {
    if (!user) { toast.error('Sign in to manage your Top 3'); return; }
    if (isInTop3) {
      toggleTop3.mutate(filmId);
      return;
    }
    if ((top3?.length || 0) < 3) {
      toggleTop3.mutate(filmId);
      toast.success('Added to your Top 3!');
      return;
    }
    setShowTop3Popup(true);
  };

  const handleReplaceTop3 = async (replaceFilmId: string) => {
    await toggleTop3.mutateAsync(replaceFilmId);
    await toggleTop3.mutateAsync(filmId);
    toast.success('Top 3 updated!');
    setShowTop3Popup(false);
  };

  const getLikesForRating = (ratingId: string) => 
    reviewLikes?.filter(l => l.rating_id === ratingId).length || 0;
  
  const isLikedByMe = (ratingId: string) =>
    reviewLikes?.some(l => l.rating_id === ratingId && l.user_id === user?.id) || false;

  if (isLoading) {
    return (
      <Layout>
        <div className="container px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="aspect-video rounded-xl mb-8" />
          <Skeleton className="h-10 w-2/3 mb-4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Layout>
    );
  }

  if (!film) {
    return (
      <Layout>
        <div className="container px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Film not found</h1>
          <Link to="/search"><Button>Back to catalog</Button></Link>
        </div>
      </Layout>
    );
  }

  // Display rating on /5 scale
  const displayAvgRating = film.average_rating ? film.average_rating / 2 : 0;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            "name": getFilmTitle(film),
            "description": isSynopsisClean(film.synopsis) ? film.synopsis : undefined,
            "duration": film.duration_minutes ? `PT${film.duration_minutes}M` : undefined,
            "thumbnailUrl": film.thumbnail_url || undefined,
            "uploadDate": film.release_year ? `${film.release_year}-01-01` : undefined,
            "director": film.director ? { "@type": "Person", "name": film.director } : undefined,
            "genre": (film.genres || []).map(g => GENRE_LABELS[g as FilmGenre]).filter(Boolean),
            "url": `${window.location.origin}/films/${film.slug}`,
            "embedUrl": film.video_url || undefined,
          }),
        }}
      />
      <Layout>
      <div className="container px-4 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <VideoPlayer
            src={film.video_url}
            poster={film.thumbnail_url || undefined}
            durationMinutes={film.duration_minutes}
            onPlay={handlePlay}
            onRate={() => {
              setShowReviewForm(true);
              setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
            }}
            onShare={() => {
              if (!user) { toast.error('Sign in to share'); return; }
              setShowShareModal(true);
              setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
            }}
          />
        </motion.div>

        {/* Title + meta */}
        <div className="mb-6">
          <div className="flex flex-row items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              {isAdmin && editingTitle ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    autoFocus
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === 'Enter') {
                        await updateFilmTitle.mutateAsync({ filmId: film.id, displayTitle: titleDraft.trim() });
                        setEditingTitle(false);
                        toast.success('Title updated');
                      }
                      if (e.key === 'Escape') setEditingTitle(false);
                    }}
                    className="flex-1 font-display text-2xl font-bold bg-secondary border border-primary rounded-lg px-3 py-1 outline-none text-foreground"
                  />
                  <button
                    onClick={async () => {
                      await updateFilmTitle.mutateAsync({ filmId: film.id, displayTitle: titleDraft.trim() });
                      setEditingTitle(false);
                      toast.success('Title updated');
                    }}
                    className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingTitle(false)}
                    className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2 group/title">
                  <h1 className="font-display text-3xl md:text-4xl font-bold">{getFilmTitle(film)}</h1>
                  {isAdmin && (
                    <button
                      onClick={() => { setTitleDraft(getFilmTitle(film)); setEditingTitle(true); }}
                      className="opacity-0 group-hover/title:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-primary"
                      title="Edit title"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
              {film.director && (
                <p className="text-lg text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />{film.director}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleFavorite}
              className={cn("border-border flex-shrink-0 mt-1", isFavorited && "bg-accent/20 text-accent border-accent")}
            >
              <Bookmark className={cn("w-5 h-5", isFavorited && "fill-accent")} />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />{film.duration_minutes} min
            </div>
            {film.release_year && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />{film.release_year}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="font-medium">{displayAvgRating > 0 ? (displayAvgRating % 1 === 0 ? String(displayAvgRating) : displayAvgRating.toFixed(1)) : 'N/A'}/5</span>
              <span className="text-muted-foreground">({ratings?.length || 0} reviews)</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(film.genres || []).map((genre) => (
              <Badge key={genre} variant="secondary" className="bg-secondary text-secondary-foreground">
                {GENRE_LABELS[genre]}
              </Badge>
            ))}
          </div>

          {isAdmin && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => toggleMainstream.mutate({ filmId: film.id, genres: film.genres || [] })}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  (film.genres || []).includes('mainstream')
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 hover:bg-yellow-500/30'
                    : 'bg-secondary border-border text-muted-foreground hover:border-yellow-500 hover:text-yellow-400'
                )}
              >
                {(film.genres || []).includes('mainstream') ? '★ Mainstream (remove)' : '☆ Mark as Mainstream'}
              </button>
              <button
                onClick={() => toggleMainstream.mutate({ filmId: film.id, genres: film.genres || [], tag: 'kid' })}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  (film.genres || []).includes('kid')
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400 hover:bg-blue-500/30'
                    : 'bg-secondary border-border text-muted-foreground hover:border-blue-500 hover:text-blue-400'
                )}
              >
                {(film.genres || []).includes('kid') ? '★ Kid (remove)' : '☆ Mark as Kid'}
              </button>

              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
                >
                  🗑 Delete
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-destructive font-medium">Confirm?</span>
                  <button
                    onClick={async () => {
                      await deleteFilm.mutateAsync(film.id);
                      navigate('/search');
                    }}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {film.synopsis && isSynopsisClean(film.synopsis) && (
          <div className="mb-8">
            <h2 className="font-display text-xl font-semibold mb-3">Synopsis</h2>
            <p className="text-muted-foreground leading-relaxed">{film.synopsis}</p>
          </div>
        )}

        {/* ===== ACTION BUTTONS: RATE & REVIEW / SHARE / TOP 3 ===== */}
        <div ref={rateRef} className="flex gap-3 mb-8">
          <Button
            onClick={() => {
              if (showReviewForm) { setShowReviewForm(false); return; }
              setShowShareModal(false);
              setShowReviewForm(true);
              setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
            }}
            size="lg"
            className={`btn-cinema flex-1 transition-all ${showReviewForm ? 'brightness-75' : ''}`}
          >
            <Star className="w-4 h-4 mr-2 fill-primary-foreground" />
            Rate & Review
          </Button>
          <Button
            onClick={() => {
              if (!user) { toast.error('Sign in to share'); return; }
              if (showShareModal) { setShowShareModal(false); return; }
              setShowReviewForm(false);
              setShowShareModal(true);
              setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
            }}
            size="lg"
            className={`btn-cinema flex-1 transition-all ${showShareModal ? 'brightness-75' : ''}`}
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Top 3 replacement popup */}
        {showTop3Popup && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="cinema-card p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">Replace a Top 3 film</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowTop3Popup(false)}>✕</Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Your Top 3 is full. Which film do you want to replace?</p>
            <div className="space-y-2">
              {(top3 || []).map((fav) => fav.film && (
                <button
                  key={fav.id}
                  onClick={() => handleReplaceTop3(fav.film_id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-muted transition-colors text-left"
                >
                  <div className="w-12 h-8 rounded overflow-hidden flex-shrink-0 bg-muted">
                    {fav.film.thumbnail_url && <img src={fav.film.thumbnail_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="flex-1 text-sm font-medium truncate">{getFilmTitle(fav.film)}</span>
                  <span className="text-xs text-destructive font-medium">Replace</span>
                </button>
              ))}
            </div>
            <Button variant="outline" className="mt-4 w-full border-border" onClick={() => setShowTop3Popup(false)}>
              Cancel
            </Button>
          </motion.div>
        )}

        {/* Rating/Review Form */}
        {showReviewForm && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="cinema-card p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">Rate & Review</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowReviewForm(false)}>✕</Button>
            </div>
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Your rating</p>
                    <StarRating rating={userRating} size="lg" interactive onRatingChange={setUserRating} />
                  </div>
                  <button
                    onClick={handleTop3}
                    className="flex flex-col items-center gap-1 group flex-shrink-0"
                    title={isInTop3 ? 'Remove from Top 3' : 'Add to Top 3'}
                  >
                    <Trophy className={cn('w-7 h-7 transition-all', isInTop3 ? 'text-yellow-400' : 'text-muted-foreground group-hover:text-yellow-400')} />
                    <span className="text-xs text-muted-foreground">Top 3</span>
                  </button>
                </div>
                <Textarea
                  placeholder="Write your review (optional)..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="bg-secondary border-border"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={handleRate} className="btn-cinema flex-1">Submit</Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                <Link to="/auth" className="text-primary hover:underline">Sign in</Link>{' '}to rate this film
              </p>
            )}
          </motion.div>
        )}

        {/* Share Modal - shows following list */}
        {showShareModal && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="cinema-card p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">Share this film</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowShareModal(false)}>✕</Button>
            </div>
            <Button variant="outline" className="w-full mb-4 border-border" onClick={handleShareLink}>
              <Share2 className="w-4 h-4 mr-2" />
              Copy link to clipboard
            </Button>
            <div>
              <p className="text-sm text-muted-foreground mb-3"><span className="font-bold text-foreground">Send</span> to a friend:</p>
              {(followingList || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">You're not following anyone yet.</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {followingList?.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSendFilm(u.id, u.username)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary hover:bg-muted transition-colors text-left"
                    >
                      <AvatarDisplay
                        size="sm"
                        color={u.avatar_accessories?.color}
                        hat={u.avatar_accessories?.hat}
                        glasses={u.avatar_accessories?.glasses}
                        mask={u.avatar_accessories?.mask}
                      />
                      <span className="text-sm font-medium">{u.username}</span>
                      <span className={cn("ml-auto flex items-center justify-center gap-1 text-xs font-medium", sentTo.has(u.id) ? "text-muted-foreground" : "text-primary")}>
                        <Send className="w-3 h-3" /> {sentTo.has(u.id) ? 'Sent' : 'Send'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Reviews Section */}
        <div>
          <h2 className="font-display text-xl font-semibold mb-4">
            Reviews <span className="text-muted-foreground font-normal text-base">({ratings?.length || 0})</span>
          </h2>
          {ratings && ratings.length > 0 ? (
            <div className="space-y-4">
              {ratings.slice(0, 8).map((rating) => (
                <div key={rating.id} className="cinema-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Link to={`/user/${rating.user_id}`}>
                        <AvatarDisplay
                          size="sm"
                          color={(rating.profile as any)?.avatar_accessories?.color}
                          hat={(rating.profile as any)?.avatar_accessories?.hat}
                          glasses={(rating.profile as any)?.avatar_accessories?.glasses}
                          mask={(rating.profile as any)?.avatar_accessories?.mask}
                        />
                      </Link>
                      <div>
                        <Link to={`/user/${rating.user_id}`} className="font-semibold text-sm hover:text-primary transition-colors">
                          {rating.profile?.username || 'User'}
                        </Link>
                        <div className="mt-0.5">
                          <StarRating rating={rating.rating / 2} size="sm" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(rating.created_at), { addSuffix: true })}
                      </span>
                      {rating.user_id === user?.id ? (
                        <button
                          onClick={() => {
                            if (confirm('Delete your review?')) {
                              deleteRating.mutate({ ratingId: rating.id, filmId: filmId });
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (!user) { toast.error('Sign in to like reviews'); return; }
                            toggleReviewLike.mutate({ ratingId: rating.id, filmId: filmId });
                          }}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors",
                            isLikedByMe(rating.id)
                              ? "bg-primary/15 text-primary"
                              : "bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary"
                          )}
                        >
                          <ThumbsUp className={cn("w-3.5 h-3.5", isLikedByMe(rating.id) && "fill-primary")} />
                          {getLikesForRating(rating.id) > 0 && <span>{getLikesForRating(rating.id)}</span>}
                        </button>
                      )}
                    </div>
                  </div>
                  {rating.review && (
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{rating.review}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Film className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No reviews yet. Be the first!</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
    </>
  );
}
