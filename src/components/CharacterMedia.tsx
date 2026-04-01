import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface CharacterMediaProps {
  src: string;
  idleSrc?: string;
  fallbackImage?: string;
  className?: string;
  isAnimated?: boolean;
  isSpeaking?: boolean;
  mood?: 'happy' | 'neutral' | 'excited' | 'thinking';
}

// Global cache to persist crop ratios across component remounts and character switches
const globalCropCache: Record<string, { topRatio: number; bottomRatio: number; canvasWidth: number; canvasHeight: number }> = {};

const ChromaKeyVideo: React.FC<{ src: string; idleSrc?: string; fallbackImage?: string; isSpeaking: boolean; className?: string }> = ({ src, idleSrc, fallbackImage, isSpeaking, className }) => {
  const speakingVideoRef = useRef<HTMLVideoElement>(null);
  const idleVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isCropped, setIsCropped] = useState(false);

  useEffect(() => {
    // Reset loaded state when character changes
    setVideoLoaded(false);
    setIsCropped(false);
  }, [src, idleSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;

    const processFrame = () => {
      const activeVideo = isSpeaking ? speakingVideoRef.current : (idleSrc ? idleVideoRef.current : speakingVideoRef.current);
      const activeSrc = isSpeaking ? src : (idleSrc || src);
      
      if (!activeVideo || activeVideo.ended || activeVideo.paused) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      if (activeVideo.readyState >= 2 && activeVideo.videoWidth > 0 && activeVideo.videoHeight > 0) {
        if (!videoLoaded) setVideoLoaded(true);
        
        // Dynamic crop detection for black bars
        if (!globalCropCache[activeSrc] && activeVideo.currentTime > 0.05) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = activeVideo.videoWidth;
          tempCanvas.height = activeVideo.videoHeight;
          const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
          
          if (tempCtx) {
            tempCtx.drawImage(activeVideo, 0, 0);
            const frame = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            
            let top = 0;
            let bottom = tempCanvas.height;
            
            // Find top bound (more robustly)
            for (let y = 0; y < tempCanvas.height; y++) {
              let isBlackRow = true;
              for (let x = 0; x < tempCanvas.width; x += 10) {
                const i = (y * tempCanvas.width + x) * 4;
                if (frame.data[i] > 15 || frame.data[i+1] > 15 || frame.data[i+2] > 15) {
                  isBlackRow = false;
                  break;
                }
              }
              if (!isBlackRow) {
                top = y;
                break;
              }
            }
            
            // Find bottom bound
            for (let y = tempCanvas.height - 1; y >= 0; y--) {
              let isBlackRow = true;
              for (let x = 0; x < tempCanvas.width; x += 10) {
                const i = (y * tempCanvas.width + x) * 4;
                if (frame.data[i] > 15 || frame.data[i+1] > 15 || frame.data[i+2] > 15) {
                  isBlackRow = false;
                  break;
                }
              }
              if (!isBlackRow) {
                bottom = y;
                break;
              }
            }
            
            if (bottom > top) {
              // Add a small safety margin (2px) to top and bottom to ensure edge artifacts are removed
              const safetyMargin = 2;
              const finalTop = Math.min(bottom - 1, top + safetyMargin);
              const finalBottom = Math.max(finalTop + 1, bottom - safetyMargin);
              
              globalCropCache[activeSrc] = { 
                topRatio: finalTop / tempCanvas.height, 
                bottomRatio: finalBottom / tempCanvas.height,
                canvasWidth: tempCanvas.width,
                canvasHeight: finalBottom - finalTop
              };
              console.log(`Detected and cached crop for ${activeSrc}:`, globalCropCache[activeSrc]);
              setIsCropped(true);
            } else {
              globalCropCache[activeSrc] = { 
                topRatio: 0, 
                bottomRatio: 1,
                canvasWidth: tempCanvas.width,
                canvasHeight: tempCanvas.height
              };
              setIsCropped(true);
            }
          }
        } else if (globalCropCache[activeSrc]) {
          if (!isCropped) setIsCropped(true);
        }

        // Only draw if we have crop info to avoid the "glitch" frame
        if (globalCropCache[activeSrc]) {
          const crop = globalCropCache[activeSrc];
          
          // 1. Use a FIXED internal resolution to normalize all characters
          // Increased width to 2000 to prevent horizontal clipping for wider videos (like Hobaek)
          const INTERNAL_WIDTH = 2000;
          const INTERNAL_HEIGHT = 1500;
          const TARGET_CHARACTER_HEIGHT = 1400; // Fixed height in pixels for the character on our canvas

          if (canvas.width !== INTERNAL_WIDTH || canvas.height !== INTERNAL_HEIGHT) {
            canvas.width = INTERNAL_WIDTH;
            canvas.height = INTERNAL_HEIGHT;
          }

          // 2. Calculate scale to make the character's height EXACTLY TARGET_CHARACTER_HEIGHT
          const videoWidth = activeVideo.videoWidth;
          const videoHeight = activeVideo.videoHeight;
          const cropTop = Math.floor(crop.topRatio * videoHeight);
          const cropBottom = Math.floor(crop.bottomRatio * videoHeight);
          const cropHeight = Math.max(1, cropBottom - cropTop);
          
          // Scale factor to normalize character height
          const scale = TARGET_CHARACTER_HEIGHT / cropHeight;
          const drawWidth = videoWidth * scale;
          const drawHeight = TARGET_CHARACTER_HEIGHT;
          
          // 3. Bottom-align and center horizontally
          const xOffset = (INTERNAL_WIDTH - drawWidth) / 2;
          const yOffset = INTERNAL_HEIGHT - drawHeight;

          ctx.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
          ctx.drawImage(activeVideo, 0, cropTop, videoWidth, cropHeight, xOffset, yOffset, drawWidth, drawHeight);
          
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const length = frame.data.length;

          for (let i = 0; i < length; i += 4) {
            const r = frame.data[i];
            const g = frame.data[i + 1];
            const b = frame.data[i + 2];

            const maxRB = Math.max(r, b);
            const greenness = g - maxRB;

            // 4. Advanced Chroma Key logic
            if (greenness > 30 && g > 50) {
              frame.data[i + 3] = 0;
            } else if (greenness > 10 && g > 40) {
              const alpha = 255 - ((greenness - 10) / 20) * 255;
              frame.data[i + 3] = Math.min(frame.data[i + 3], alpha);
              frame.data[i + 1] = maxRB + (greenness * 0.2); 
            } else if (r < 15 && g < 15 && b < 15) {
              // Extra cleanup for artifacts
              frame.data[i + 3] = Math.max(0, frame.data[i + 3] - 50);
            }
          }

          ctx.putImageData(frame, 0, 0);
        }
      }
      animationFrameId = requestAnimationFrame(processFrame);
    };

    animationFrameId = requestAnimationFrame(processFrame);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [src, idleSrc, isSpeaking, videoLoaded]);

  useEffect(() => {
    const speakVideo = speakingVideoRef.current;
    const idleVideo = idleVideoRef.current;

    const safePlay = (video: HTMLVideoElement | null) => {
      if (!video) return;
      const promise = video.play();
      if (promise !== undefined) {
        promise.catch(e => {
          if (e.name !== 'NotSupportedError' && e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
            console.error("Video play failed", e);
          }
        });
      }
    };

    if (isSpeaking) {
      if (idleVideo) idleVideo.pause();
      safePlay(speakVideo);
    } else {
      if (idleSrc) {
        if (speakVideo) {
          speakVideo.pause();
          speakVideo.currentTime = 0; // Reset to start
        }
        safePlay(idleVideo);
      } else {
        // If no idle video provided, use the main video as the idle loop
        safePlay(speakVideo);
      }
    }
  }, [isSpeaking, idleSrc]);

  // Initial play for idle video or main video if not speaking
  useEffect(() => {
    if (!isSpeaking) {
      if (idleSrc && idleVideoRef.current) {
        idleVideoRef.current.play().catch(() => {});
      } else if (speakingVideoRef.current) {
        speakingVideoRef.current.play().catch(() => {});
      }
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Fallback image while video is loading or if it fails */}
      {fallbackImage && !videoLoaded && (
        <img 
          src={fallbackImage} 
          className="absolute inset-0 w-full h-full object-contain object-bottom pointer-events-none drop-shadow-2xl z-0"
          alt="fallback"
          referrerPolicy="no-referrer"
        />
      )}
      <video
        ref={speakingVideoRef}
        src={src}
        muted
        playsInline
        loop
        className="hidden"
        crossOrigin="anonymous"
      />
      {idleSrc && (
        <video
          ref={idleVideoRef}
          src={idleSrc}
          muted
          playsInline
          loop
          className="hidden"
          crossOrigin="anonymous"
        />
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain object-bottom relative z-10 transition-opacity duration-500 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

export const CharacterMedia: React.FC<CharacterMediaProps> = ({ 
  src, 
  idleSrc,
  fallbackImage,
  className = "w-full h-full", 
  isAnimated = true,
  isSpeaking = false,
  mood = 'neutral'
}) => {
  const isVideo = src.endsWith('.mp4');

  if (isVideo) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* Shadow effect */}
        <motion.div 
          className="absolute bottom-4 w-1/2 h-4 bg-black/10 rounded-full blur-md"
          animate={isSpeaking ? { scale: [1, 1.1, 0.9, 1] } : { scale: [1, 1.05, 1] }}
          transition={{ duration: isSpeaking ? 0.4 : 4, repeat: Infinity }}
        />
        <ChromaKeyVideo src={src} idleSrc={idleSrc} fallbackImage={fallbackImage} isSpeaking={isSpeaking} className="w-full h-full" />
      </div>
    );
  }


  // Define animation variants for different states
  const variants = {
    idle: {
      y: [0, -8, 0],
      rotate: [0, 1, -1, 0],
      scale: [1, 1.02, 1],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    speaking: {
      scaleY: [1, 1.05, 0.98, 1.03, 1],
      scaleX: [1, 0.98, 1.02, 0.99, 1],
      y: [0, -4, 0],
      rotate: [0, -2, 2, -1, 1, 0],
      transition: {
        duration: 0.4,
        repeat: Infinity,
        ease: "linear"
      }
    },
    thinking: {
      rotate: [0, -3, 3, 0],
      x: [0, -2, 2, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    excited: {
      y: [0, -20, 0],
      scale: [1, 1.1, 1],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 0.5,
        repeat: Infinity,
        ease: "easeOut"
      }
    }
  };

  const getActiveAnimation = () => {
    if (!isAnimated) return {};
    if (isSpeaking) return variants.speaking;
    if (mood === 'thinking') return variants.thinking;
    if (mood === 'excited') return variants.excited;
    return variants.idle;
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Shadow effect */}
      <motion.div 
        className="absolute bottom-4 w-1/2 h-4 bg-black/10 rounded-full blur-md"
        animate={isSpeaking ? { scale: [1, 1.1, 0.9, 1] } : { scale: [1, 1.05, 1] }}
        transition={{ duration: isSpeaking ? 0.4 : 4, repeat: Infinity }}
      />
      
      <motion.img
        src={src}
        className="w-full h-full object-contain object-bottom pointer-events-none drop-shadow-2xl"
        alt="character"
        animate={getActiveAnimation()}
      />
      
      {/* Optional: Add "sparkles" or "emojis" when excited */}
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
