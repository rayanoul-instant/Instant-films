import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, X, Search } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import {
  useAdminHomeSections, useCreateHomeSection, useUpdateHomeSection, useDeleteHomeSection,
  useReorderHomeSections, useAddFilmToSection, useRemoveFilmFromSection, useReorderSectionFilms,
  useSearchFilmsByTitle, type AdminHomeSection, type AdminSectionFilm,
} from '@/hooks/useHomeSections';
import { getFilmTitle } from '@/types/database';

export default function AdminHomePage() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }
  if (!user || !profile?.is_admin) return <Navigate to="/" replace />;

  return (
    <Layout>
      <div className="container px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">Homepage sections</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Pick the films that appear on the homepage. Drag to reorder sections and films.
        </p>
        <SectionsManager />
      </div>
    </Layout>
  );
}

function SectionsManager() {
  const { data: sections, isLoading } = useAdminHomeSections();
  const createSection = useCreateHomeSection();
  const reorderSections = useReorderHomeSections();
  const [newTitle, setNewTitle] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !sections) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sections, oldIndex, newIndex);
    reorderSections.mutate(reordered.map((s) => s.id));
  };

  const handleCreate = () => {
    const title = newTitle.trim();
    if (!title) return;
    createSection.mutate({ title, position: sections?.length || 0 });
    setNewTitle('');
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input
          placeholder='New section title (e.g. "Staff Picks")'
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="bg-secondary border-border"
        />
        <Button onClick={handleCreate} disabled={!newTitle.trim() || createSection.isPending} className="btn-cinema flex-shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Add section
        </Button>
      </div>

      {!sections?.length ? (
        <p className="text-sm text-muted-foreground text-center py-12 border border-dashed border-border rounded-xl">
          No sections yet — the homepage shows its default curated rows until you add one.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {sections.map((section) => (
                <SectionCard key={section.id} section={section} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SectionCard({ section }: { section: AdminHomeSection }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const updateSection = useUpdateHomeSection();
  const deleteSection = useDeleteHomeSection();
  const reorderFilms = useReorderSectionFilms();
  const [titleDraft, setTitleDraft] = useState(section.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleFilmDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = section.films.findIndex((f) => f._linkId === active.id);
    const newIndex = section.films.findIndex((f) => f._linkId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(section.films, oldIndex, newIndex);
    reorderFilms.mutate(reordered.map((f) => f._linkId));
  };

  const saveTitle = () => {
    const title = titleDraft.trim();
    setEditingTitle(false);
    if (title && title !== section.title) {
      updateSection.mutate({ id: section.id, updates: { title } });
    } else {
      setTitleDraft(section.title);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <button {...attributes} {...listeners} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none" aria-label="Drag to reorder section">
          <GripVertical className="w-4 h-4" />
        </button>

        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitleDraft(section.title); setEditingTitle(false); } }}
            className="flex-1 font-semibold bg-secondary border border-primary rounded-md px-2 py-1 outline-none text-sm"
          />
        ) : (
          <button className="flex-1 text-left font-semibold hover:text-primary transition-colors" onClick={() => setEditingTitle(true)}>
            {section.title}
          </button>
        )}

        <span className="text-xs text-muted-foreground">{section.is_visible ? 'Visible' : 'Hidden'}</span>
        <Switch
          checked={section.is_visible}
          onCheckedChange={(checked) => updateSection.mutate({ id: section.id, updates: { is_visible: checked } })}
        />

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={() => deleteSection.mutate(section.id)} className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1">Delete</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground px-2 py-1">Cancel</button>
          </div>
        )}
      </div>

      <FilmSearchAndAdd sectionId={section.id} existingFilmIds={section.films.map((f) => f.id)} nextPosition={section.films.length} />

      {section.films.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFilmDragEnd}>
          <SortableContext items={section.films.map((f) => f._linkId)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-3 overflow-x-auto pb-1 mt-3 scrollbar-hide">
              {section.films.map((film) => (
                <SortableFilmThumb key={film._linkId} film={film} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableFilmThumb({ film }: { film: AdminSectionFilm }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: film._linkId });
  const removeFilm = useRemoveFilmFromSection();
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="relative w-32 flex-shrink-0 group">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
        <div className="aspect-video rounded-lg overflow-hidden bg-secondary">
          {film.thumbnail_url ? (
            <img src={film.thumbnail_url} alt="" className="w-full h-full object-cover pointer-events-none" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
          )}
        </div>
        <p className="text-xs mt-1 line-clamp-2">{getFilmTitle(film)}</p>
      </div>
      <button
        onClick={() => removeFilm.mutate(film._linkId)}
        className="absolute top-1 right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove film from section"
      >
        <X className="w-3 h-3 text-white" />
      </button>
    </div>
  );
}

function FilmSearchAndAdd({ sectionId, existingFilmIds, nextPosition }: { sectionId: string; existingFilmIds: string[]; nextPosition: number }) {
  const [query, setQuery] = useState('');
  const { data: results, isLoading } = useSearchFilmsByTitle(query);
  const addFilm = useAddFilmToSection();

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search a film by title to add..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 h-9 text-sm bg-secondary border-border"
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <p className="text-xs text-muted-foreground p-3">Searching...</p>
          ) : !results?.length ? (
            <p className="text-xs text-muted-foreground p-3">No films found.</p>
          ) : (
            results.map((film) => {
              const alreadyAdded = existingFilmIds.includes(film.id);
              return (
                <button
                  key={film.id}
                  disabled={alreadyAdded}
                  onClick={() => {
                    addFilm.mutate({ sectionId, filmId: film.id, position: nextPosition });
                    setQuery('');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="flex-1 truncate">{getFilmTitle(film)}</span>
                  {alreadyAdded && <span className="text-xs text-muted-foreground">Added</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
