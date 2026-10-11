import { useEffect, useState } from 'react';
import {
  DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Search, X } from 'lucide-react';
import { FilmCard } from '@/components/films/FilmCard';
import { Input } from '@/components/ui/input';
import { Film, HomeSlotKey, LinkedSectionFilm, getFilmTitle } from '@/types/database';
import {
  useAddFilmToSection, useConvertSlotToCustomSection, useRemoveFilmFromSection,
  useReorderSectionFilms, useReplaceFilmInSection, useSearchFilmsByTitle,
} from '@/hooks/useHomeSections';

// Objets stables (hors composant) : recréer ces options à chaque rendu forcerait
// dnd-kit à réinitialiser ses listeners en boucle, ce qui gèle l'UI avec plusieurs
// bandes éditables simultanément.
const MOUSE_ACTIVATION = { distance: 8 };
const TOUCH_ACTIVATION = { delay: 250, tolerance: 8 };

type RowFilm = Film | LinkedSectionFilm;

interface EditableFilmRowProps {
  films?: RowFilm[];
  loading: boolean;
  editMode: boolean;
  isCurated: boolean;
  sectionId?: string;
  slotKey?: HomeSlotKey;
  sectionTitle: string;
}

function linkIdOf(film: RowFilm): string {
  return (film as LinkedSectionFilm)._linkId;
}

export function EditableFilmRow({
  films, loading, editMode, isCurated, sectionId, slotKey, sectionTitle,
}: EditableFilmRowProps) {
  const [localFilms, setLocalFilms] = useState<RowFilm[]>(films?.slice(0, 10) || []);
  const [pickerFor, setPickerFor] = useState<'add' | string | null>(null);

  const convert = useConvertSlotToCustomSection();
  const addFilm = useAddFilmToSection();
  const removeFilm = useRemoveFilmFromSection();
  const replaceFilm = useReplaceFilmInSection();
  const reorderFilms = useReorderSectionFilms();

  useEffect(() => {
    setLocalFilms(films?.slice(0, 10) || []);
  }, [films]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: MOUSE_ACTIVATION }),
    useSensor(TouchSensor, { activationConstraint: TOUCH_ACTIVATION }),
  );

  const persist = (newFilmIds: string[]) => {
    if (isCurated) return; // handled per-action below
    if (!slotKey) return;
    convert.mutate({ slotKey, title: sectionTitle, filmIds: newFilmIds });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localFilms.findIndex((f) => f.id === active.id);
    const newIndex = localFilms.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(localFilms, oldIndex, newIndex);
    setLocalFilms(reordered);
    if (isCurated) {
      reorderFilms.mutate(reordered.map(linkIdOf));
    } else {
      persist(reordered.map((f) => f.id));
    }
  };

  const handleRemove = (film: RowFilm) => {
    const next = localFilms.filter((f) => f.id !== film.id);
    setLocalFilms(next);
    if (isCurated) {
      removeFilm.mutate(linkIdOf(film));
    } else {
      persist(next.map((f) => f.id));
    }
  };

  const handleReplace = (film: RowFilm, newFilmId: string) => {
    setPickerFor(null);
    if (isCurated) {
      replaceFilm.mutate({ linkId: linkIdOf(film), filmId: newFilmId });
    } else {
      persist(localFilms.map((f) => (f.id === film.id ? newFilmId : f.id)));
    }
  };

  const handleAdd = (newFilmId: string) => {
    setPickerFor(null);
    if (isCurated && sectionId) {
      addFilm.mutate({ sectionId, filmId: newFilmId, position: localFilms.length });
    } else {
      persist([...localFilms.map((f) => f.id), newFilmId]);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-64 flex-shrink-0 aspect-[16/9] rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!editMode) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {localFilms.map((film) => (
          <div key={film.id} className="w-64 md:w-72 flex-shrink-0">
            <FilmCard film={film} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={localFilms.map((f) => f.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {localFilms.map((film) => (
            <EditableFilmThumb
              key={film.id}
              film={film}
              onRemove={() => handleRemove(film)}
              pickerOpen={pickerFor === film.id}
              onToggleReplace={() => setPickerFor(pickerFor === film.id ? null : film.id)}
              onPickReplacement={(filmId) => handleReplace(film, filmId)}
              onClosePicker={() => setPickerFor(null)}
              excludeIds={localFilms.map((f) => f.id)}
            />
          ))}
          <div className="relative w-32 flex-shrink-0">
            <button
              onClick={() => setPickerFor(pickerFor === 'add' ? null : 'add')}
              className="w-full aspect-video rounded-lg border-2 border-dashed border-white/15 text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center"
              aria-label="Add a film"
            >
              <Plus className="w-6 h-6" />
            </button>
            {pickerFor === 'add' && (
              <FilmPicker onPick={(filmId) => handleAdd(filmId)} onClose={() => setPickerFor(null)} excludeIds={localFilms.map((f) => f.id)} />
            )}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}

function EditableFilmThumb({
  film, onRemove, pickerOpen, onToggleReplace, onPickReplacement, onClosePicker, excludeIds,
}: {
  film: RowFilm;
  onRemove: () => void;
  pickerOpen: boolean;
  onToggleReplace: () => void;
  onPickReplacement: (filmId: string) => void;
  onClosePicker: () => void;
  excludeIds: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: film.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="relative w-64 md:w-72 flex-shrink-0 touch-none">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <div className="aspect-[16/9] rounded-xl overflow-hidden bg-secondary">
          {film.thumbnail_url ? (
            <img src={film.thumbnail_url} alt="" className="w-full h-full object-cover pointer-events-none" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
          )}
        </div>
        <p className="text-sm mt-2 line-clamp-1">{getFilmTitle(film)}</p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5 hover:bg-destructive transition-colors"
        aria-label="Remove from row"
      >
        <X className="w-3.5 h-3.5 text-white" />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onToggleReplace(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-2 left-2 px-2 py-1 rounded-full text-[11px] font-medium bg-black/70 text-white hover:bg-primary transition-colors"
      >
        Replace
      </button>

      {pickerOpen && (
        <div onPointerDown={(e) => e.stopPropagation()}>
          <FilmPicker onPick={onPickReplacement} onClose={onClosePicker} excludeIds={excludeIds} />
        </div>
      )}
    </div>
  );
}

function FilmPicker({ onPick, onClose, excludeIds }: {
  onPick: (filmId: string) => void;
  onClose: () => void;
  excludeIds: string[];
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);
  const { data: results, isLoading } = useSearchFilmsByTitle(debouncedQuery);

  return (
    <div className="absolute z-30 top-full left-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg">
      <div className="relative p-2 border-b border-border">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Search a film by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 h-9 text-sm bg-secondary border-border"
        />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {query.trim().length < 2 ? (
          <p className="text-xs text-muted-foreground p-3">Type at least 2 characters.</p>
        ) : query !== debouncedQuery || isLoading ? (
          <p className="text-xs text-muted-foreground p-3">Searching...</p>
        ) : !results?.length ? (
          <p className="text-xs text-muted-foreground p-3">No films found.</p>
        ) : (
          results.map((film) => {
            const alreadyIn = excludeIds.includes(film.id);
            return (
              <button
                key={film.id}
                disabled={alreadyIn}
                onClick={() => onPick(film.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="flex-1 truncate">{film.display_title || film.title}</span>
                {alreadyIn && <span className="text-xs text-muted-foreground">Added</span>}
              </button>
            );
          })
        )}
      </div>
      <button onClick={onClose} className="w-full text-center text-xs text-muted-foreground py-1.5 hover:text-foreground transition-colors border-t border-border">
        Close
      </button>
    </div>
  );
}
