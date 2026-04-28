import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Star, Play, Bookmark, Trophy, Trash2 } from 'lucide-react';
import { Film, GENRE_LABELS, getFilmTitle } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToggleFavorite, useFavorites, useToggleMainstream, useDeleteFilm } from '@/hooks/useFilms';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const ADMIN_ID = 'bb2569f9-7fb0-485d-b728-eff242861852';

interface FilmCardProps {
  film: Film;
  featured?: boolean;
  isTop3?: boolean;
}

export function FilmCard({ film, featured = false, isTop3 = false }: FilmCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const toggleMainstream = useToggleMainstream();
  const deleteFilm = useDeleteFilm();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isAdmin = user?.id === ADMIN_ID;
  const isFavorited = favorites?.some((f) => f.film_id === film.id);
  const isMainstream = (film.genres || []).includes('mainstream');
  const isKid = (film.genres || []).includes('kid');

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
    <motion.div
      id={`film-${film.id}`}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "cinema-card group",
        featured ? "col-span-2 row-span-2" : ""
      )}
    >
      <Link
        to={`/films/${film.id}`}
        className="block"
        onClick={() => sessionStorage.setItem('lastClickedFilm', film.id)}
      >
        {/* Thumbnail */}
        <div className={cn("relative overflow-hidden bg-secondary", "aspect-[16/9]")}>
          {film.thumbnail_url ? (
            <img
              src={film.thumbnail_url}
              alt={getFilmTitle(film)}
              width={320}
              height={180}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
              <Play className="w-12 h-12 text-muted-foreground" />
            </div>
          )}

          {/* Overlay */}
          <div className="film-overlay flex flex-col justify-end p-4">
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0 }}
                whileHover={{ scale: 1.1 }}
                className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Play className="w-8 h-8 text-primary-foreground fill-primary-foreground ml-1" />
              </motion.div>
            </div>
          </div>

          {/* Save / Bookmark Button */}
          {user && !isTop3 && !isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavorite}
              className={cn(
                "absolute top-2 right-2 z-10 transition-opacity duration-200",
                isFavorited ? "opacity-100 text-accent" : "opacity-0 group-hover:opacity-60 text-foreground/80 hover:!opacity-100 hover:text-accent"
              )}
            >
              <Bookmark className={cn("w-4 h-4", isFavorited && "fill-accent")} />
            </Button>
          )}

          {/* Top 3 gold trophy badge */}
          {isTop3 && (
            <div className="absolute top-2 left-2 z-10 w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c5a028, #e8c840, #a08020)' }}>
              <Trophy className="w-4 h-4 text-white drop-shadow-md" />
            </div>
          )}

          {/* Duration Badge */}
          <Badge
            variant="secondary"
            className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-foreground border-0"
          >
            <Clock className="w-3 h-3 mr-1" />
            {film.duration_minutes} min
          </Badge>

          {/* Admin buttons */}
          {isAdmin && (
            <div
              className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 bg-black/40"
              onClick={(e) => e.preventDefault()}
            >
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={(e) => handleAdminAction(e, () => toggleMainstream.mutate({ filmId: film.id, genres: film.genres || [], tag: 'mainstream' }))}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
                    isMainstream
                      ? 'bg-yellow-500/30 border-yellow-500 text-yellow-300'
                      : 'bg-black/50 border-white/30 text-white/80 hover:border-yellow-500 hover:text-yellow-300'
                  )}
                >
                  {isMainstream ? '★ Mainstream' : '☆ Mainstream'}
                </button>
                <button
                  onClick={(e) => handleAdminAction(e, () => toggleMainstream.mutate({ filmId: film.id, genres: film.genres || [], tag: 'kid' }))}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
                    isKid
                      ? 'bg-blue-500/30 border-blue-500 text-blue-300'
                      : 'bg-black/50 border-white/30 text-white/80 hover:border-blue-500 hover:text-blue-300'
                  )}
                >
                  {isKid ? '★ Kid' : '☆ Kid'}
                </button>
              </div>

              <div className="flex justify-end">
                {!confirmDelete ? (
                  <button
                    onClick={(e) => handleAdminAction(e, () => setConfirmDelete(true))}
                    className="p-1.5 rounded-lg bg-black/50 text-white/70 hover:text-red-400 hover:bg-black/70 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={(e) => handleAdminAction(e, async () => {
                        await deleteFilm.mutateAsync(film.id);
                        setConfirmDelete(false);
                      })}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={(e) => handleAdminAction(e, () => setConfirmDelete(false))}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/50 text-white/80 hover:bg-black/70 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className={cn(
            "font-display font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1",
            featured ? "text-xl" : "text-base"
          )}>
            {getFilmTitle(film)}
          </h3>

          {film.director && (
            <p className="text-sm text-muted-foreground mt-1">
              {film.director}
            </p>
          )}

          {/* Rating & Genres */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-primary">
              <Star className="w-4 h-4 fill-primary" />
              <span className="text-sm font-medium">
                {film.average_rating ? film.average_rating.toFixed(1) : 'N/A'}
              </span>
            </div>

            <div className="flex gap-1">
              {(film.genres || []).slice(0, 2).map((genre) => (
                <Badge
                  key={genre}
                  variant="outline"
                  className="text-xs border-border text-muted-foreground"
                >
                  {GENRE_LABELS[genre]}
                </Badge>
              ))}
            </div>
          </div>

          {featured && film.synopsis && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {film.synopsis}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
