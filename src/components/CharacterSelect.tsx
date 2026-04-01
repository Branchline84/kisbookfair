import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { CHARACTERS } from '../constants';
import { CharacterMedia } from './CharacterMedia';
import { Character } from '../types';
import { prefetchGreetingAudio } from '../services/geminiService';

interface CharacterSelectProps {
  onSelect: (char: Character) => void;
  key?: string;
}

export function CharacterSelect({ onSelect }: CharacterSelectProps) {
  // Prefetching removed to conserve Gemini TTS quota
  useEffect(() => {
    // No prefetching for all characters
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full h-full text-center flex flex-col items-center p-8 bg-white"
    >
      <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-800">
        안녕! 만나서 반가워요 👋
      </h2>
      <p className="text-xl text-slate-600 mb-8">
        대화하고 싶은 소공인 친구를 선택해주세요!
      </p>
      
      <div className="flex flex-col gap-6 w-full max-w-lg overflow-y-auto pb-10 px-4">
        {CHARACTERS.map((char) => (
          <motion.button
            key={char.id}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(char)}
            className="bg-white rounded-[2rem] p-6 shadow-lg hover:shadow-indigo-200/50 transition-all flex items-center text-left border-2 border-transparent hover:border-indigo-400 group relative overflow-hidden w-full"
          >
            {/* Character Circle - Smaller and to the left */}
            <div className={`shrink-0 w-28 h-28 flex items-end justify-center rounded-full overflow-hidden relative ${char.color} bg-opacity-20 shadow-inner border-2 border-white/50`}>
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent z-10" />
              <div className="w-full h-full relative z-0">
                <CharacterMedia 
                  src={char.image}
                  idleSrc={char.idleImage}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            <div className="ml-6 flex-1 flex flex-col justify-center">
              <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">{char.name}</h3>
              <p className="text-sm text-slate-600 font-medium leading-relaxed line-clamp-2">{char.personality}</p>
              <div className="mt-3 inline-flex items-center text-indigo-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                대화 시작하기 <span className="ml-1">→</span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
