-- Sections de la page d'accueil, choisies manuellement par les admins.
CREATE TABLE public.home_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Films rattachés à une section, avec leur propre ordre.
CREATE TABLE public.home_section_films (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.home_sections(id) ON DELETE CASCADE,
  film_id uuid NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, film_id)
);

CREATE INDEX idx_home_section_films_section ON public.home_section_films(section_id);
CREATE INDEX idx_home_section_films_film ON public.home_section_films(film_id);

ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_section_films ENABLE ROW LEVEL SECURITY;

-- Lecture publique, écriture réservée aux admins (même pattern que films,
-- via la fonction public.is_admin() déjà en place).
CREATE POLICY "Home sections are publicly readable"
  ON public.home_sections FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert home sections"
  ON public.home_sections FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update home sections"
  ON public.home_sections FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete home sections"
  ON public.home_sections FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Home section films are publicly readable"
  ON public.home_section_films FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert home section films"
  ON public.home_section_films FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update home section films"
  ON public.home_section_films FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete home section films"
  ON public.home_section_films FOR DELETE
  USING (public.is_admin());
