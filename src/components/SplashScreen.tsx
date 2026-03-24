import React from 'react';
import { motion } from 'motion/react';
import ParticleBackground from './ParticleBackground';
import { ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  onStart: () => void;
  logoSrc: string;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onStart, logoSrc }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
      <ParticleBackground />
      
      <div className="z-10 flex flex-col items-center gap-16">
        {/* Floating Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: [0, -20, 0],
          }}
          transition={{
            opacity: { duration: 1.5 },
            scale: { duration: 1.5 },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
          className="relative"
        >
          {/* Outer Glow */}
          <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl animate-pulse" />
          
          <img 
            src={logoSrc} 
            alt="KSA Logo" 
            className="w-80 h-auto relative z-10 drop-shadow-[0_0_50px_rgba(255,255,255,0.4)]"
          />
        </motion.div>

        {/* Title & Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="text-center">
            <h1 className="text-white text-5xl md:text-7xl font-black tracking-tight mb-4 drop-shadow-lg">
              신비로운 지혜의 세계
            </h1>
            <p className="text-blue-200 text-xl md:text-2xl font-bold opacity-80 tracking-wide">
              한국소공인협회와 함께하는 AI 토크
            </p>
          </div>

          <motion.button
            onClick={onStart}
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(99, 102, 241, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            className="group relative bg-white text-slate-950 px-12 py-6 rounded-full font-black text-3xl shadow-2xl flex items-center gap-4 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 via-transparent to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative">대화 시작하기</span>
            <ArrowRight className="relative group-hover:translate-x-2 transition-transform" size={36} strokeWidth={3} />
          </motion.button>
        </motion.div>
      </div>

      {/* Corner Accents */}
      <div className="absolute top-12 left-12 w-32 h-32 border-t-4 border-l-4 border-white/20 rounded-tl-3xl z-10" />
      <div className="absolute bottom-12 right-12 w-32 h-32 border-b-4 border-r-4 border-white/20 rounded-br-3xl z-10" />
    </div>
  );
};

export default SplashScreen;
