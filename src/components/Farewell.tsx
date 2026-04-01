import React from 'react';
import { motion } from 'motion/react';
import { Character } from '../types';
import { CharacterMedia } from './CharacterMedia';

interface FarewellProps {
  character: Character;
  key?: string;
}

export function FarewellCraft({ character }: FarewellProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full h-full text-center bg-white p-12 flex flex-col items-center justify-center"
    >
      <div className="w-64 h-96 mb-12 overflow-hidden">
        <CharacterMedia 
          src={character.image}
          idleSrc={character.idleImage}
          mood="excited"
        />
      </div>
      <h2 className="text-3xl font-bold mb-4 text-slate-800">
        옆에 계신 선생님의 안내를 받아주세요!
      </h2>
      <p className="text-xl text-slate-600">
        멋진 작품을 만들며 즐거운 시간 보내길 바랄게! 안녕~ 👋
      </p>
      <div className="mt-8 text-sm text-slate-400">
        잠시 후 처음 화면으로 돌아갑니다...
      </div>
    </motion.div>
  );
}

export function FarewellPhoto({ character }: FarewellProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full h-full text-center bg-white p-12 flex flex-col items-center justify-center"
    >
      <div className="w-64 h-96 mb-12 overflow-hidden">
        <CharacterMedia 
          src={character.image}
          idleSrc={character.idleImage}
          mood="excited"
        />
      </div>
      <h2 className="text-3xl font-bold mb-4 text-slate-800">
        사진 다운로드가 완료되었어요!
      </h2>
      <p className="text-xl text-slate-600">
        오늘 어린이 책잔치에서 즐거운 추억 많이 만들고 가길 바랄게! 안녕~ 👋
      </p>
      <div className="mt-8 text-sm text-slate-400">
        잠시 후 처음 화면으로 돌아갑니다...
      </div>
    </motion.div>
  );
}
