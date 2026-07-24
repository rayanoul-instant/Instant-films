import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { FilmGrid } from '@/components/films/FilmGrid';
import { useFilms } from '@/hooks/useFilms';
import { usePageMeta } from '@/hooks/usePageMeta';
import { GENRE_LABELS, FilmGenre } from '@/types/database';

const GENRE_DESCRIPTIONS: Partial<Record<FilmGenre, string>> = {
  drama: 'Intense and moving human stories told in short form.',
  comedy: 'Laughs and lightness — the best comedies in just a few minutes.',
  animation: 'Unique and creative visual worlds, from hand-drawn to 3D.',
  horror: 'Chills and suspense guaranteed — horror distilled into short films.',
  romance: 'Touching love stories told in just a few minutes.',
  scifi: 'Alternative futures and imaginary worlds — science fiction in short form.',
  experimental: 'Visual art and avant-garde cinema — films that push the boundaries.',
  kid: 'Stories for all ages, full of imagination.',
  mainstream: 'The most watched and appreciated short films on Instant Films.',
};

export default function GenrePage() {
  const { genre } = useParams<{ genre: string }>();
  const filmGenre = genre as FilmGenre;
  const label = GENRE_LABELS[filmGenre] || genre || '';
  const description = GENRE_DESCRIPTIONS[filmGenre] || `Discover the best ${label} short films on Instant Films.`;

  const { data: films, isLoading } = useFilms({ genre: filmGenre });

  usePageMeta(
    `${label} — Short films | Instant Films`,
    description
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
        <p className="text-muted-foreground mb-8">{description}</p>

        <FilmGrid films={films || []} loading={isLoading} />
      </div>
    </Layout>
  );
}
