import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full py-5 px-6 flex items-center justify-center gap-4 text-xs text-muted-foreground/50">
      <Link to="/legal" className="hover:text-muted-foreground transition-colors">
        Legal notices
      </Link>
      <span className="text-muted-foreground/25">·</span>
      <Link to="/privacy" className="hover:text-muted-foreground transition-colors">
        Privacy policy
      </Link>
      <span className="text-muted-foreground/25">·</span>
      <Link to="/terms" className="hover:text-muted-foreground transition-colors">
        Terms of use
      </Link>
    </footer>
  );
}
