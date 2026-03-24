import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Webcam from 'react-webcam';
import { Camera, Sparkles, RotateCcw } from 'lucide-react';
import { Character } from '../types';
import { CharacterMedia } from './CharacterMedia';
import { CHARACTERS } from '../constants';

interface PhotoBoothProps {
  character: Character;
  onCapture: (imageSrc: string) => void;
  key?: string;
}

export function PhotoBooth({ character: initialCharacter, onCapture }: PhotoBoothProps) {
  const webcamRef = useRef<Webcam>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const [selectedChar, setSelectedChar] = useState<Character>(initialCharacter);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startCapture = () => {
    setCountdown(5);
  };

  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Take photo
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // 카메라 화면 그리기
            ctx.drawImage(img, 0, 0);
            
            // 캐릭터 미디어 가져오기
            const characterVideo = characterRef.current?.querySelector('video');
            const characterImg = characterRef.current?.querySelector('img');
            const characterCanvas = characterRef.current?.querySelector('canvas');
            const mediaElement = characterCanvas || characterVideo || characterImg;

            if (mediaElement) {
              const charHeight = canvas.height * 0.9; // 크기 확대
              let aspectRatio = 1;
              
              if (mediaElement instanceof HTMLVideoElement) {
                aspectRatio = mediaElement.videoWidth / mediaElement.videoHeight || 1;
              } else if (mediaElement instanceof HTMLImageElement) {
                aspectRatio = mediaElement.naturalWidth / mediaElement.naturalHeight || 1;
              } else if (mediaElement instanceof HTMLCanvasElement) {
                aspectRatio = mediaElement.width / mediaElement.height || 1;
              }
              
              const charWidth = aspectRatio * charHeight;
              
              // 캐릭터 우측에 배치
              ctx.drawImage(
                mediaElement as CanvasImageSource, 
                canvas.width - charWidth, 
                canvas.height - charHeight, 
                charWidth, 
                charHeight
              );
            }

            // Footer / Branding Overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
            
            ctx.fillStyle = 'white';
            ctx.font = 'black 24px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('사단법인 한국소공인협회', 40, canvas.height - 35);
            
            ctx.textAlign = 'right';
            ctx.fillText('파주인쇄소공인특화지원센터', canvas.width - 40, canvas.height - 35);
            
            // 최종 이미지를 생성하여 전달
            const finalImage = canvas.toDataURL('image/jpeg', 0.95);
            onCapture(finalImage);
          }
        };
        img.src = imageSrc;
      }
    }
  }, [countdown, onCapture, selectedChar]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full bg-slate-950 relative flex flex-col overflow-hidden"
    >
      <div className="relative flex-1 group">
        {/* @ts-ignore */}
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ 
            facingMode: "user",
            width: 1920,
            height: 1080
          }}
          className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1]"
        />
        
        {/* Brand Overlay (Premium Look) */}
        <div className="absolute top-8 left-8 flex items-center gap-3 bg-black/40 backdrop-blur-xl px-6 py-3 rounded-full border border-white/20 z-30">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Sparkles className="text-white" size={20} />
          </div>
          <span className="text-white font-black tracking-widest uppercase text-sm">KSA AI PHOTOBOOT</span>
        </div>

        {/* Character Overlay */}
        <div ref={characterRef} className="absolute bottom-0 right-0 w-[60%] h-[90%] pointer-events-none z-10">
          <AnimatePresence mode="wait">
            <motion.div 
              key={selectedChar.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="w-full h-full"
            >
              <CharacterMedia 
                src={selectedChar.image}
                mood={countdown !== null ? 'excited' : 'neutral'}
                className="w-full h-full drop-shadow-[0_0_50px_rgba(255,255,255,0.2)]"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Text Overlay (Visible on Screen) */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between px-12 pb-8 z-20 pointer-events-none">
          <div className="text-white flex flex-col items-start translate-y-2">
            <span className="text-xs font-black text-indigo-400 tracking-widest uppercase mb-1">KOREA SMALL ASSOCIATED</span>
            <span className="text-xl font-black tracking-tight">사단법인 한국소공인협회</span>
          </div>
          <div className="text-white text-right translate-y-2">
            <span className="text-xl font-black tracking-tight">파주인쇄소공인특화지원센터</span>
          </div>
        </div>

        {/* Countdown Overlay */}
        <AnimatePresence>
          {countdown !== null && countdown > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md z-40"
            >
              <motion.div 
                key={countdown}
                initial={{ scale: 3, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.2, opacity: 0, rotate: 10 }}
                className="text-[250px] font-black text-white drop-shadow-[0_0_50px_rgba(129,140,248,0.8)] leading-none"
              >
                {countdown}
              </motion.div>
              <motion.span 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-white text-4xl font-black tracking-[1em] mt-8 uppercase"
              >
                Smile!
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Area */}
      <div className="bg-slate-950 p-8 flex flex-col gap-8 z-50">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            {CHARACTERS.map(char => (
              <button
                key={char.id}
                onClick={() => setSelectedChar(char)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2 ${
                  selectedChar.id === char.id 
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                    : 'bg-white/5 border-transparent opacity-60'
                }`}
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10">
                  <img src={char.profileImage || char.image} alt={char.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-white text-xs font-black">{char.name}</span>
              </button>
            ))}
          </div>

          {countdown === null ? (
            <button 
              onClick={startCapture}
              className="py-6 px-16 rounded-full font-black text-3xl text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center gap-4 shadow-2xl shadow-indigo-500/40 active:scale-95 group"
            >
              <Camera size={40} className="group-hover:rotate-12 transition-transform" />
              지금 촬영하기
            </button>
          ) : (
            <div className="px-16 py-6 rounded-full bg-white/5 border border-white/10 flex items-center gap-4 text-white">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-ping" />
              <span className="text-2xl font-black">심호흡 하세요!</span>
            </div>
          )}

          <button 
            onClick={() => window.location.reload()}
            className="p-6 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all border border-white/10"
          >
            <RotateCcw size={32} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
