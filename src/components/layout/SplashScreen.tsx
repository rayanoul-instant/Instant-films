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

    // Safety net: skip after 8s max if video stalls or never loads
    const timeout = setTimeout(() => onDone?.(), 8000);

    const tryPlay = async (video: HTMLVideoElement | null) => {
      if (!video) return;
      try {
        video.currentTime = 0;
        await video.play();
      } catch {
        // Autoplay blocked — onDone will fire via timeout
      }
    };

    tryPlay(mainRef.current);
    tryPlay(bgRef.current);

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
