import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageSquareText, User } from 'lucide-react';
import { useState } from 'react';
import { useUnreadMessagesCount } from '@/hooks/useMessages';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/messages', label: 'Messages', icon: MessageSquareText },
  { href: '/account', label: 'Account', icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { data: unreadCount = 0 } = useUnreadMessagesCount();

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none md:hidden">
      <nav className="pointer-events-auto relative mb-5 mx-4">
        <div
          className="flex items-center gap-2 rounded-[28px] px-3 py-2.5 relative"
          style={{
            background: 'linear-gradient(145deg, hsl(270 20% 50% / 0.35), hsl(265 30% 40% / 0.25))',
            backdropFilter: 'blur(24px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
            boxShadow: '0 8px 32px hsl(270 40% 10% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.08), inset 0 -1px 0 hsl(270 30% 20% / 0.3)',
            border: '1px solid hsl(0 0% 100% / 0.12)',
          }}
        >
          {navItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                onMouseEnter={() => setHoveredItem(item.href)}
                onMouseLeave={() => setHoveredItem(null)}
                className="relative w-16 h-14 rounded-[20px] flex items-center justify-center transition-all duration-300"
                style={{
                  background: active
                    ? 'linear-gradient(145deg, hsl(0 0% 100% / 0.22), hsl(0 0% 100% / 0.10))'
                    : 'transparent',
                  boxShadow: active
                    ? 'inset 0 1px 0 hsl(0 0% 100% / 0.15), 0 2px 8px hsl(270 40% 10% / 0.2)'
                    : 'none',
                }}
              >
                <item.icon
                  className="w-6 h-6"
                  style={{
                    color: active
                      ? 'hsl(0 0% 100%)'
                      : hoveredItem === item.href
                        ? 'hsl(270 20% 85%)'
                        : 'hsl(270 15% 70%)',
                    transform: hoveredItem === item.href ? 'scale(1.25)' : 'scale(1)',
                    transition: 'transform 0.2s ease, color 0.2s ease',
                  }}
                  strokeWidth={active ? 2 : 1.5}
                />
                {item.href === '/messages' && unreadCount > 0 && (
                  <span className="absolute top-3 right-3 w-3 h-3 rounded-full bg-red-500" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
