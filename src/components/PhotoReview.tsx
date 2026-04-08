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
  const [isUploading, setIsUploading] = React.useState(false);

  const handleDownload = async () => {
    // 1. Local Download
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `photo_${new Date().getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 2. Online Upload (Cloudinary)
    setIsUploading(true);
    try {
      const resp = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageSrc })
      });
      const data = await resp.json();
      console.log("Cloudinary Upload Result:", data.url);
      // Success confetti
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setIsUploading(false);
      onDownload();
    }
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
          disabled={isUploading}
          className={`flex-1 py-4 px-6 rounded-2xl font-bold text-white transition-colors flex items-center justify-center gap-2 shadow-md ${
            isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {isUploading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              저장 중...
            </div>
          ) : (
            <><Download size={20} /> 다운로드</>
          )}
        </button>
      </div>
    </motion.div>
  );
}
