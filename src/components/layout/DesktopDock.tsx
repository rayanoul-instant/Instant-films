import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search as SearchIcon, MessageSquareText, User } from 'lucide-react';
import { useState } from 'react';
import { useUnreadMessagesCount } from '@/hooks/useMessages';

const dockItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: SearchIcon },
  { href: '/messages', label: 'Messages', icon: MessageSquareText },
  { href: '/account', label: 'Account', icon: User },
];

export function DesktopDock() {
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { data: unreadCount = 0 } = useUnreadMessagesCount();

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 hidden md:flex">
      <div
        className="flex items-center gap-3 rounded-[24px] px-4 py-2 relative"
        style={{
          background: 'linear-gradient(145deg, hsl(270 20% 50% / 0.35), hsl(265 30% 40% / 0.25))',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          boxShadow: '0 8px 32px hsl(270 40% 10% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.08), inset 0 -1px 0 hsl(270 30% 20% / 0.3)',
          border: '1px solid hsl(0 0% 100% / 0.12)',
        }}
      >
        {dockItems.map((item) => {
          const active = isActive(item.href);
          const hovered = hoveredItem === item.href;

          return (
            <div key={item.href}>
              <Link
                to={item.href}
                onMouseEnter={() => setHoveredItem(item.href)}
                onMouseLeave={() => setHoveredItem(null)}
                className="group relative w-11 h-11 rounded-[14px] flex items-center justify-center transition-all duration-300"
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
                  className="w-5 h-5"
                  style={{
                    color: active
                      ? 'hsl(0 0% 100%)'
                      : hovered
                        ? 'hsl(270 20% 85%)'
                        : 'hsl(270 15% 65%)',
                    transform: hovered ? 'scale(1.25)' : 'scale(1)',
                    transition: 'transform 0.2s ease, color 0.2s ease',
                  }}
                  strokeWidth={active ? 2 : 1.5}
                />
                {item.href === '/messages' && unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-red-500" />
                )}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
