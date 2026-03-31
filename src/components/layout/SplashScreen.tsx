import { motion, AnimatePresence } from 'framer-motion';
import splashVideo from '@/assets/splash-video.mp4';

interface SplashScreenProps {
  show: boolean;
  onDone?: () => void;
}

export function SplashScreen({ show, onDone }: SplashScreenProps) {
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
            src={splashVideo}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
            aria-hidden
          />
          {/* Vidéo principale */}
          <video
            src={splashVideo}
            autoPlay
            muted
            playsInline
            onEnded={onDone}
            className="relative w-full h-full object-contain"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
