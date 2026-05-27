import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoInstant from '@/assets/logo-instant.png';

interface SplashScreenProps {
  show: boolean;
  onDone?: () => void;
}

export function SplashScreen({ show, onDone }: SplashScreenProps) {
  useEffect(() => {
    if (!show) return;
    const timeout = setTimeout(() => onDone?.(), 1800);
    return () => clearTimeout(timeout);
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'linear-gradient(180deg, hsl(275 45% 22%) 0%, hsl(265 30% 9%) 100%)' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          <motion.img
            src={logoInstant}
            alt="Instant Films"
            className="w-48 md:w-64"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
