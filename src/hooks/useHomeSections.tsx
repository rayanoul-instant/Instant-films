import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Film, HomeSection, HomeSectionWithFilms, HomeSlotKey, LinkedSectionFilm } from '@/types/database';
import { toast } from 'sonner';

export type AdminSectionFilm = LinkedSectionFilm;
export interface AdminHomeSection extends HomeSection {
  films: AdminSectionFilm[];
}

function mapLinks<T extends { section_id: string; id: string; films: unknown }>(
  sections: HomeSection[],
  links: T[]
): HomeSectionWithFilms[] {
  return sections.map((section) => ({
    ...section,
    films: links
      .filter((l) => l.section_id === section.id)
      .map((l) => ({ ...(l.films as unknown as Film), _linkId: l.id }))
      .filter((f) => !!f.id),
  }));
}

/** Page d'accueil (public) : sections visibles, avec leurs films, dans l'ordre. */
export function useHomeSections() {
  return useQuery({
    queryKey: ['home-sections', 'public'],
    queryFn: async () => {
      const { data: sections, error } = await supabase
        .from('home_sections')
        .select('*')
        .eq('is_visible', true)
        .order('position', { ascending: true });
      if (error) throw error;
      if (!sections?.length) return [];

      const { data: links, error: linksError } = await supabase
        .from('home_section_films')
        .select('id, section_id, position, films(*)')
        .in('section_id', sections.map((s) => s.id))
        .order('position', { ascending: true });
      if (linksError) throw linksError;

      return mapLinks(sections as unknown as HomeSection[], links || []);
    },
  });
}

/** Panneau admin : toutes les sections (visibles ou non) avec leurs films. */
export function useAdminHomeSections() {
  return useQuery({
    queryKey: ['home-sections', 'admin'],
    queryFn: async () => {
      const { data: sections, error } = await supabase
        .from('home_sections')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      if (!sections?.length) return [];

      const { data: links, error: linksError } = await supabase
        .from('home_section_films')
        .select('id, section_id, position, films(*)')
        .in('section_id', sections.map((s) => s.id))
        .order('position', { ascending: true });
      if (linksError) throw linksError;

      return mapLinks(sections as unknown as HomeSection[], links || []) as AdminHomeSection[];
    },
  });
}

export function useSearchFilmsByTitle(query: string) {
  return useQuery({
    queryKey: ['films', 'admin-search', query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('films')
        .select('id, title, display_title, thumbnail_url, slug')
        .ilike('title', `%${query}%`)
        .order('title', { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data || []) as Pick<Film, 'id' | 'title' | 'display_title' | 'thumbnail_url' | 'slug'>[];
    },
    enabled: query.trim().length >= 2,
  });
}

function useInvalidateHomeSections() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['home-sections'] });
  };
}

export function useCreateHomeSection() {
  const invalidate = useInvalidateHomeSections();
  return useMutation({
    mutationFn: async ({ title, position }: { title: string; position: number }) => {
      const { error } = await supabase.from('home_sections').insert({ title, position });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error('Failed to create section — ' + error.message),
  });
}

export function useUpdateHomeSection() {
  const invalidate = useInvalidateHomeSections();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<HomeSection, 'title' | 'is_visible'>> }) => {
      const { error } = await supabase.from('home_sections').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error('Failed to update section — ' + error.message),
  });
}

export function useDeleteHomeSection() {
  const invalidate = useInvalidateHomeSections();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('home_sections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error('Failed to delete section — ' + error.message),
  });
}

/** Persiste un nouvel ordre de sections (glisser-déposer). */
export function useReorderHomeSections() {
  const invalidate = useInvalidateHomeSections();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, position) =>
          supabase.from('home_sections').update({ position }).eq('id', id)
        )
      );
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error('Failed to reorder sections — ' + error.message),
  });
}

export function useAddFilmToSection() {
  const invalidate = useInvalidateHomeSections();
  return useMutation({
    mutationFn: async ({ sectionId, filmId, position }: { sectionId: string; filmId: string; position: number }) => {
      const { error } = await supabase
        .from('home_section_films')
        .insert({ section_id: sectionId, film_id: filmId, position });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        toast.error('This film is already in the section');
      } else {
        toast.error('Failed to add film — ' + error.message);
      }
    },
  });
}

export function useRemoveFilmFromSection() {
  const invalidate = useInvalidateHomeSections();
  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from('home_section_films').delete().eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error('Failed to remove film — ' + error.message),
  });
}

/** Remplace le film d'un lien existant, sans changer sa position dans la bande. */
export function useReplaceFilmInSection() {
  const invalidate = useInvalidateHomeSections();
  return useMutation({
    mutationFn: async ({ linkId, filmId }: { linkId: string; filmId: string }) => {
      const { error } = await supabase.from('home_section_films').update({ film_id: filmId }).eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        toast.error('This film is already in the section');
      } else {
        toast.error('Failed to replace film — ' + error.message);
      }
    },
  });
}

/** Persiste un nouvel ordre de films dans une section (glisser-déposer). */
export function useReorderSectionFilms() {
  const invalidate = useInvalidateHomeSections();
  return useMutation({
    mutationFn: async (orderedLinkIds: string[]) => {
      await Promise.all(
        orderedLinkIds.map((id, position) =>
          supabase.from('home_section_films').update({ position }).eq('id', id)
        )
      );
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error('Failed to reorder films — ' + error.message),
  });
}

/**
 * Première modification d'une bande automatique (Popular, Must Watch, Festival
 * Selection, Super Short) : crée la section curée correspondante avec la liste de
 * films déjà voulue (l'ancienne liste automatique + la modification de l'admin),
 * en une seule fois. Les modifications suivantes passent par les hooks ci-dessus.
 */
export function useConvertSlotToCustomSection() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateHomeSections();
  return useMutation({
    mutationFn: async ({ slotKey, title, filmIds }: { slotKey: HomeSlotKey; title: string; filmIds: string[] }) => {
      const { count } = await supabase.from('home_sections').select('id', { count: 'exact', head: true });
      const { data: section, error } = await supabase
        .from('home_sections')
        .insert({ title, slot_key: slotKey, position: count ?? 0, is_visible: true })
        .select('id')
        .single();
      if (error) throw error;

      if (filmIds.length > 0) {
        const { error: filmsError } = await supabase
          .from('home_section_films')
          .insert(filmIds.map((filmId, position) => ({ section_id: section.id, film_id: filmId, position })));
        if (filmsError) throw filmsError;
      }
      return section.id as string;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['home-sections', 'admin'] });
    },
    onError: (error: Error) => toast.error('Failed to save changes — ' + error.message),
  });
}
