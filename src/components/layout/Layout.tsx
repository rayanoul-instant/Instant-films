import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  showNavLogo?: boolean;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-1 pb-24 md:pb-0 ${location.pathname !== '/' ? 'md:pt-20' : ''}`}>
        {children}
      </main>
    </div>
  );
}
