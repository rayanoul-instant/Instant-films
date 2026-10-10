import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { FilmGrid } from '@/components/films/FilmGrid';
import { useFilms } from '@/hooks/useFilms';
import { usePageMeta } from '@/hooks/usePageMeta';
import { GENRE_LABELS, GENRE_DESCRIPTIONS, FilmGenre } from '@/types/database';

export default function GenrePage() {
  const { genre } = useParams<{ genre: string }>();
  const filmGenre = genre as FilmGenre;
  const label = GENRE_LABELS[filmGenre] || genre || '';
  const flavorText = GENRE_DESCRIPTIONS[filmGenre] || `Discover the best ${label} short films on Instant Films.`;

  const { data: films, isLoading } = useFilms({ genre: filmGenre });

  const metaDescription = films?.length
    ? `${flavorText} Watch ${films.length} free ${label.toLowerCase()} short films on Instant Films.`
    : flavorText;

  usePageMeta(
    `${label} Short Films to Watch Online | Instant Films`,
    metaDescription
  );

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

        <h1 className="font-display text-3xl font-bold mb-2">{label}</h1>
        <p className="text-muted-foreground mb-8">{flavorText}</p>

        <FilmGrid films={films || []} loading={isLoading} />
      </div>
    </Layout>
  );
}
