import { useState, useEffect } from 'react';
import heroBg from '@/assets/hero-bg.png';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ArrowRight, TrendingUp, Sparkles, MessageSquare, ThumbsUp, Trophy, Award, Zap, Pencil, Check, RotateCcw } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { FilmCard } from '@/components/films/FilmCard';
import { EditableFilmRow } from '@/components/films/EditableFilmRow';
import { AvatarDisplay } from '@/components/films/AvatarDisplay';
import { Button } from '@/components/ui/button';
import { useFeaturedFilms, useFilms, useTopReviews, useRecommendations, useMustWatch, useFestivalSelection, useSuperShort } from '@/hooks/useFilms';
import { useHomeSections, useDeleteHomeSection } from '@/hooks/useHomeSections';
import { useAuth } from '@/hooks/useAuth';
import { usePageMeta } from '@/hooks/usePageMeta';
import logoInstant from '@/assets/logo-instant.png';
import { Film, HomeSectionWithFilms, HomeSlotKey } from '@/types/database';

function FilmRow({ films, loading }: { films?: Film[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-64 flex-shrink-0 aspect-[16/9] rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
      {films?.slice(0, 10).map((film) => (
        <div key={film.id} className="w-64 md:w-72 flex-shrink-0">
          <FilmCard film={film} />
        </div>
      ))}
    </div>
  );
}

/** En-tête de bande avec bouton "Revenir en automatique" quand une bande par défaut a été curée. */
function RevertToAutoButton({ sectionId }: { sectionId: string }) {
  const deleteSection = useDeleteHomeSection();
  return (
    <button
      onClick={() => deleteSection.mutate(sectionId)}
      disabled={deleteSection.isPending}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
    >
      <RotateCcw className="w-3 h-3" /> Revert to automatic
    </button>
  );
}

const Index = () => {
  usePageMeta(
    'Instant Films - The streaming platform dedicated to short films',
    'Instant Films is the streaming platform dedicated to the best short films. Discover, rate and share films with a community of cinema lovers.'
  );
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;
  const { data: popularFilms, isLoading: loadingPopular } = useFilms({ sortBy: 'popular' });
  const { data: featuredFilms } = useFeaturedFilms();
  const { data: recommendations, isLoading: loadingRec } = useRecommendations();
  const { data: mustWatchFilms, isLoading: loadingMustWatch } = useMustWatch();
  const { data: festivalFilms, isLoading: loadingFestival } = useFestivalSelection();
  const { data: superShortFilms, isLoading: loadingSuperShort } = useSuperShort();
  const { data: homeSections } = useHomeSections();
  const [scrolled, setScrolled] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const curatedBySlot = new Map<HomeSlotKey, HomeSectionWithFilms>();
  const freestandingSections: HomeSectionWithFilms[] = [];
  (homeSections || []).forEach((section) => {
    if (section.slot_key) curatedBySlot.set(section.slot_key, section);
    else freestandingSections.push(section);
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 200);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Layout showNavLogo={scrolled}>
      {/* Hero */}
      <section className="relative flex items-center justify-center py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover object-center blur-sm scale-105 grayscale" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
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
              Join a community of short film lovers
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
              Watch • Explore • Share
            </p>
          </motion.div>
        </div>
      </section>

      {isAdmin && (
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`fixed z-40 bottom-24 right-4 md:bottom-6 md:right-6 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium shadow-lg transition-colors ${
            editMode ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'
          }`}
        >
          {editMode ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          {editMode ? 'Done editing' : 'Edit mode'}
        </button>
      )}

      {/* Popular */}
      <section className="py-4">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">{curatedBySlot.get('popular')?.title || 'Popular'}</h2>
              {editMode && curatedBySlot.get('popular') && <RevertToAutoButton sectionId={curatedBySlot.get('popular')!.id} />}
            </div>
            <Link to="/search?sortBy=popular">
              <Button variant="ghost" size="sm" className="text-primary text-sm">
                See all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <EditableFilmRow
            films={curatedBySlot.get('popular')?.films || popularFilms}
            loading={!curatedBySlot.get('popular') && loadingPopular}
            editMode={editMode && isAdmin}
            isCurated={!!curatedBySlot.get('popular')}
            sectionId={curatedBySlot.get('popular')?.id}
            slotKey="popular"
            sectionTitle={curatedBySlot.get('popular')?.title || 'Popular'}
          />
        </div>
      </section>

      {/* For you — never editable */}
      <section className="py-4 bg-card/30">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">For you</h2>
            </div>
            <Link to="/search">
              <Button variant="ghost" size="sm" className="text-primary text-sm">
                See all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <FilmRow films={recommendations || featuredFilms} loading={loadingRec} />
        </div>
      </section>

      {/* Must Watch */}
      <section className="py-4">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">{curatedBySlot.get('must_watch')?.title || 'Must Watch'}</h2>
              {editMode && curatedBySlot.get('must_watch') && <RevertToAutoButton sectionId={curatedBySlot.get('must_watch')!.id} />}
            </div>
            <Link to="/search?sortBy=rating">
              <Button variant="ghost" size="sm" className="text-primary text-sm">
                See all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <EditableFilmRow
            films={curatedBySlot.get('must_watch')?.films || mustWatchFilms}
            loading={!curatedBySlot.get('must_watch') && loadingMustWatch}
            editMode={editMode && isAdmin}
            isCurated={!!curatedBySlot.get('must_watch')}
            sectionId={curatedBySlot.get('must_watch')?.id}
            slotKey="must_watch"
            sectionTitle={curatedBySlot.get('must_watch')?.title || 'Must Watch'}
          />
        </div>
      </section>

      {/* Festival Selection */}
      <section className="py-4 bg-card/30">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">{curatedBySlot.get('festival_selection')?.title || 'Festival Selection'}</h2>
              {editMode && curatedBySlot.get('festival_selection') && <RevertToAutoButton sectionId={curatedBySlot.get('festival_selection')!.id} />}
            </div>
            <Link to="/search">
              <Button variant="ghost" size="sm" className="text-primary text-sm">
                See all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <EditableFilmRow
            films={curatedBySlot.get('festival_selection')?.films || festivalFilms}
            loading={!curatedBySlot.get('festival_selection') && loadingFestival}
            editMode={editMode && isAdmin}
            isCurated={!!curatedBySlot.get('festival_selection')}
            sectionId={curatedBySlot.get('festival_selection')?.id}
            slotKey="festival_selection"
            sectionTitle={curatedBySlot.get('festival_selection')?.title || 'Festival Selection'}
          />
        </div>
      </section>

      {/* Super Short */}
      <section className="py-4">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">{curatedBySlot.get('super_short')?.title || 'Super Short'}</h2>
              {editMode && curatedBySlot.get('super_short') && <RevertToAutoButton sectionId={curatedBySlot.get('super_short')!.id} />}
            </div>
            <Link to="/search">
              <Button variant="ghost" size="sm" className="text-primary text-sm">
                See all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <EditableFilmRow
            films={curatedBySlot.get('super_short')?.films || superShortFilms}
            loading={!curatedBySlot.get('super_short') && loadingSuperShort}
            editMode={editMode && isAdmin}
            isCurated={!!curatedBySlot.get('super_short')}
            sectionId={curatedBySlot.get('super_short')?.id}
            slotKey="super_short"
            sectionTitle={curatedBySlot.get('super_short')?.title || 'Super Short'}
          />
        </div>
      </section>

      {/* Freestanding sections created via /admin/home, not tied to an automatic row */}
      {freestandingSections.map((section, i) => (
        <section key={section.id} className={`py-4 ${i % 2 === 1 ? 'bg-card/30' : ''}`}>
          <div className="container px-4">
            <div className="flex items-center gap-2 mb-5">
              <h2 className="text-xl font-bold">{section.title}</h2>
            </div>
            <EditableFilmRow
              films={section.films}
              loading={false}
              editMode={editMode && isAdmin}
              isCurated
              sectionId={section.id}
              sectionTitle={section.title}
            />
          </div>
        </section>
      ))}

      {/* Top Reviews */}
      <section className="py-4 bg-card/30">
        <div className="container px-4">
          <div className="flex items-center gap-2 mb-5">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Top Reviews</h2>
          </div>
          <TopReviews />
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="py-4">
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
