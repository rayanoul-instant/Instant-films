import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Star, Share2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import logoInstant from '@/assets/logo-instant.png';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  durationMinutes?: number;
  onPlay?: () => void;
  onRate?: () => void;
  onShare?: () => void;
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&#]+)/,
    /youtube\.com\/watch\?v=([^&#]+)/,
    /youtube\.com\/embed\/([^?&#]+)/,
    /youtube\.com\/shorts\/([^?&#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function VideoPlayer({ src, poster, durationMinutes, onPlay, onRate, onShare }: VideoPlayerProps) {
  const youtubeId = getYouTubeId(src);

  if (youtubeId) {
    return <YouTubePlayer youtubeId={youtubeId} poster={poster} durationMinutes={durationMinutes} onPlay={onPlay} onRate={onRate} onShare={onShare} />;
  }

  return <NativeVideoPlayer src={src} poster={poster} onPlay={onPlay} />;
}

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void; }
}

function loadYTApi(): Promise<void> {
  return new Promise(resolve => {
    if (window.YT?.Player) { resolve(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
  });
}

function YouTubePlayer({ youtubeId, poster, durationMinutes, onPlay, onRate, onShare }: {
  youtubeId: string; poster?: string; durationMinutes?: number; onPlay?: () => void; onRate?: () => void; onShare?: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [nearEnd, setNearEnd] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (!started || !containerRef.current) return;

    loadYTApi().then(() => {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: youtubeId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: (e: any) => { e.target.playVideo(); onPlay?.(); },
          onStateChange: (e: any) => {
            if (e.data === window.YT.PlayerState.ENDED) {
              setEnded(true);
              setNearEnd(false);
              clearInterval(intervalRef.current);
            }
            if (e.data === window.YT.PlayerState.PLAYING) {
              setEnded(false);
              intervalRef.current = setInterval(() => {
                const p = playerRef.current;
                if (!p) return;
                const duration = p.getDuration?.();
                const current = p.getCurrentTime?.();
                const threshold = (durationMinutes !== undefined && durationMinutes < 3) ? 2 : 20;
                if (duration && current && duration - current <= threshold && !dismissed) {
                  setNearEnd(true);
                }
              }, 500);
            }
            if (e.data === window.YT.PlayerState.PAUSED) {
              clearInterval(intervalRef.current);
            }
          },
        },
      });
    });

    return () => {
      clearInterval(intervalRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [started, youtubeId]);

  const handleReplay = () => {
    setEnded(false);
    setNearEnd(false);
    setDismissed(false);
    playerRef.current?.seekTo(0);
    playerRef.current?.playVideo();
  };

  if (!started) {
    const thumbnailUrl = poster || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    return (
      <div
        className="relative aspect-video bg-black rounded-xl overflow-hidden cursor-pointer group"
        onClick={() => { setStarted(true); setEnded(false); setNearEnd(false); setDismissed(false); }}
      >
        <img src={thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center animate-glow">
            <Play className="w-10 h-10 text-primary-foreground fill-primary-foreground ml-1" />
          </div>
        </div>
      </div>
    );
  }

  const showOverlay = (nearEnd || ended) && !dismissed;

  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.85) 100%)' }}
        >
          <div className="flex flex-col items-center gap-5 px-6 text-center">
            {/* Logo */}
            <img src={logoInstant} alt="Instant" className="h-12 object-contain opacity-90" />

            {ended ? (
              <>
                <p className="text-white/70 text-sm">What did you think of this film?</p>
                <div className="flex gap-3">
                  <button
                    onClick={onRate}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm"
                  >
                    <Star className="w-4 h-4 fill-primary-foreground" />
                    Rate
                  </button>
                  <button
                    onClick={onShare}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-white font-medium hover:bg-white/20 transition-colors text-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
                <button
                  onClick={handleReplay}
                  className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors text-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  Watch again
                </button>
              </>
            ) : (
              <>
                <p className="text-white/70 text-sm">Did you enjoy this film?</p>
                <div className="flex gap-3">
                  <button
                    onClick={onRate}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm"
                  >
                    <Star className="w-4 h-4 fill-primary-foreground" />
                    Rate
                  </button>
                  <button
                    onClick={onShare}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-white font-medium hover:bg-white/20 transition-colors text-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-white/40 hover:text-white/70 transition-colors text-xs underline"
                >
                  Keep watching
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NativeVideoPlayer({ src, poster, onPlay }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
        onPlay?.();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      const time = (value[0] / 100) * videoRef.current.duration;
      videoRef.current.currentTime = time;
      setProgress(value[0]);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="relative aspect-video bg-black rounded-xl overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onClick={togglePlay}
      />

      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center animate-glow">
            <Play className="w-10 h-10 text-primary-foreground fill-primary-foreground ml-1" />
          </div>
        </div>
      )}

      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <Slider
          value={[progress]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="mb-4"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={togglePlay} className="text-foreground hover:bg-white/20">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-foreground" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleMute} className="text-foreground hover:bg-white/20">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <span className="text-sm text-foreground/80">
              {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-foreground hover:bg-white/20">
            <Maximize className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
