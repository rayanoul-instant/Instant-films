ALTER TABLE films
  ADD COLUMN IF NOT EXISTS yt_description text,
  ADD COLUMN IF NOT EXISTS yt_views bigint,
  ADD COLUMN IF NOT EXISTS yt_likes bigint,
  ADD COLUMN IF NOT EXISTS yt_comments bigint,
  ADD COLUMN IF NOT EXISTS yt_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS yt_fetched_at timestamptz;

COMMENT ON COLUMN films.yt_description IS 'Description YouTube brute, récupérée via videos.list (part=snippet).';
COMMENT ON COLUMN films.yt_views IS 'Nombre de vues YouTube au moment du fetch.';
COMMENT ON COLUMN films.yt_likes IS 'Nombre de likes YouTube au moment du fetch (NULL si masqué par le créateur).';
COMMENT ON COLUMN films.yt_comments IS 'Nombre de commentaires YouTube au moment du fetch (NULL si commentaires désactivés).';
COMMENT ON COLUMN films.yt_published_at IS 'Date de publication YouTube de la vidéo.';
COMMENT ON COLUMN films.yt_fetched_at IS 'Date du dernier fetch YouTube réussi — sert de marqueur "déjà récupéré" pour fetch-youtube-stats.mjs.';
