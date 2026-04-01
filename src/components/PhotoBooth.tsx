import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import Webcam from 'react-webcam';
import { Camera } from 'lucide-react';
import { Character } from '../types';
import { CharacterMedia } from './CharacterMedia';

interface PhotoBoothProps {
  character: Character;
  onCapture: (imageSrc: string) => void;
  key?: string;
}

export function PhotoBooth({ character, onCapture }: PhotoBoothProps) {
  const webcamRef = useRef<Webcam>(null);
  const characterRef = useRef<HTMLDivElement>(null);
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
            // 카메라 화면 그리기 (좌우 반전 적용)
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0);
            ctx.restore();
            
            // 캐릭터 미디어 가져오기 (비디오, 이미지 또는 캔버스)
            const characterVideo = characterRef.current?.querySelector('video');
            const characterImg = characterRef.current?.querySelector('img');
            const characterCanvas = characterRef.current?.querySelector('canvas');
            const mediaElement = characterCanvas || characterVideo || characterImg;

            if (mediaElement) {
              // 캐릭터 크기 조정 및 그리기
              // 캐릭터를 우측 하단에 배치 (화면 높이의 약 80% 크기로)
              const charHeight = canvas.height * 0.8;
              let aspectRatio = 1;
              
              if (mediaElement instanceof HTMLVideoElement) {
                aspectRatio = mediaElement.videoWidth / mediaElement.videoHeight || 1;
              } else if (mediaElement instanceof HTMLImageElement) {
                aspectRatio = mediaElement.naturalWidth / mediaElement.naturalHeight || 1;
              } else if (mediaElement instanceof HTMLCanvasElement) {
                aspectRatio = mediaElement.width / mediaElement.height || 1;
              }
              
              const charWidth = (aspectRatio || 1) * charHeight;
              
              ctx.drawImage(
                mediaElement as CanvasImageSource, 
                canvas.width - charWidth - 20, 
                canvas.height - charHeight, 
                charWidth, 
                charHeight
              );
            }
            
            // 최종 이미지를 생성하여 전달
            const finalImage = canvas.toDataURL('image/jpeg', 0.9);
            onCapture(finalImage);
          }
        };
        img.src = imageSrc;
      }
    }
  }, [countdown, onCapture, character]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full bg-white relative flex flex-col"
    >
      <div className="relative flex-1 bg-white">
        {/* @ts-ignore */}
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "user" }}
          className="w-full h-full object-cover scale-x-[-1]"
        />
        
        {/* Character Overlay */}
        <div ref={characterRef} className="absolute bottom-0 right-0 w-1/2 h-full pointer-events-none z-10">
          <CharacterMedia 
            src={character.image}
            idleSrc={character.idleImage}
            mood={countdown !== null ? 'excited' : 'neutral'}
          />
        </div>

        {/* Countdown Overlay */}
        {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
            <motion.div 
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-9xl font-black text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
            >
              {countdown}
            </motion.div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 flex justify-center items-center">
        {countdown === null ? (
          <button 
            onClick={startCapture}
            className="py-4 px-12 rounded-full font-bold text-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-3 shadow-lg hover:shadow-xl"
          >
            <Camera size={28} /> 촬영 시작하기
          </button>
        ) : (
          <div className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            촬영 준비 중...
          </div>
        )}
      </div>
    </motion.div>
  );
}
