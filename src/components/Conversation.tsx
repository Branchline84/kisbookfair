import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, RotateCcw, ArrowRight, MessageCircle } from 'lucide-react';
import { Character } from '../types';
import { generateAudio, generateChatResponse, getCachedGreetingAudio, extractNameFromText } from '../services/geminiService';
import { CharacterMedia } from './CharacterMedia';

interface ConversationProps {
  character: Character;
  userName: string;
  onUserNameSet: (name: string) => void;
  onActivitySelect: (activity: 'photo' | 'craft' | 'tshirt' | 'manual') => void;
  onCharacterChange: (char: Character) => void;
  key?: string;
}

import { CHARACTERS } from '../constants';

export function Conversation({ character, userName, onUserNameSet, onActivitySelect, onCharacterChange }: ConversationProps) {
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [detectedActivity, setDetectedActivity] = useState<'photo' | 'craft' | 'tshirt' | 'none'>('none');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const handleUserMessageRef = useRef<(text: string) => void>(() => {});

  // Auto-play audio when audioBase64 changes
  useEffect(() => {
    if (!audioBase64) return;

    // 이전 오디오 정리
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }

    const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
    audioRef.current = audio;
    setIsSpeaking(true);

    audio.onended = () => {
      setIsSpeaking(false);
      if (recognitionRef.current && detectedActivity === 'none') {
        setTimeout(() => {
          try { recognitionRef.current.start(); } catch (e) {}
        }, 500);
      }
    };

    audio.play().catch(() => setIsSpeaking(false));

    // ✅ cleanup은 컴포넌트 언마운트 시에만 동작
    return () => {
      audio.pause();
      audio.onended = null;
    };
  }, [audioBase64]); // ✅ audioBase64만 의존

  const speakNativeFallback = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.1;
      const voices = window.speechSynthesis.getVoices();
      const koVoice = voices.find(v => v.lang.includes('ko'));
      if (koVoice) utterance.voice = koVoice;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (recognitionRef.current && !isListening && detectedActivity === 'none') {
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Could not auto-start mic (fallback)");
            }
          }, 500);
        }
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const hasGreetedRef = useRef(false);

  // Initial Greeting with Name Request
  useEffect(() => {
    const initGreeting = async () => {
      if (messages.length > 0 || hasGreetedRef.current) return;
      hasGreetedRef.current = true;
      
      setIsProcessing(true);
      const greeting = userName 
        ? `안녕 ${userName}! 다시 만나서 반가워. 오늘은 어떤 이야기를 해볼까?`
        : `안녕! 나는 소공인들을 돕는 갓도령이야. 어린이 친구, 만나서 반가워! 너는 이름이 뭐야?`;
      
      setMessages([{ role: 'ai', text: greeting }]);
      let audio = getCachedGreetingAudio(character.name);
      if (!audio || userName) audio = await generateAudio(character.name, greeting);
      setIsProcessing(false);
      if (audio) setAudioBase64(audio);
      else speakNativeFallback(greeting);
    };
    initGreeting();
  }, [character, userName]);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleUserMessageRef.current(transcript); // ✅ 항상 최신 함수 참조
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ 초기 마운트 시 1회만 생성

  const handleUserMessage = async (text: string) => {
    handleUserMessageRef.current = handleUserMessage; // ref 항상 최신 유지
    const newMessages = [...messages, { role: 'user' as const, text }];
    setMessages(newMessages);
    setIsProcessing(true);
    setAudioBase64(null);

    // Topic-based Character Switching Logic
    let activeChar = character;
    if (text.includes('정품인증') || text.includes('인증마크')) {
      const gat = CHARACTERS.find(c => c.id === 'gatdoryeong'); // ✅ 수정된 ID
      if (gat && character.id !== 'gatdoryeong') {
        onCharacterChange(gat);
        activeChar = gat;
      }
    } else if (text.includes('칠보공예') || text.includes('체험') || text.includes('만들기')) {
      const ara = CHARACTERS.find(c => c.id === 'ara');
      if (ara && character.id !== 'ara') {
        onCharacterChange(ara);
        activeChar = ara;
      }
    }

    try {
      const aiResponse = await generateChatResponse(
        activeChar.name, 
        activeChar.personality, 
        messages, 
        text,
        userName
      );

      // ✅ Gemini 기반 이름 추출 (정확도 대폭 향상)
      if (!userName) {
        const extractedName = await extractNameFromText(text);
        if (extractedName) onUserNameSet(extractedName);
      }

      const audio = await generateAudio(activeChar.name, aiResponse.text);
      setMessages([...newMessages, { role: 'ai' as const, text: aiResponse.text }]);
      setDetectedActivity(aiResponse.detectedActivity);
      if (audio) setAudioBase64(audio);
      else speakNativeFallback(aiResponse.text);
    } catch (e) {
      console.error("Chat error");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) recognitionRef.current?.stop();
    else recognitionRef.current?.start();
  };

  const latestAiMessage = [...messages].reverse().find(m => m.role === 'ai')?.text || '';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col items-center justify-between bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-900 overflow-hidden relative p-8 md:p-12"
    >
      {/* Immersive Particle Background is provided by App.tsx, but content needs some accents */}
      <div className="absolute top-1/4 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-[150px] opacity-20 -z-10" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[200px] opacity-10 -z-10" />

      {/* Top Section: Character Display with Dynamic Camera */}
      <motion.div 
        className="w-full flex-1 relative flex items-center justify-center max-h-[50vh]"
        animate={{
          scale: isSpeaking ? 1.05 : 1,
          y: isSpeaking ? -10 : 0
        }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        <div className="w-full h-full relative z-10 flex items-end justify-center">
          <div className="w-full h-[100%] max-w-2xl relative">
            {/* Listening Aura */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 bg-indigo-500/20 rounded-full blur-[100px] -z-10"
                >
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-full h-full border-4 border-indigo-400/30 rounded-full"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <CharacterMedia 
              src={character.image}
              isSpeaking={isSpeaking}
              mood={isProcessing ? 'thinking' : detectedActivity !== 'none' ? 'excited' : 'neutral'}
              className="w-full h-full drop-shadow-[0_20px_80px_rgba(255,255,255,0.1)]"
            />
          </div>
        </div>

        {/* AI Thinking Indicator */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div 
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 20 }}
              className="absolute top-1/2 right-4 md:right-10 z-30"
            >
              <div className="bg-slate-900/80 backdrop-blur-xl px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2.5 h-2.5 bg-indigo-400 rounded-full shadow-[0_0_10px_#818cf8]" />
                  <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2.5 h-2.5 bg-indigo-400 rounded-full shadow-[0_0_10px_#818cf8]" />
                  <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2.5 h-2.5 bg-indigo-400 rounded-full shadow-[0_0_10px_#818cf8]" />
                </div>
                <span className="text-white font-black text-lg tracking-wider">생각 중...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Middle Section: Floating Speech Bubble */}
      <div className="w-full max-w-4xl z-20 mb-4">
        <AnimatePresence mode="wait">
          {!isProcessing && (
            <motion.div
              key={latestAiMessage}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative bg-white/10 backdrop-blur-2xl rounded-[40px] p-8 md:p-10 shadow-[0_20px_100px_rgba(0,0,0,0.3)] border border-white/20"
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xl font-black px-10 py-2.5 rounded-full shadow-2xl tracking-widest uppercase">
                {character.name}
              </div>

              <div className="text-center overflow-y-auto max-h-[18vh] custom-scrollbar">
                <p className="text-3xl md:text-4xl lg:text-5xl leading-snug text-white font-black whitespace-pre-wrap tracking-tight drop-shadow-md">
                  {latestAiMessage}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Section: Interaction Area */}
      <div className="w-full max-w-3xl z-30 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <span className={`text-xl font-black transition-colors tracking-wide ${isListening ? 'text-indigo-400' : 'text-slate-500'}`}>
            {isListening ? "듣고 있어요! 말씀이 끝나면 한 번 더 눌러주세요" : "버튼을 누르고 말씀해주세요!"}
          </span>
          
          <div className="relative">
            {isListening && (
              <>
                <motion.div initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-indigo-500 rounded-full -z-10 blur-xl" />
                <motion.div initial={{ scale: 1, opacity: 0.3 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 1, repeat: Infinity, delay: 0.5 }} className="absolute inset-0 bg-indigo-400 rounded-full -z-10 blur-lg" />
              </>
            )}
            
            <button 
              onClick={toggleListening}
              disabled={isProcessing}
              className={`w-28 h-28 rounded-full flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.4)] transition-all active:scale-95 relative overflow-hidden group ${
                isListening 
                  ? 'bg-indigo-500 text-white scale-110 shadow-indigo-500/50' 
                  : 'bg-white text-slate-950 hover:bg-slate-50'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
              {isListening ? <MicOff size={48} strokeWidth={3} /> : <Mic size={48} strokeWidth={3} />}
            </button>
          </div>
        </div>

        {/* Action Suggestions / Activity Select */}
        <AnimatePresence>
          {detectedActivity !== 'none' && !isProcessing ? (
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <button 
                onClick={() => onActivitySelect(detectedActivity)}
                className="w-full py-8 px-4 rounded-3xl font-black text-3xl text-white bg-indigo-600 hover:bg-indigo-500 shadow-2xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-4 active:scale-95"
              >
                예! {detectedActivity === 'photo' ? '사진 찍기' : detectedActivity === 'craft' ? '공예 하기' : '티셔츠 만들기'} <ArrowRight size={36} strokeWidth={3} />
              </button>
              <button 
                onClick={() => {
                  setDetectedActivity('none');
                  toggleListening();
                }}
                className="w-full py-8 px-4 rounded-3xl font-black text-2xl text-white bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all flex items-center justify-center gap-3 active:scale-95 border border-white/10"
              >
                <RotateCcw size={28} /> 아니요, 다시 대화하기
              </button>
            </motion.div>
          ) : (
            <div className="w-full flex justify-between items-center gap-4">
              <div className="flex gap-3">
                <button 
                  onClick={() => handleUserMessage("뭐 하고 놀까?")}
                  className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-full font-black text-lg hover:bg-white/10 transition-all shadow-xl active:scale-95"
                >
                  🎢 뭐 하고 놀까?
                </button>
                <button 
                  onClick={() => handleUserMessage("정품인증마크가 뭐야?")}
                  className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-full font-black text-lg hover:bg-white/10 transition-all shadow-xl active:scale-95"
                >
                  🏷️ 마크가 뭐야?
                </button>
              </div>
              
              <button 
                onClick={() => onActivitySelect('manual')}
                className="py-3 px-8 rounded-full font-black text-slate-400 bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2 text-lg active:scale-95 border border-white/5"
              >
                직접 고르기 <ArrowRight size={24} />
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => window.location.reload()}
        className="absolute top-10 left-10 p-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full shadow-2xl text-white/40 hover:text-white hover:bg-white/10 transition-all z-50"
      >
        <RotateCcw size={36} />
      </motion.button>
    </motion.div>
  );
}
