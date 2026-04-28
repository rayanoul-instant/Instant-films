import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Heart, Users, ThumbsUp, ChevronDown, MessageCircle, Eye } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { FilmCard } from '@/components/films/FilmCard';
import { AvatarDisplay } from '@/components/films/AvatarDisplay';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useFriendsCount, useFriendRequestStatus, useSendFriendRequest, useToggleFollow } from '@/hooks/useFollowers';
import { useUserProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: friendsCount = 0 } = useFriendsCount(id!);
  const { data: friendStatus = 'none' } = useFriendRequestStatus(id!);
  const sendRequestMutation = useSendFriendRequest();
  const toggleFollowMutation = useToggleFollow();
  const { data: profileData, isLoading: loading } = useUserProfile(id!);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const profile = profileData?.profile;
  const ratings = profileData?.ratings || [];
  const watchCount = profileData?.watchCount || 0;
  const favorites = profileData?.favorites || [];

  const handleFollow = () => {
    if (!user) { toast.error('Sign in to follow users'); return; }
    if (friendStatus === 'friends') {
      toggleFollowMutation.mutate(id!);
    } else if (friendStatus === 'none') {
      sendRequestMutation.mutate(id!, {
        onSuccess: () => toast.success('Friend request sent!'),
        onError: () => toast.error('Could not send request'),
      });
    }
  };

  // Sort reviews: most liked first
  const sortedByLikes = [...ratings].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
  const topReview = sortedByLikes[0];
  const recentReviews = showAllReviews ? ratings.slice(1) : ratings.slice(1, 4);

  const avgRating = ratings.length
    ? (ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length / 2).toFixed(1)
    : null;

  const topFavorites = favorites.slice(0, 3);

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

  if (!profile) {
    return (
      <Layout>
        <div className="container px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">User not found</h1>
          <Link to="/search"><Button>Back to search</Button></Link>
        </div>
      </Layout>
    );
  }

  const avatarColor = profile.avatar_accessories?.color || '#7C3AED';
  const avatarHat = profile.avatar_accessories?.hat;
  const avatarGlasses = profile.avatar_accessories?.glasses;
  const avatarMask = profile.avatar_accessories?.mask;

  return (
    <Layout>
      <div className="container px-4 py-8 max-w-3xl mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cinema-card p-6 md:p-8 mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <AvatarDisplay
              color={avatarColor}
              hat={avatarHat}
              glasses={avatarGlasses}
              mask={avatarMask}
              size="xl"
            />

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                <div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold mb-1">
                    {profile.username}
                  </h1>
                  {profile.bio && (
                    <p className="text-muted-foreground text-sm">{profile.bio}</p>
                  )}
                </div>
                {user && user.id !== id && (
                  <div className="flex gap-2">
                    <Button
                      variant={friendStatus === 'none' ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleFollow}
                      disabled={friendStatus === 'pending_sent'}
                      className={friendStatus === 'none' ? 'btn-cinema' : 'border-border'}
                    >
                      {friendStatus === 'friends' ? 'Friends' : friendStatus === 'pending_sent' ? 'Request sent' : 'Add friend'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/messages?with=${id}`)}
                      className="border-border"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" /> Message
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-6">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{friendsCount}</span>
                  <span className="text-muted-foreground text-sm">friends</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{watchCount}</span>
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
        </motion.div>

        {/* Top 3 Favorites */}
        {topFavorites.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-accent fill-accent" />
              Top 3 Favorites
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topFavorites.map((fav) => fav.film && (
                <FilmCard key={fav.id} film={fav.film} isTop3 />
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-primary fill-primary" />
            Reviews
          </h2>

          {ratings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {/* Top liked review */}
              {topReview && (
                <div className="cinema-card p-4 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="w-3.5 h-3.5 text-primary fill-primary" />
                    <span className="text-xs text-primary font-medium">Most liked</span>
                  </div>
                  <ReviewItem r={topReview} likes={0} />
                </div>
              )}

              {/* More reviews */}
              {ratings.length > 1 && (
                <>
                  {recentReviews.map((r) => (
                    <div key={r.id} className="cinema-card p-4">
                      <ReviewItem r={r} likes={0} />
                    </div>
                  ))}

                  {ratings.length > 4 && (
                    <button
                      onClick={() => setShowAllReviews(!showAllReviews)}
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown className={cn("w-4 h-4 transition-transform", showAllReviews && "rotate-180")} />
                      {showAllReviews ? 'Show less' : `Show ${ratings.length - 4} more reviews`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ReviewItem({ r, likes }: { r: any; likes: number }) {
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
              <div className="flex items-center gap-1">
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
