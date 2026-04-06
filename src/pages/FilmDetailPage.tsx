import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Calendar, User, Star, Bookmark, Share2, ThumbsUp, MessageSquare, Film, ArrowUpRight, Send } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { VideoPlayer } from '@/components/films/VideoPlayer';
import { StarRating } from '@/components/films/StarRating';
import { AvatarDisplay } from '@/components/films/AvatarDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useFilm, useFilmRatings, useRateFilm, useToggleFavorite, useFavorites, useAddToHistory } from '@/hooks/useFilms';
import { useAuth } from '@/hooks/useAuth';
import { useFollowingList } from '@/hooks/useFollowers';
import { GENRE_LABELS } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

// Hook for review likes
function useReviewLikes(filmId: string) {
  return useQuery({
    queryKey: ['review-likes', filmId],
    queryFn: async () => {
      const { data } = await supabase.from('review_likes').select('*');
      return data || [];
    },
  });
}

function useToggleReviewLike() {
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
        await supabase.from('review_likes').insert({ user_id: user.id, rating_id: ratingId });
      }
      return filmId;
    },
    onSuccess: (filmId) => {
      queryClient.invalidateQueries({ queryKey: ['review-likes', filmId] });
    },
  });
}

export default function FilmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const { data: film, isLoading } = useFilm(id!);
  const { data: ratings } = useFilmRatings(id!);
  const { data: favorites } = useFavorites();
  const { data: reviewLikes } = useReviewLikes(id!);
  const { data: followingList } = useFollowingList();
  const rateFilm = useRateFilm();
  const toggleFavorite = useToggleFavorite();
  const addToHistory = useAddToHistory();
  const toggleReviewLike = useToggleReviewLike();

  const [userRating, setUserRating] = useState(0);
  const [review, setReview] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const isFavorited = favorites?.some((f) => f.film_id === id);

  const handleRate = async () => {
    if (!user) { toast.error('Sign in to rate this film'); return; }
    if (userRating === 0) { toast.error('Please select a rating'); return; }
    try {
      // Store rating on /10 scale internally, convert from /5
      await rateFilm.mutateAsync({ filmId: id!, rating: userRating * 2, review: review || undefined });
      toast.success('Your rating has been saved');
      setShowReviewForm(false);
      setReview('');
    } catch {
      toast.error('Failed to save rating');
    }
  };

  const handleFavorite = () => {
    if (!user) { toast.error('Sign in to add to favorites'); return; }
    toggleFavorite.mutate(id!);
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const handleSendFilm = async (receiverId: string, receiverUsername: string) => {
    if (!user || !film) return;
    const filmUrl = `${window.location.origin}/films/${id}`;
    const message = `🎬 [film:${id}:${film.title}:${film.thumbnail_url || ''}]`;
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content: message,
    });
    toast.success(`Film shared with ${receiverUsername}!`);
    setShowShareModal(false);
  };

  const handlePlay = () => { if (user) addToHistory.mutate(id!); };

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
    <Layout>
      <div className="container px-4 py-8">
        <Link to="/search" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to catalog
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <VideoPlayer src={film.video_url} poster={film.thumbnail_url || undefined} onPlay={handlePlay} />
        </motion.div>

        {/* Title + meta */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{film.title}</h1>
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
              className={cn("border-border flex-shrink-0", isFavorited && "bg-accent/20 text-accent border-accent")}
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
              <span className="font-medium">{displayAvgRating > 0 ? displayAvgRating.toFixed(1) : 'N/A'}/5</span>
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
        </div>

        {film.synopsis && (
          <div className="mb-8">
            <h2 className="font-display text-xl font-semibold mb-3">Synopsis</h2>
            <p className="text-muted-foreground leading-relaxed">{film.synopsis}</p>
          </div>
        )}

        {/* ===== ACTION BUTTONS: RATE & REVIEW / SHARE ===== */}
        <div className="flex gap-3 mb-8">
          <Button
            onClick={() => setShowReviewForm(true)}
            className="btn-cinema flex-1"
            size="lg"
          >
            <Star className="w-4 h-4 mr-2 fill-primary-foreground" />
            Rate & Review
          </Button>
          <Button
            onClick={() => {
              if (!user) { toast.error('Sign in to share'); return; }
              setShowShareModal(true);
            }}
            variant="outline"
            size="lg"
            className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Rating/Review Form */}
        {showReviewForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="cinema-card p-6 mb-8"
          >
            <h3 className="font-display text-lg font-semibold mb-4">Rate & Review</h3>
            {user ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Your rating</p>
                  <StarRating rating={userRating} size="lg" interactive onRatingChange={setUserRating} />
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
                  <Button variant="outline" onClick={() => setShowReviewForm(false)} className="border-border">Cancel</Button>
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
              <p className="text-sm text-muted-foreground mb-3"><span className="font-bold text-foreground">Send</span> to someone you follow:</p>
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
                        face={u.avatar_accessories?.face}
                        extra={u.avatar_accessories?.extra}
                      />
                      <span className="text-sm font-medium">{u.username}</span>
                      <span className="ml-auto flex items-center justify-center gap-1 text-xs text-primary font-medium">
                        <Send className="w-3 h-3" /> Send
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
                          face={(rating.profile as any)?.avatar_accessories?.face}
                          extra={(rating.profile as any)?.avatar_accessories?.extra}
                        />
                      </Link>
                      <div>
                        <Link to={`/user/${rating.user_id}`} className="font-semibold text-sm hover:text-primary transition-colors">
                          {rating.profile?.username || 'User'}
                        </Link>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={cn("w-3 h-3", s <= Math.round(rating.rating / 2) ? "text-primary fill-primary" : "text-muted-foreground/30")} />
                          ))}
                          <span className="text-xs text-muted-foreground ml-1">{(rating.rating / 2).toFixed(1)}/5</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(rating.created_at), { addSuffix: true })}
                      </span>
                      {rating.user_id !== user?.id && (
                        <button
                          onClick={() => {
                            if (!user) { toast.error('Sign in to like reviews'); return; }
                            toggleReviewLike.mutate({ ratingId: rating.id, filmId: id! });
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
  );
}
