export type FilmGenre = 'drama' | 'comedy' | 'animation' | 'horror' | 'romance' | 'scifi' | 'experimental' | 'kid' | 'mainstream';

export interface AvatarAccessories {
  color?: string;
  hat?: string;
  glasses?: string;
  mask?: string;
}

export interface Film {
  id: string;
  slug: string;
  title: string;
  display_title: string | null;
  synopsis: string | null;
  duration_minutes: number;
  video_url: string;
  thumbnail_url: string | null;
  genres: FilmGenre[];
  themes: string[];
  release_year: number | null;
  director: string | null;
  is_featured: boolean;
  view_count: number;
  quality_score: number;
  created_at: string;
  updated_at: string;
  average_rating?: number;
}

export interface HomeSection {
  id: string;
  title: string;
  position: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface HomeSectionFilm {
  id: string;
  section_id: string;
  film_id: string;
  position: number;
  created_at: string;
}

export interface HomeSectionWithFilms extends HomeSection {
  films: Film[];
}

export interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_base: string;
  avatar_accessories: AvatarAccessories | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface FilmRating {
  id: string;
  film_id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
  profile?: Pick<Profile, 'id' | 'username' | 'avatar_accessories'>;
}

export interface Favorite {
  id: string;
  user_id: string;
  film_id: string;
  created_at: string;
  film?: Film;
}

export interface WatchHistory {
  id: string;
  user_id: string;
  film_id: string;
  watched_at: string;
  progress_seconds: number;
  film?: Film;
}

export interface Discussion {
  id: string;
  title: string;
  content: string;
  author_id: string;
  film_id: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  profile?: Pick<Profile, 'id' | 'username' | 'avatar_accessories'>;
  film?: Pick<Film, 'id' | 'slug' | 'title' | 'thumbnail_url'>;
}

export interface Comment {
  id: string;
  discussion_id: string;
  author_id: string;
  content: string;
  parent_id: string | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
  profile?: Pick<Profile, 'id' | 'username' | 'avatar_accessories'>;
  replies?: Comment[];
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ReviewLike {
  id: string;
  user_id: string;
  rating_id: string;
  created_at: string;
}

export const getFilmTitle = (film: Pick<Film, 'title' | 'display_title'>) =>
  film.display_title || film.title;

export const GENRE_LABELS: Record<FilmGenre, string> = {
  drama: 'Drama',
  comedy: 'Comedy',
  animation: 'Animation',
  horror: 'Horror',
  romance: 'Romance',
  scifi: 'Sci-Fi',
  experimental: 'Experimental',
  kid: 'Kid',
  mainstream: 'Mainstream',
};

// Partagé entre GenrePage.tsx (client) et middleware.ts (SSR) pour rester en sync.
export const GENRE_DESCRIPTIONS: Partial<Record<FilmGenre, string>> = {
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

export const AVATAR_BASES = ['default', 'cat', 'dog', 'robot', 'alien', 'ghost'];

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
