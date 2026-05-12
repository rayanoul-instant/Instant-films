import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  showNavLogo?: boolean;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-1 pb-6 md:pb-0 ${location.pathname !== '/' ? 'md:pt-20' : ''}`}>
        {children}
      </main>
      {/* pb-28 on mobile so footer clears the fixed BottomNav */}
      <div className="pb-28 md:pb-0">
        <Footer />
      </div>
    </div>
  );
}
