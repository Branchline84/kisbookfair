import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CharacterMediaProps {
  src: string;
  className?: string;
  isAnimated?: boolean;
  isSpeaking?: boolean;
  mood?: 'happy' | 'neutral' | 'excited' | 'thinking';
  mode?: 'full' | 'profile'; 
}

// Map characters to their natural idle loop segment (in seconds)
const IDLE_TIMINGS: Record<string, number> = {
  'ara': 3.0,
  'gat': 2.0,
  'hobaek': 2.0
};

const ChromaKeyVideo: React.FC<{ 
  src: string; 
  isSpeaking: boolean; 
  className?: string;
  mode?: 'full' | 'profile';
}> = ({ src, isSpeaking, className, mode = 'full' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Extract character name from src (e.g., "ara.mp4" -> "ara")
  const charName = src.split('/').pop()?.split('.')[0] || 'ara';
  const idleEndTime = IDLE_TIMINGS[charName] || 2.0;

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;

    const processFrame = () => {
      if (video.paused || video.ended) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const length = frame.data.length;

      for (let i = 0; i < length; i += 4) {
        const r = frame.data[i];
        const g = frame.data[i + 1];
        const b = frame.data[i + 2];

        // Chroma key logic for green background
        if (g > 100 && g > r * 1.4 && g > b * 1.4) {
          frame.data[i + 3] = 0; 
        }
      }

      ctx.putImageData(frame, 0, 0);
      animationFrameId = requestAnimationFrame(processFrame);
    };

    video.addEventListener('play', processFrame);
    
    // Logic to handle idle looping vs full speaking
    const handleTimeUpdate = () => {
      if (!isSpeaking && video.currentTime >= idleEndTime) {
        video.currentTime = 0;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    
    // Auto-play as soon as possible
    video.play().catch(e => console.error("Initial play failed", e));
    
    return () => {
      video.removeEventListener('play', processFrame);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      cancelAnimationFrame(animationFrameId);
    };
  }, [src, isSpeaking, idleEndTime]);

  // Handle transitions between speaking and idle
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isSpeaking) {
      // When starting to speak, if we were in the middle of an idle loop, 
      // just let it play through to the talking parts.
      // Or we can jump to a known talking start if we want more precision.
      video.play().catch(e => console.error("Video play failed", e));
    } else {
      // When stopping, jump back to the start of the idle loop
      video.currentTime = 0;
      video.play().catch(e => console.error("Video idle play failed", e));
    }
  }, [isSpeaking]);

  return (
    <div className={`relative ${className} ${mode === 'profile' ? 'scale-150 origin-top' : ''}`}>
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        loop={isSpeaking} // Only native loop when speaking (otherwise we loop manually)
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain object-bottom"
      />
    </div>
  );
};

export const CharacterMedia: React.FC<CharacterMediaProps> = ({ 
  src, 
  className = "w-full h-full", 
  isAnimated = true,
  isSpeaking = false,
  mood = 'neutral',
  mode = 'full'
}) => {
  const isVideo = src.endsWith('.mp4');
  const imageSrc = isVideo ? src.replace('.mp4', 'img.png') : src;

  // Simplified variants (no more "floating" effect, just subtle scale for mood)
  const variants = {
    idle: {
      scale: 1,
    },
    thinking: {
      rotate: [0, -1, 1, 0],
      transition: { duration: 3, repeat: Infinity }
    },
    excited: {
      scale: [1, 1.05, 1],
      transition: { duration: 0.5, repeat: Infinity }
    }
  };

  const getActiveAnimation = () => {
    if (!isAnimated) return {};
    if (mood === 'thinking') return variants.thinking;
    if (mood === 'excited') return variants.excited;
    return variants.idle;
  };

  return (
    <div className={`relative flex items-center justify-center ${className} ${mode === 'profile' ? 'overflow-hidden rounded-full aspect-square' : ''}`}>
      {/* Shadow effect */}
      {mode === 'full' && (
        <motion.div 
          className="absolute bottom-4 w-1/2 h-4 bg-black/10 rounded-full blur-md"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      )}
      
      <AnimatePresence mode="wait">
        {isVideo ? (
          <motion.div
            key="video-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10"
          >
            <ChromaKeyVideo src={src} isSpeaking={isSpeaking} mode={mode} className="w-full h-full" />
          </motion.div>
        ) : (
          <motion.img
            key="image-layer"
            src={imageSrc}
            className={`w-full h-full object-contain pointer-events-none drop-shadow-2xl ${
              mode === 'profile' ? 'scale-150 origin-top' : 'object-bottom'
            }`}
            alt="character"
            animate={getActiveAnimation()}
          />
        )}
      </AnimatePresence>
      
      {/* Decorative mood elements */}
      {mood === 'excited' && (
        <motion.div 
          className="absolute -top-4 -right-4 text-4xl"
          animate={{ scale: [0, 1.2, 0], rotate: [0, 45, 90] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          ✨
        </motion.div>
      )}
    </div>
  );
};
