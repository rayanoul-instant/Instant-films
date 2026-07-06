import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { FilmGrid } from '@/components/films/FilmGrid';
import { useFilms } from '@/hooks/useFilms';
import { usePageMeta } from '@/hooks/usePageMeta';
import { GENRE_LABELS, FilmGenre } from '@/types/database';

const GENRE_DESCRIPTIONS: Partial<Record<FilmGenre, string>> = {
  drama: 'Des histoires humaines, intenses et bouleversantes en format court.',
  comedy: 'Rires et légèreté — les meilleures comédies en quelques minutes.',
  animation: 'Des univers visuels uniques et créatifs, du dessin animé à la 3D.',
  horror: 'Frissons et suspense garantis — l\'horreur concentrée en court métrage.',
  romance: 'Des histoires d\'amour touchantes racontées en quelques minutes.',
  scifi: 'Futurs alternatifs et mondes imaginaires — la science-fiction au format court.',
  experimental: 'Art visuel et cinéma d\'avant-garde — des films qui repoussent les limites.',
  kid: 'Des histoires adaptées à tous les âges, pleines d\'imagination.',
  mainstream: 'Les courts métrages les plus vus et appréciés sur Instant Films.',
};

export default function GenrePage() {
  const { genre } = useParams<{ genre: string }>();
  const filmGenre = genre as FilmGenre;
  const label = GENRE_LABELS[filmGenre] || genre || '';
  const description = GENRE_DESCRIPTIONS[filmGenre] || `Découvrez les meilleurs courts métrages ${label} sur Instant Films.`;

  const { data: films, isLoading } = useFilms({ genre: filmGenre });

  usePageMeta(
    `${label} — Courts métrages | Instant Films`,
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
          Retour
        </Link>

        <h1 className="font-display text-3xl font-bold mb-2">{label}</h1>
        <p className="text-muted-foreground mb-8">{description}</p>

        <FilmGrid films={films || []} loading={isLoading} />
      </div>
    </Layout>
  );
}
