export type FilmGenre = 'drama' | 'comedy' | 'horror' | 'scifi' | 'documentary' | 'animation' | 'experimental' | 'romance' | 'thriller' | 'fantasy' | 'mainstream' | 'kid';

export interface AvatarAccessories {
  color?: string;
  hat?: string;
  glasses?: string;
  mask?: string;
}

export interface Film {
  id: string;
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

export interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_base: string;
  avatar_accessories: AvatarAccessories | null;
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
  film?: Pick<Film, 'id' | 'title' | 'thumbnail_url'>;
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
  horror: 'Horror',
  scifi: 'Sci-Fi',
  documentary: 'Documentary',
  animation: 'Animation',
  experimental: 'Experimental',
  romance: 'Romance',
  thriller: 'Thriller',
  fantasy: 'Fantasy',
  mainstream: 'Mainstream',
  kid: 'Kid',
};

export const AVATAR_BASES = ['default', 'cat', 'dog', 'robot', 'alien', 'ghost'];
