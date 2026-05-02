import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigationType } from 'react-router-dom';

import { Search } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { FilmGrid } from '@/components/films/FilmGrid';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useFilms } from '@/hooks/useFilms';
import { FilmGenre, GENRE_LABELS } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useFollowingList } from '@/hooks/useFollowers';
import { useAuth } from '@/hooks/useAuth';

const GENRES: FilmGenre[] = [
  'drama', 'comedy', 'animation', 'horror', 'romance', 'scifi', 'experimental', 'kid', 'mainstream'
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const initialSearch = searchParams.get('search') || '';
  const initialSort = (searchParams.get('sortBy') as 'newest' | 'popular' | 'rating') || 'popular';
  const initialGenre = searchParams.get('genre') as FilmGenre | null;

  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'rating'>(initialSort);
  const [selectedGenre, setSelectedGenre] = useState<FilmGenre | null>(initialGenre);
  const [allUsers, setAllUsers] = useState<{ id: string; username: string }[]>([]);
  const [category, setCategory] = useState<'movies' | 'users'>('movies');
  const [userTab, setUserTab] = useState<'all' | 'friends'>('all');

  const navType = useNavigationType();

  const { data: films, isLoading } = useFilms({
    search: category === 'users' ? '' : search,
    sortBy,
    genre: selectedGenre || undefined,
  });

  const scrollRestored = useRef(false);

  // Restore: scroll the last clicked film into view (once, only on back navigation)
  useEffect(() => {
    if (navType !== 'POP' || isLoading || scrollRestored.current) return;
    const lastId = sessionStorage.getItem('lastClickedFilm');
    if (!lastId) return;
    const el = document.getElementById(`film-${lastId}`);
    if (el) {
      scrollRestored.current = true;
      sessionStorage.removeItem('lastClickedFilm');
      el.scrollIntoView({ block: 'center' });
    }
  }, [navType, isLoading]);

  // On fresh navigation (not back), clear lastClickedFilm and scroll to top
  useEffect(() => {
    if (navType !== 'POP') {
      sessionStorage.removeItem('lastClickedFilm');
    }
  }, [navType]);


  const { data: friendsList = [] } = useFollowingList();

  const handleSearch = async (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams);
    if (value) params.set('search', value);
    else params.delete('search');
    setSearchParams(params);

    if (value.length >= 2) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${value}%`)
        .neq('id', user?.id || '')
        .limit(20);
      setAllUsers(data || []);
    } else {
      setAllUsers([]);
    }
  };

  const handleGenreChange = (genre: FilmGenre | null) => {
    setSelectedGenre(genre);
    const params = new URLSearchParams(searchParams);
    if (genre) params.set('genre', genre);
    else params.delete('genre');
    setSearchParams(params);
  };

  const displayedUsers = userTab === 'friends'
    ? friendsList.filter(f => !search || f.username.toLowerCase().includes(search.toLowerCase()))
    : allUsers;

  return (
    <Layout>
      <div className="container px-4 py-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={category === 'movies' ? 'Search films, directors...' : 'Search users...'}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 bg-secondary border-border h-12 text-base rounded-xl"
          />
        </div>

        <div className="flex gap-2 mb-4">
          {(['movies', 'users'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat === 'movies' ? 'Movies' : 'Users'}
            </button>
          ))}
        </div>

        {category === 'movies' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[160px] bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="popular">Most popular</SelectItem>
                  <SelectItem value="rating">Top rated</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{films?.length || 0} results</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
              <button
                onClick={() => handleGenreChange(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedGenre === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => handleGenreChange(genre)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedGenre === genre
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {GENRE_LABELS[genre]}
                </button>
              ))}
            </div>

            <FilmGrid films={films || []} loading={isLoading} />
          </>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              {([
                { key: 'all', label: 'All users' },
                { key: 'friends', label: 'Your friends' },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setUserTab(tab.key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    userTab === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {displayedUsers.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  {userTab === 'friends' ? 'No friends yet' : 'Search for a user'}
                </p>
              ) : (
                displayedUsers.map((u) => (
                  <Link
                    key={u.id}
                    to={`/user/${u.id}`}
                    className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-secondary transition-colors"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {u.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.username}</span>
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
