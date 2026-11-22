import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Bookmark, Trophy, Trash2, Tag, X } from 'lucide-react';
import { Film, FilmGenre, GENRE_LABELS, getFilmTitle, slugify } from '@/types/database';
import { useToggleFavorite, useFavorites, useSetGenres, useDeleteFilm } from '@/hooks/useFilms';
import { useFilmStats } from '@/hooks/useFilmStats';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatPersonName } from '@/lib/utils';

const ALL_GENRES = Object.keys(GENRE_LABELS) as FilmGenre[];

interface FilmCardProps {
  film: Film;
  featured?: boolean;
  isTop3?: boolean;
}

export function FilmCard({ film, featured = false, isTop3 = false }: FilmCardProps) {
  const { user, profile } = useAuth();
  const { data: favorites } = useFavorites();
  const { data: statsByFilm } = useFilmStats();
  const toggleFavorite = useToggleFavorite();
  const setGenres = useSetGenres();
  const deleteFilm = useDeleteFilm();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showGenrePicker, setShowGenrePicker] = useState(false);

  const isAdmin = profile?.is_admin === true;
  const isFavorited = favorites?.some((f) => f.film_id === film.id);
  const currentGenres: FilmGenre[] = (film.genres || []) as FilmGenre[];

  const stats = statsByFilm?.get(film.id);
  const genreLabel = currentGenres[0] ? GENRE_LABELS[currentGenres[0]] : null;
  const metaParts = [
    stats && stats.count > 0 ? `★ ${stats.average.toFixed(1)}` : null,
    stats && stats.count > 0 ? `${stats.count} ${stats.count === 1 ? 'review' : 'reviews'}` : null,
    genreLabel,
  ].filter(Boolean);

  const handleToggleGenre = (genre: FilmGenre) => {
    const isActive = currentGenres.includes(genre);
    const newGenres = isActive
      ? currentGenres.filter(g => g !== genre)
      : currentGenres.length >= 3 ? currentGenres : [...currentGenres, genre];
    setGenres.mutate({ filmId: film.id, genres: newGenres });
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) toggleFavorite.mutate(film.id);
  };

  const handleAdminAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  return (
    <div
      id={`film-${film.id}`}
      className={cn(
        // h-full : toutes les cartes d'une rangée ont la même hauteur, même sans réalisateur
        "cinema-card group relative h-full",
        featured ? "col-span-2 row-span-2" : ""
      )}
    >
      <Link
        to={`/films/${film.slug}`}
        className="block"
        onClick={() => sessionStorage.setItem('lastClickedFilm', film.id)}
      >
        {/* Thumbnail */}
        <div className="relative overflow-hidden bg-secondary aspect-[16/9]">
          {film.thumbnail_url ? (
            <img
              src={film.thumbnail_url}
              alt={getFilmTitle(film)}
              width={320}
              height={180}
              className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-80"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <Play className="w-12 h-12 text-muted-foreground" />
            </div>
          )}

          {/* Save / Bookmark Button — visible for all logged-in users */}
          {user && !isTop3 && (
            <button
              onClick={handleFavorite}
              className={cn(
                "absolute top-2 right-2 z-20 p-1 rounded-[4px] transition-opacity duration-200 bg-transparent",
                isFavorited ? "opacity-100 text-white" : "opacity-0 group-hover:opacity-60 text-white/80 hover:!opacity-100"
              )}
            >
              <Bookmark className={cn("w-4 h-4", isFavorited && "fill-white")} />
            </button>
          )}

          {/* Top 3 trophy badge */}
          {isTop3 && (
            <div className="absolute top-2 left-2 z-10 w-8 h-8 rounded-[4px] flex items-center justify-center bg-[#c5a028]">
              <Trophy className="w-4 h-4 text-white" />
            </div>
          )}

          {/* Duration */}
          <span className="absolute bottom-2 right-2 px-2 py-1 rounded-[4px] bg-black/70 text-xs leading-none text-white">
            {film.duration_minutes} min
          </span>

          {/* Admin: subtle dark hover overlay (visual only) */}
          {isAdmin && (
            <div className="absolute inset-0 z-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          )}

          {/* Admin: Genre button — top left, only on hover */}
          {isAdmin && !isTop3 && (
            <button
              onClick={(e) => handleAdminAction(e, () => setShowGenrePicker(v => !v))}
              className={cn(
                "absolute top-2 left-2 z-20 p-1 rounded-[4px] border bg-black/50 border-white/30 text-white/70 hover:text-white hover:border-white/60 transition-opacity",
                showGenrePicker ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
              title="Edit genres"
            >
              <Tag className="w-4 h-4" />
            </button>
          )}

          {/* Admin: Delete button — bottom left */}
          {isAdmin && !isTop3 && (
            <div className={cn("absolute bottom-2 left-2 z-20 transition-opacity", confirmDelete ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
              {!confirmDelete ? (
                <button
                  onClick={(e) => handleAdminAction(e, () => setConfirmDelete(true))}
                  className="p-1 rounded-[4px] bg-black/50 text-white/70 hover:text-red-400 hover:bg-black/70 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-1 items-center">
                  <button
                    onClick={(e) => handleAdminAction(e, async () => {
                      await deleteFilm.mutateAsync(film.id);
                      setConfirmDelete(false);
                    })}
                    className="px-2 py-1 rounded-[4px] text-xs leading-none font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={(e) => handleAdminAction(e, () => setConfirmDelete(false))}
                    className="px-2 py-1 rounded-[4px] text-xs leading-none font-medium bg-black/50 text-white/80 hover:bg-black/70 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className={cn(
            "font-sans font-medium text-foreground line-clamp-1",
            featured ? "text-xl" : "text-base"
          )}>
            {getFilmTitle(film)}
          </h3>

          {film.director && (
            <Link
              to={`/realisateur/${slugify(film.director)}`}
              onClick={e => e.stopPropagation()}
              className="text-sm text-muted-foreground mt-1 hover:text-foreground transition-colors line-clamp-1 block"
            >
              {formatPersonName(film.director)}
            </Link>
          )}

          {metaParts.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {metaParts.join(' · ')}
            </p>
          )}

          {/* SYNOPSIS DÉSACTIVÉ — décommenter pour réactiver
          {featured && film.synopsis && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {film.synopsis}
            </p>
          )}
          */}
        </div>
      </Link>

      {/* Genre picker overlay — full card */}
      {isAdmin && showGenrePicker && (
        <div
          className="absolute inset-0 z-30 rounded-[8px] bg-black/95 p-3 flex flex-col gap-2"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1">
              Genres
              <span className={currentGenres.length === 0 ? 'text-orange-400' : 'text-white/40'}>
                ({currentGenres.length}/3)
              </span>
              {currentGenres.length === 0 && (
                <span className="text-orange-400 text-xs">only visible in All</span>
              )}
            </span>
            <button
              onClick={() => setShowGenrePicker(false)}
              className="p-1 rounded text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            {ALL_GENRES.map((genre) => {
              const isActive = currentGenres.includes(genre);
              const atMax = currentGenres.length >= 3 && !isActive;
              return (
                <button
                  key={genre}
                  disabled={atMax}
                  onClick={() => handleToggleGenre(genre)}
                  className={cn(
                    'px-2 py-1 rounded-[4px] text-xs leading-none font-medium border transition-colors',
                    isActive
                      ? 'bg-white border-white text-black'
                      : atMax
                      ? 'bg-transparent border-white/10 text-white/25 cursor-not-allowed'
                      : 'bg-transparent border-white/30 text-white/70 hover:border-white hover:text-white'
                  )}
                >
                  {GENRE_LABELS[genre]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
