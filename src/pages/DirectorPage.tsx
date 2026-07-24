import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { FilmGrid } from '@/components/films/FilmGrid';
import { useDirectorBySlug, useFilmsByDirector } from '@/hooks/useFilms';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function DirectorPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: director, isLoading: loadingDirector } = useDirectorBySlug(slug!);
  const { data: films, isLoading: loadingFilms } = useFilmsByDirector(director || '');

  const count = films?.length || 0;
  const countLabel = `${count} short film${count > 1 ? 's' : ''}`;

  usePageMeta(
    director ? `${director} — Short films | Instant Films` : 'Instant Films',
    director ? `Discover ${director}'s ${countLabel} available on Instant Films.` : undefined
  );

  const isLoading = loadingDirector || loadingFilms;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          to="/search"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {!isLoading && !director ? (
          <p className="text-muted-foreground">Director not found.</p>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold mb-2">{director || '...'}</h1>
            <p className="text-muted-foreground mb-8">{countLabel} available</p>
            <FilmGrid films={films || []} loading={isLoading} />
          </>
        )}
      </div>
    </Layout>
  );
}
