import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, User, Tag } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoPlayer } from '@/components/films/VideoPlayer';
import { useCourtMetrage } from '@/hooks/useCourtsMetrages';
import { motion, AnimatePresence } from 'framer-motion';

const GENRE_LABELS: Record<string, string> = {
  drama: 'Drama', comedy: 'Comedy', horror: 'Horror', scifi: 'Sci-Fi',
  thriller: 'Thriller', romance: 'Romance', animation: 'Animation',
  fantasy: 'Fantasy', documentary: 'Documentary', experimental: 'Experimental',
};

export default function CourtMetrageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: film, isLoading } = useCourtMetrage(id!);

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
          <Link to="/search"><button className="text-primary underline">Back to search</button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
      <motion.div
        key={film.id}
        className="container px-4 py-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Link
          to="/search"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to catalog
        </Link>

        <div className="mb-8">
          {film.lien ? (
            <VideoPlayer src={film.lien} poster={film.thumbnail_url || undefined} />
          ) : (
            <div className="aspect-video rounded-xl bg-black flex items-center justify-center text-muted-foreground">
              Video unavailable
            </div>
          )}
        </div>

        <div className="mb-6">
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-3">{film.titre}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
            {film.auteur && (
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{film.auteur}</span>
            )}
            {film.annee && (
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{film.annee}</span>
            )}
            {film.duree && (
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{film.duree}</span>
            )}
          </div>

          {film.genres?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {film.genres.map((g: string) => (
                <Badge key={g} variant="secondary">{GENRE_LABELS[g] ?? g}</Badge>
              ))}
            </div>
          )}

          {film.themes && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Tag className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{film.themes}</span>
            </div>
          )}
        </div>

        {film.synopsis && (
          <div>
            <h2 className="font-display text-lg font-semibold mb-2">Synopsis</h2>
            <p className="text-muted-foreground leading-relaxed">{film.synopsis}</p>
          </div>
        )}
      </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
