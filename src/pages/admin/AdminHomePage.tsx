import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import {
  useAdminHomeSections, useCreateHomeSection, useUpdateHomeSection, useDeleteHomeSection,
  useReorderHomeSections, type AdminHomeSection,
} from '@/hooks/useHomeSections';

const SLOT_LABELS: Record<string, string> = {
  popular: 'Popular', must_watch: 'Must Watch', festival_selection: 'Festival Selection', super_short: 'Super Short',
};

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
          Create, rename, hide or delete homepage rows here. Drag to reorder sections.
          Pick which films appear in each row directly on the homepage, in edit mode.
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
  const [titleDraft, setTitleDraft] = useState(section.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

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

        {section.slot_key && (
          <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
            Auto: {SLOT_LABELS[section.slot_key] || section.slot_key}
          </span>
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

      <p className="text-xs text-muted-foreground">
        {section.films.length} film{section.films.length === 1 ? '' : 's'} — add, remove or reorder them from the homepage, in edit mode.
      </p>
    </div>
  );
}
