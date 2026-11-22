import { useState, useEffect, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Star, ThumbsUp, Pencil, Check, RotateCcw } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { FilmCard } from '@/components/films/FilmCard';
import { EditableFilmRow } from '@/components/films/EditableFilmRow';
import { AvatarDisplay } from '@/components/films/AvatarDisplay';
import { useFeaturedFilms, useFilms, useTopReviews, useRecommendations, useMustWatch, useFestivalSelection, useSuperShort } from '@/hooks/useFilms';
import { useFeaturedFilm } from '@/hooks/useFeaturedFilm';
import { useHomeSections, useDeleteHomeSection } from '@/hooks/useHomeSections';
import { useAuth } from '@/hooks/useAuth';
import { usePageMeta } from '@/hooks/usePageMeta';
import { formatPersonName } from '@/lib/utils';
import logoInstant from '@/assets/logo-instant.png';
import { Film, GENRE_LABELS, HomeSectionWithFilms, HomeSlotKey, getFilmTitle } from '@/types/database';

function FilmRow({ films, loading }: { films?: Film[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-64 flex-shrink-0 aspect-[16/9] rounded-[8px] bg-muted" />
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
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      <RotateCcw className="w-3 h-3" /> Revert to automatic
    </button>
  );
}

/** Titre de section : texte blanc en serif, lien "See all" gris optionnel. */
function SectionHeader({ title, seeAllHref, extra }: { title: string; seeAllHref?: string; extra?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-2xl font-semibold text-white">{title}</h2>
        {extra}
      </div>
      {seeAllHref && (
        <Link to={seeAllHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          See all
        </Link>
      )}
    </div>
  );
}

/** Miniature YouTube haute définition (1280×720, vrai 16:9 sans bandes noires) pour le hero. */
function heroImageUrl(url: string): string {
  return url.replace(/(img\.youtube\.com\/vi\/[^/]+\/)(hq|mq|sd)?default\.jpg/, '$1maxresdefault.jpg');
}

/** Image du hero : tente la version HD, revient à la miniature d'origine si YouTube n'en a pas. */
function HeroImage({ src }: { src: string }) {
  const hdSrc = heroImageUrl(src);
  const [current, setCurrent] = useState(hdSrc);

  useEffect(() => setCurrent(hdSrc), [hdSrc]);

  return (
    <img
      src={current}
      alt=""
      className="absolute inset-0 w-full h-full object-cover"
      onError={() => setCurrent(src)}
      // YouTube renvoie une petite image grise (120×90) quand la version HD n'existe pas
      onLoad={(e) => { if (current !== src && e.currentTarget.naturalWidth <= 120) setCurrent(src); }}
    />
  );
}

/** Hero "Film of the day" : un seul film en pleine largeur. */
function FeaturedHero() {
  const { data: film, isLoading } = useFeaturedFilm();

  if (isLoading) {
    return <div className="w-full aspect-video bg-card" />;
  }
  if (!film) return null;

  const genre = (film.genres || []).find((g) => g !== 'mainstream');
  const details = [
    film.director ? formatPersonName(film.director) : null,
    `${film.duration_minutes} min`,
    genre ? GENRE_LABELS[genre] : null,
  ].filter(Boolean).join(' · ');

  return (
    <section className="relative w-full">
      {/* Image toujours en 16:9 = format natif des miniatures : aucun zoom ni recadrage */}
      <div className="relative w-full aspect-video overflow-hidden bg-card">
        {film.thumbnail_url && <HeroImage src={film.thumbnail_url} />}
        {/* Fondu en haut : l'image se fond dans le bandeau du logo */}
        <div className="absolute inset-x-0 top-0 h-16 md:h-24 bg-gradient-to-b from-background to-transparent" />
        {/* Fondu sombre uniquement en bas, pour la lisibilité du texte */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>
      {/* Texte et bouton entièrement posés sur le bas de l'image, sur tous les écrans */}
      <div className="absolute inset-x-0 bottom-0">
        {/* Ombre noire derrière le texte pour rester lisible sur n'importe quelle image */}
        <div className="container px-4 pb-4 md:pb-12 [text-shadow:0_1px_2px_rgba(0,0,0,0.9),0_2px_12px_rgba(0,0,0,0.7)]">
          <p className="text-sm md:text-base font-medium text-white mb-1 md:mb-2">Film of the day</p>
          <h1 className="font-display text-xl sm:text-3xl md:text-6xl font-semibold text-white mb-1 md:mb-2 max-w-3xl line-clamp-2">
            {getFilmTitle(film)}
          </h1>
          <p className="text-xs md:text-base text-white/70 mb-2 md:mb-6">{details}</p>
          <Link
            to={`/films/${film.slug}`}
            className="inline-flex items-center h-8 md:h-12 px-4 md:px-8 rounded-[6px] bg-primary text-primary-foreground text-sm md:text-base font-medium hover:opacity-90 transition-opacity"
          >
            Watch
          </Link>
        </div>
      </div>
    </section>
  );
}

const Index = () => {
  usePageMeta(
    'Instant Films - The streaming platform dedicated to short films',
    'Discover the best short films. Rate, review and connect with other fans.'
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
  const [editMode, setEditMode] = useState(false);

  const curatedBySlot = new Map<HomeSlotKey, HomeSectionWithFilms>();
  const freestandingSections: HomeSectionWithFilms[] = [];
  (homeSections || []).forEach((section) => {
    if (section.slot_key) curatedBySlot.set(section.slot_key, section);
    else freestandingSections.push(section);
  });

  const editableSlot = (slotKey: HomeSlotKey, defaultTitle: string, films: Film[] | undefined, loading: boolean, seeAllHref: string) => {
    const curated = curatedBySlot.get(slotKey);
    const title = curated?.title || defaultTitle;
    return (
      <section className="py-4">
        <div className="container px-4">
          <SectionHeader
            title={title}
            seeAllHref={seeAllHref}
            extra={editMode && curated ? <RevertToAutoButton sectionId={curated.id} /> : null}
          />
          <EditableFilmRow
            films={curated?.films || films}
            loading={!curated && loading}
            editMode={editMode && isAdmin}
            isCurated={!!curated}
            sectionId={curated?.id}
            slotKey={slotKey}
            sectionTitle={title}
          />
        </div>
      </section>
    );
  };

  return (
    <Layout>
      {/* Header : petit logo à gauche uniquement */}
      <header className="container px-4 h-14 md:h-16 flex items-center">
        <Link to="/" aria-label="Instant Films home">
          <img src={logoInstant} alt="Instant Films" className="h-11 md:h-12 object-contain" />
        </Link>
      </header>

      <FeaturedHero />

      <div className="container px-4 pt-6 pb-4">
        <p className="text-lg text-foreground/70 max-w-2xl">
          Discover the best short films. Rate, review and connect with other fans.
        </p>
      </div>

      {isAdmin && (
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`fixed z-40 bottom-24 right-4 md:bottom-6 md:right-6 flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-medium transition-colors ${
            editMode ? 'bg-white text-black' : 'bg-card border border-border text-foreground'
          }`}
        >
          {editMode ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          {editMode ? 'Done editing' : 'Edit mode'}
        </button>
      )}

      {editableSlot('popular', 'Popular', popularFilms, loadingPopular, '/search?sortBy=popular')}

      {/* For you — never editable */}
      <section className="py-4">
        <div className="container px-4">
          <SectionHeader title="For you" seeAllHref="/search" />
          <FilmRow films={recommendations || featuredFilms} loading={loadingRec} />
        </div>
      </section>

      {editableSlot('must_watch', 'Must Watch', mustWatchFilms, loadingMustWatch, '/search?sortBy=rating')}
      {editableSlot('festival_selection', 'Festival Selection', festivalFilms, loadingFestival, '/search')}
      {editableSlot('super_short', 'Super Short', superShortFilms, loadingSuperShort, '/search')}

      {/* Freestanding sections created in edit mode, not tied to an automatic row */}
      {freestandingSections.map((section) => (
        <section key={section.id} className="py-4">
          <div className="container px-4">
            <SectionHeader title={section.title} />
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
      <section className="py-4">
        <div className="container px-4">
          <SectionHeader title="Top Reviews" />
          <TopReviews />
        </div>
      </section>

      {/* Sign-up prompt for visitors */}
      {!user && (
        <section className="py-4">
          <div className="container px-4">
            <div className="rounded-[8px] border border-border bg-card p-6">
              <h2 className="font-display text-2xl font-semibold text-white mb-2">Join Instant</h2>
              <p className="text-muted-foreground text-sm mb-4 max-w-md">
                Create your account and start discovering exceptional short films.
              </p>
              <Link
                to="/auth"
                className="inline-flex items-center h-10 px-4 rounded-[6px] border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Create an account
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
          <div key={i} className="cinema-card p-4">
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
      <p className="text-muted-foreground text-sm py-8">
        No highly liked reviews yet. Be the first!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review: any) => (
        <div key={review.id} className="cinema-card p-4">
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
                <Link to={`/user/${review.user_id}`} className="font-semibold text-sm hover:text-white/70 transition-colors">
                  {review.profile?.username || 'User'}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />{review.likesCount}
                  </span>
                  <span className="flex items-center gap-1 text-foreground">
                    <Star className="w-3 h-3 fill-current" />
                    {Math.round(review.rating / 2)}/5
                  </span>
                </div>
              </div>
              {review.review && (
                <p className="text-sm text-muted-foreground line-clamp-2">{review.review}</p>
              )}
              <Link
                to={`/films/${review.film_id}`}
                className="text-xs text-foreground/80 hover:text-foreground hover:underline mt-1 inline-block"
              >
                {review.film?.title || 'View film'}
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Index;
