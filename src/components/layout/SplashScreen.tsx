import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import splashVideo from '@/assets/splash-video.mp4';

interface SplashScreenProps {
  show: boolean;
  onDone?: () => void;
}

export function SplashScreen({ show, onDone }: SplashScreenProps) {
  const mainRef = useRef<HTMLVideoElement>(null);
  const bgRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!show) return;

    // Safety net: skip after 3s max if video stalls or never loads
    const timeout = setTimeout(() => onDone?.(), 3000);

    const tryPlay = async (video: HTMLVideoElement | null, isMain: boolean) => {
      if (!video) return;
      try {
        video.currentTime = 0;
        await video.play();
      } catch {
        // Autoplay blocked — skip splash immediately on main video
        if (isMain) onDone?.();
      }
    };

    tryPlay(mainRef.current, true);
    tryPlay(bgRef.current, false);

    return () => clearTimeout(timeout);
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Fond flouté */}
          <video
            ref={bgRef}
            src={splashVideo}
            muted
            playsInline
            loop
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
            aria-hidden
          />
          {/* Vidéo principale */}
          <video
            ref={mainRef}
            src={splashVideo}
            muted
            playsInline
            onEnded={onDone}
            onError={onDone}
            className="relative w-full h-full object-contain"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
