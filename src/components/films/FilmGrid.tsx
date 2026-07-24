import { Film } from '@/types/database';
import { FilmCard } from './FilmCard';
import { Skeleton } from '@/components/ui/skeleton';

interface FilmGridProps {
  films: Film[];
  loading?: boolean;
}

export function FilmGrid({ films, loading }: FilmGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[2/3] rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (films.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">No films found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
      {films.map((film) => (
        <FilmCard key={film.id} film={film} />
      ))}
    </div>
  );
}
