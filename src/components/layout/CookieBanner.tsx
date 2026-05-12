import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookieConsent')) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setVisible(false);
  };

  const refuse = () => {
    localStorage.setItem('cookieConsent', 'refused');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
      <div
        className="pointer-events-auto max-w-lg w-full rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{
          background: 'linear-gradient(145deg, hsl(270 20% 50% / 0.4), hsl(265 30% 40% / 0.3))',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          boxShadow: '0 8px 32px hsl(270 40% 10% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.08)',
          border: '1px solid hsl(0 0% 100% / 0.12)',
        }}
      >
        <p className="flex-1 text-xs text-muted-foreground leading-relaxed">
          We use cookies to improve your experience.{' '}
          <Link to="/privacy" className="underline hover:text-foreground transition-colors">
            Learn more
          </Link>.
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={refuse}
            className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-white/10 hover:border-white/20 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
