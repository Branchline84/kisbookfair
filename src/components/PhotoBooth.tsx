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
      const videoElement = webcamRef.current?.video;
      
      if (imageSrc && videoElement) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          
          // 키오스크 화면(미리보기)의 비율 계산
          const containerWidth = videoElement.clientWidth;
          const containerHeight = videoElement.clientHeight;
          const targetAspectRatio = containerWidth / containerHeight;
          
          // 카메라 원본 크기
          const originalWidth = img.width;
          const originalHeight = img.height;
          const originalAspectRatio = originalWidth / originalHeight;
          
          // 소스 영역 계산 (중앙 크롭)
          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = originalWidth;
          let sourceHeight = originalHeight;
          
          if (originalAspectRatio > targetAspectRatio) {
            // 원본이 더 가로로 긴 경우 (가로를 자름)
            sourceWidth = originalHeight * targetAspectRatio;
            sourceX = (originalWidth - sourceWidth) / 2;
          } else {
            // 원본이 더 세로로 긴 경우 (세로를 자름)
            sourceHeight = originalWidth / targetAspectRatio;
            sourceY = (originalHeight - sourceHeight) / 2;
          }
          
          // 캔버스 크기를 타겟 비율에 맞게 설정 (고해상도 유지)
          canvas.width = sourceWidth;
          canvas.height = sourceHeight;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // 1. 카메라 화면 그리기 (중앙 크롭 및 좌우 반전)
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(
              img, 
              sourceX, sourceY, sourceWidth, sourceHeight, 
              0, 0, canvas.width, canvas.height
            );
            ctx.restore();
            
            // 2. 캐릭터 합성
            const characterVideo = characterRef.current?.querySelector('video');
            const characterImg = characterRef.current?.querySelector('img');
            const characterCanvas = characterRef.current?.querySelector('canvas');
            const mediaElement = characterCanvas || characterVideo || characterImg;

            if (mediaElement) {
              // 캐릭터 크기: 화면 높이의 70%로 조정 (사용자 피드백 반영)
              const charHeight = canvas.height * 0.7;
              
              // CharacterMedia의 내부 캔버스 비율 (2000x1500)
              const mediaInternalWidth = 2000;
              const mediaInternalHeight = 1500;
              const mediaAspectRatio = mediaInternalWidth / mediaInternalHeight;
              
              const charWidth = mediaAspectRatio * charHeight;
              
              // 캐릭터는 2000px 캔버스의 중앙에 위치하므로, 
              // 합성 시에도 중앙이 우측 75% 지점에 오도록 배치 (Portrait 기준)
              // 좌측으로 절반만큼 이동시켜서 캐릭터 본체가 우측에 붙게 함
              const xPos = canvas.width * 0.5 - (charWidth / 2) + (canvas.width * 0.2);
              const yPos = canvas.height - charHeight;
              
              ctx.drawImage(
                mediaElement as CanvasImageSource, 
                xPos, 
                yPos, 
                charWidth, 
                charHeight
              );
            }
            
            // 최종 이미지를 생성하여 전달
            const finalImage = canvas.toDataURL('image/jpeg', 0.95);
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
      <div className="relative flex-1 bg-white overflow-hidden">
        {/* @ts-ignore */}
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "user" }}
          className="w-full h-full object-cover scale-x-[-1]"
        />
        
        {/* Character Overlay - Scale to 70% height to match capture logic */}
        <div ref={characterRef} className="absolute bottom-0 right-[-35%] w-[150%] h-[75%] pointer-events-none z-10 flex justify-end">
          <CharacterMedia 
            src={character.image}
            idleSrc={character.idleImage}
            mood={countdown !== null ? 'excited' : 'neutral'}
            className="w-full h-full"
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
