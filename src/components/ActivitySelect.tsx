import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Paintbrush, Shirt, Mic, MicOff } from 'lucide-react';
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
    if (!SpeechRecognition) {
      alert("이 브라우저에서는 마이크 음성 인식을 지원하지 않습니다.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      
      const isNegative = transcript.includes('안') || transcript.includes('아니') || transcript.includes('싫어') || transcript.includes('못');
      
      if (isNegative) {
        alert(`"${transcript}"라고 들었어요. 하고 싶은 활동을 다시 말씀해 주세요!`);
        return;
      }

      if (transcript.includes('사진') || transcript.includes('찍')) {
        onSelect('photo');
      } else if (transcript.includes('칠보') || transcript.includes('공예')) {
        onSelect('craft');
      } else if (transcript.includes('티셔츠') || transcript.includes('옷')) {
        onSelect('tshirt');
      } else {
        alert(`"${transcript}"라고 들었어요. 다시 한 번 말해주거나 버튼을 눌러주세요!`);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="w-full h-full text-center flex flex-col items-center p-8 bg-white"
    >
      <h2 className="text-3xl font-bold mb-4 text-slate-800 flex items-center justify-center gap-4">
        <span className="text-5xl">{character.emoji}</span>
        무엇을 하고 싶나요?
      </h2>
      <p className="text-slate-600 mb-8">버튼을 누르거나 마이크를 눌러 말해보세요!</p>

      <div className="flex justify-center mb-12">
        <button
          type="button"
          onClick={startListening}
          className={`p-8 rounded-full transition-all duration-300 shadow-lg ${
            isListening 
              ? 'bg-red-500 text-white scale-110 animate-pulse shadow-red-500/50' 
              : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200 hover:scale-105'
          }`}
        >
          {isListening ? <Mic size={48} /> : <MicOff size={48} />}
        </button>
      </div>
      
      <div className="grid grid-cols-1 gap-4 w-full overflow-y-auto pb-8">
        <ActivityCard 
          icon={<Camera size={48} />}
          title="사진 찍기"
          desc={`${character.name}와 함께 예쁜 사진을 찍어요`}
          color="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
          onClick={() => onSelect('photo')}
        />
        <ActivityCard 
          icon={<Paintbrush size={48} />}
          title="칠보공예 체험"
          desc="예쁜 칠보공예 작품을 만들어봐요"
          color="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
          onClick={() => onSelect('craft')}
        />
        <ActivityCard 
          icon={<Shirt size={48} />}
          title="티셔츠 만들기"
          desc="나만의 멋진 티셔츠를 꾸며봐요"
          color="bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
          onClick={() => onSelect('tshirt')}
        />
      </div>
    </motion.div>
  );
}

function ActivityCard({ icon, title, desc, color, onClick }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`rounded-3xl p-8 border-2 flex flex-col items-center gap-4 transition-colors ${color}`}
    >
      <div className="p-4 bg-white rounded-full shadow-sm">
        {icon}
      </div>
      <h3 className="text-2xl font-bold">{title}</h3>
      <p className="text-sm font-medium opacity-80">{desc}</p>
    </motion.button>
  );
}
