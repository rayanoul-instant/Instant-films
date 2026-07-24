import { useState, useEffect } from 'react';
import heroBg from '@/assets/hero-bg.png';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Star, ArrowRight, TrendingUp, Sparkles, MessageSquare, ThumbsUp } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { FilmCard } from '@/components/films/FilmCard';
import { AvatarDisplay } from '@/components/films/AvatarDisplay';
import { Button } from '@/components/ui/button';
import { useFeaturedFilms, useFilms, useTopReviews, useRecommendations } from '@/hooks/useFilms';
import { useAuth } from '@/hooks/useAuth';
import { usePageMeta } from '@/hooks/usePageMeta';
import logoInstant from '@/assets/logo-instant.png';

const Index = () => {
  usePageMeta(
    'Instant Films - The streaming platform dedicated to short films',
    'Instant Films is the streaming platform dedicated to the best short films. Discover, rate and share films with a community of cinema lovers.'
  );
  const { user } = useAuth();
  const { data: popularFilms, isLoading: loadingPopular } = useFilms({ sortBy: 'popular' });
  const { data: featuredFilms } = useFeaturedFilms();
  const { data: recommendations, isLoading: loadingRec } = useRecommendations();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 200);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Layout showNavLogo={scrolled}>
      {/* Hero with large logo */}
      <section className="relative flex items-center justify-center py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background" />
        </div>
        <div className="container relative z-10 px-4 text-center">
          <motion.img
            src={logoInstant}
            alt="Instant Films"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: scrolled ? 0 : 1, scale: scrolled ? 0.5 : 1, y: scrolled ? -100 : 0 }}
            transition={{ duration: 0.5 }}
            className="h-44 md:h-64 mx-auto mb-6 object-contain"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-3xl md:text-5xl font-extrabold mb-2 tracking-tight">
              Join a community of <span className="text-gradient-gold">short film lovers</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
              Watch • Explore • Share
            </p>
          </motion.div>
        </div>
      </section>

      {/* Popular Films */}
      <section className="py-8">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Popular</h2>
            </div>
            <Link to="/search?sortBy=popular">
              <Button variant="ghost" size="sm" className="text-primary text-sm">
                See all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {loadingPopular ? (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-64 flex-shrink-0 aspect-[16/9] rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {popularFilms?.slice(0, 8).map((film) => (
                <div key={film.id} className="w-64 md:w-72 flex-shrink-0">
                  <FilmCard film={film} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recommended / Featured */}
      <section className="py-8 bg-card/30">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-bold">Recommended for you</h2>
            </div>
            <Link to="/search">
              <Button variant="ghost" size="sm" className="text-primary text-sm">
                See all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {loadingRec ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[16/9] rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(recommendations || featuredFilms)?.slice(0, 4).map((film) => (
                <FilmCard key={film.id} film={film} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Top Reviews */}
      <section className="py-8">
        <div className="container px-4">
          <div className="flex items-center gap-2 mb-5">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Top Reviews</h2>
          </div>
          <TopReviews />
        </div>
      </section>

      {/* CTA if not logged in */}
      {!user && (
        <section className="py-8">
          <div className="container px-4">
            <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-transparent border border-border p-6 text-center">
              <h2 className="text-xl font-bold mb-2">Join Instant</h2>
              <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
                Create your account and start discovering exceptional short films.
              </p>
              <Link to="/auth">
                <Button className="btn-cinema">
                  <span>Create an account</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

function TopReviews() {
  const { data: reviews = [], isLoading } = useTopReviews(3);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="cinema-card p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-2/3 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <p className="text-center text-muted-foreground text-sm py-8">
        No highly liked reviews yet. Be the first!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review: any) => (
        <motion.div
          key={review.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="cinema-card p-4"
        >
          <div className="flex items-start gap-3">
            <AvatarDisplay
              color={review.profile?.avatar_accessories?.color}
              hat={review.profile?.avatar_accessories?.hat}
              glasses={review.profile?.avatar_accessories?.glasses}
              mask={review.profile?.avatar_accessories?.mask}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <Link to={`/user/${review.user_id}`} className="font-semibold text-sm hover:text-primary transition-colors">
                  {review.profile?.username || 'User'}
                </Link>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ThumbsUp className="w-3 h-3" />{review.likesCount}
                  </span>
                  <div className="flex items-center gap-1 text-primary">
                    <Star className="w-3 h-3 fill-primary" />
                    <span className="text-xs font-medium">{Math.round(review.rating / 2)}/5</span>
                  </div>
                </div>
              </div>
              {review.review && (
                <p className="text-sm text-muted-foreground line-clamp-2">{review.review}</p>
              )}
              <Link
                to={`/films/${review.film_id}`}
                className="text-xs text-primary hover:underline mt-1 inline-block"
              >
                {review.film?.title || 'View film'} →
              </Link>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default Index;
