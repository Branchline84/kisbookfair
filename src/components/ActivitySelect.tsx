import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Paintbrush, Shirt, Mic, MicOff, Sparkles, ArrowRight } from 'lucide-react';
import { Character } from '../types';

interface ActivitySelectProps {
  character: Character;
  onSelect: (activity: 'photo' | 'craft' | 'tshirt') => void;
  key?: string;
}

export function ActivitySelect({ character, onSelect }: ActivitySelectProps) {
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      if (transcript.includes('사진') || transcript.includes('찍')) onSelect('photo');
      else if (transcript.includes('칠보') || transcript.includes('공예')) onSelect('craft');
      else if (transcript.includes('티셔츠') || transcript.includes('옷')) onSelect('tshirt');
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col items-center justify-center p-12 bg-gradient-to-b from-indigo-50/30 to-white overflow-hidden relative"
    >
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[100px] opacity-50" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-50 rounded-full blur-[100px] opacity-50" />

      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center z-10 mb-12"
      >
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-600 rounded-full text-white text-lg font-bold mb-6 shadow-lg shadow-indigo-100">
          <Sparkles size={24} />
          <span>재미있는 체험이 가득해요!</span>
        </div>
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight flex items-center justify-center gap-4">
          <span className="text-6xl">{character.emoji}</span>
          <span>어떤 체험을 해볼까요?</span>
        </h2>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full max-w-7xl z-10 mb-16">
        <ActivityCard 
          icon={<Camera size={64} strokeWidth={2.5} />}
          title="사진 찍기"
          desc={`${character.name}와 함께 예쁜 사진을 찍어요`}
          color="bg-emerald-500 shadow-emerald-100 ring-emerald-50"
          onClick={() => onSelect('photo')}
          index={0}
        />
        <ActivityCard 
          icon={<Paintbrush size={64} strokeWidth={2.5} />}
          title="칠보공예 체험"
          desc="예쁜 칠보공예 작품을 만들어봐요"
          color="bg-purple-500 shadow-purple-100 ring-purple-50"
          onClick={() => onSelect('craft')}
          index={1}
        />
        <ActivityCard 
          icon={<Shirt size={64} strokeWidth={2.5} />}
          title="티셔츠 만들기"
          desc="나만의 멋진 티셔츠를 꾸며봐요"
          color="bg-orange-500 shadow-orange-100 ring-orange-50"
          onClick={() => onSelect('tshirt')}
          index={2}
        />
      </div>

      <div className="flex flex-col items-center gap-6 z-10">
        <p className="text-2xl text-slate-400 font-black">또는 마이크를 누르고 말해보세요!</p>
        <div className="relative">
          {isListening && (
            <motion.div 
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 bg-red-400 rounded-full -z-10"
            />
          )}
          <button
            onClick={startListening}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-90 ${
              isListening 
                ? 'bg-red-600 text-white scale-110 shadow-red-200' 
                : 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-indigo-100 border-2 border-indigo-100'
            }`}
          >
            {isListening ? <Mic size={48} /> : <MicOff size={48} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface ActivityCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  onClick: () => void;
  index: number;
}

function ActivityCard({ icon, title, desc, color, onClick, index }: ActivityCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
      whileHover={{ y: -10, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`group relative bg-white rounded-[40px] p-10 shadow-2xl transition-all flex flex-col items-center text-center overflow-hidden border-4 border-transparent hover:border-indigo-400`}
    >
      <div className={`w-32 h-32 mb-8 rounded-3xl ${color} flex items-center justify-center text-white shadow-2xl group-hover:rotate-6 transition-transform duration-500 ring-8`}>
        {icon}
      </div>
      <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight group-hover:text-indigo-600 transition-colors">{title}</h3>
      <p className="text-xl text-slate-500 font-bold leading-relaxed px-2 mb-8 opacity-80">{desc}</p>
      
      <div className="mt-auto py-4 px-10 rounded-2xl bg-slate-100 group-hover:bg-indigo-600 text-slate-500 group-hover:text-white font-black text-xl transition-all flex items-center gap-2">
        선택하기 <ArrowRight size={24} strokeWidth={3} />
      </div>
    </motion.button>
  );
}
