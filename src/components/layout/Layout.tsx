import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  showNavLogo?: boolean;
  hideFooter?: boolean;
}

export function Layout({ children, hideFooter: hideFooterProp }: LayoutProps) {
  const location = useLocation();

  const hideFooter =
    hideFooterProp ||
    location.pathname.startsWith('/courts-metrages/');

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
