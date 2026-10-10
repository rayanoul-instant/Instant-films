-- Lie une section curée à une bande automatique précise (popular, must_watch,
-- festival_selection, super_short). NULL = section libre créée via /admin/home,
-- non rattachée à une bande automatique.
ALTER TABLE public.home_sections ADD COLUMN slot_key text;

-- Une seule section curée par bande automatique.
CREATE UNIQUE INDEX idx_home_sections_slot_key
  ON public.home_sections(slot_key)
  WHERE slot_key IS NOT NULL;
