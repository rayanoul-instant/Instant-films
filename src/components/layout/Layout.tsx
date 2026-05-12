import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  showNavLogo?: boolean;
}

const HIDE_FOOTER_PATHS = ['/courts-metrages/'];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const hideFooter =
    HIDE_FOOTER_PATHS.some(p => location.pathname.startsWith(p)) ||
    (location.pathname === '/messages' && location.search.includes('with='));

  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-1 pb-6 md:pb-0 ${location.pathname !== '/' ? 'md:pt-20' : ''}`}>
        {children}
      </main>
      {!hideFooter && (
        <div className="pb-28 md:pb-0">
          <Footer />
        </div>
      )}
    </div>
  );
}
