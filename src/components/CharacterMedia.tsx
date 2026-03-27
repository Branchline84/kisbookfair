import React from 'react';
import { motion } from 'motion/react';
import { AnimatedCharacter } from './AnimatedCharacter';

type CharacterId = 'ara' | 'gatdoryeong' | 'hobaek';
type Mood = 'neutral' | 'happy' | 'excited' | 'thinking';
type Mode = 'full' | 'profile';

interface CharacterMediaProps {
  src: string;
  className?: string;
  isSpeaking?: boolean;
  mood?: Mood;
  mode?: Mode;
}

/** src 문자열에서 characterId를 추론합니다 */
function detectCharId(src: string): CharacterId | null {
  const s = src.toLowerCase();
  if (s.includes('gatdoryeong') || s.includes('gat')) return 'gatdoryeong';
  if (s.includes('hobaek')) return 'hobaek';
  if (s.includes('ara')) return 'ara';
  return null;
}

export const CharacterMedia: React.FC<CharacterMediaProps> = ({
  src,
  className = 'w-full h-full',
  isSpeaking = false,
  mood = 'neutral' as Mood,
  mode = 'full' as Mode,
}) => {
  const charId = detectCharId(src);

  if (charId) {
    return (
      <div className={`relative flex items-center justify-center ${className} ${mode === 'profile' ? 'overflow-hidden rounded-full aspect-square' : ''}`}>
        {mode === 'full' && (
          <motion.div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2/5 h-3 bg-black/10 rounded-full blur-md"
            animate={{ scaleX: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        )}
        <AnimatedCharacter
          characterId={charId}
          mood={mood}
          isSpeaking={isSpeaking}
          mode={mode}
          className={mode === 'profile' ? 'w-full h-full scale-110 origin-top' : 'w-full h-full drop-shadow-2xl'}
        />
      </div>
    );
  }

  // 알 수 없는 src는 이미지로 폴백
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <img
        src={src}
        className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
        alt="character"
      />
    </div>
  );
};
