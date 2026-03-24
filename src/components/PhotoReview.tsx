import React from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Download } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PhotoReviewProps {
  imageSrc: string;
  onRetake: () => void;
  onDownload: () => void;
  key?: string;
}

export function PhotoReview({ imageSrc, onRetake, onDownload }: PhotoReviewProps) {
  const handleDownload = () => {
    // Trigger download
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `photo_${new Date().getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Confetti effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    onDownload();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="w-full h-full bg-white p-8 flex flex-col items-center"
    >
      <h2 className="text-3xl font-bold mb-6 text-slate-800">
        사진이 멋지게 나왔어요! ✨
      </h2>
      
      <div className="relative rounded-2xl overflow-hidden shadow-lg mb-8 border-4 border-slate-100">
        <img src={imageSrc} alt="Captured" className="max-h-[50vh] object-contain" />
      </div>
      
      <div className="flex flex-wrap justify-center gap-4 w-full max-w-md">
        <button 
          onClick={onRetake}
          className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw size={20} /> 다시 찍기
        </button>
        <button 
          onClick={handleDownload}
          className="flex-1 py-4 px-6 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-md"
        >
          <Download size={20} /> 다운로드
        </button>
      </div>
    </motion.div>
  );
}
