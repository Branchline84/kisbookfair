import React from 'react';
import { motion } from 'motion/react';
import { CHARACTERS } from '../constants';
import { CharacterMedia } from './CharacterMedia';
import { Character } from '../types';
import { Sparkles } from 'lucide-react';

interface CharacterSelectProps {
  onSelect: (char: Character) => void;
  key?: string;
}

export function CharacterSelect({ onSelect }: CharacterSelectProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col items-center justify-center p-12 bg-gradient-to-b from-indigo-50/30 to-white overflow-hidden relative"
    >
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[100px] opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-100 rounded-full blur-[100px] opacity-50" />

      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center z-10 mb-16"
      >
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-600 rounded-full text-white text-lg font-bold mb-6 shadow-lg shadow-indigo-200">
          <Sparkles size={24} />
          <span>어린이 책잔치에 오신 걸 환영해요!</span>
        </div>
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
          대화하고 싶은<br />
          <span className="text-indigo-600">친구를 골라보세요</span>
        </h2>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full max-w-7xl z-10">
        {CHARACTERS.map((char, index) => (
          <motion.button
            key={char.id}
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1, type: "spring", stiffness: 100 }}
            whileHover={{ y: -10, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(char)}
            className="group relative bg-white rounded-[40px] p-8 shadow-2xl shadow-indigo-100 transition-all border-4 border-transparent hover:border-indigo-400 flex flex-col items-center text-center overflow-hidden"
          >
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-white/40 pointer-events-none" />
            
            <div className={`w-48 h-48 mb-8 relative p-2 rounded-full border-8 border-white shadow-xl ${char.color} bg-opacity-10 group-hover:bg-opacity-20 transition-all duration-500`}>
              <CharacterMedia 
                src={char.image}
                mode="profile"
                className="w-full h-full"
              />
            </div>
            
            <div className="relative z-10">
              <span className="text-4xl mb-4 block transform group-hover:scale-125 transition-transform">{char.emoji}</span>
              <h3 className="text-4xl font-black text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors uppercase tracking-wide">
                {char.name}
              </h3>
              <p className="text-xl text-slate-500 font-medium leading-relaxed px-4">
                {char.personality}
              </p>
            </div>
            
            {/* Selection indicator */}
            <div className="mt-8 py-3 px-8 rounded-2xl bg-slate-100 group-hover:bg-indigo-600 text-slate-500 group-hover:text-white font-bold text-xl transition-all shadow-sm">
              선택하기
            </div>
          </motion.button>
        ))}
      </div>
      
      <div className="mt-16 text-slate-400 font-bold text-lg animate-pulse">
        원하는 친구의 카드를 터치해주세요!
      </div>
    </motion.div>
  );
}
