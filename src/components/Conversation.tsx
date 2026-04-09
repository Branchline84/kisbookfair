import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, RotateCcw, ArrowRight, Volume2 } from 'lucide-react';
import { Character } from '../types';
import { generateAudio, generateChatResponse, getCachedGreetingAudio } from '../services/geminiService';
import { CharacterMedia } from './CharacterMedia';
import { VoiceVisualizer } from './VoiceVisualizer';
import { TIMEOUTS } from '../constants';

interface ConversationProps {
  character: Character;
  onActivitySelect: (activity: 'photo' | 'craft' | 'tshirt' | 'manual') => void;
  onBack: () => void;
  key?: string;
}

export function Conversation({ character, onActivitySelect, onBack }: ConversationProps) {
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [detectedActivity, setDetectedActivity] = useState<'photo' | 'craft' | 'tshirt' | 'none'>('none');
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const detectedActivityRef = useRef(detectedActivity);
  const initializedCharacter = useRef<string | null>(null);
  const handleUserMessageRef = useRef<(text: string) => void>(() => {});

  // startRecognition은 ref만 사용해서 deps를 [] 로 고정 - audio useEffect가 재실행되지 않도록 방지
  const startRecognition = useCallback(() => {
    if (!recognitionRef.current || isSpeakingRef.current || isListeningRef.current || detectedActivityRef.current !== 'none') {
      return;
    }
    try {
      recognitionRef.current.start();
    } catch (e) {
      // already running
    }
  }, []);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    detectedActivityRef.current = detectedActivity;
  }, [detectedActivity]);

  const stopAllAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false; // ref 즉시 업데이트 (startRecognition 가드 해제)
    setIsSpeaking(false);
  }, []);

  // Issue 2, 5: Audio playback logic with better state management
  useEffect(() => {
    if (audioBase64) {
      stopAllAudio();
      
      const audioUrl = audioBase64.startsWith('data:') ? audioBase64 : `data:audio/wav;base64,${audioBase64}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      const playAudio = async () => {
        try {
          setIsSpeaking(true);
          await audio.play();
        } catch (e: any) {
          if (e.name === 'AbortError') {
            console.log("Audio playback interrupted by pause (expected during cleanup)");
            return;
          }
          console.error("[Audio] Playback failed:", e);
          setIsSpeaking(false);
          // Removed native fallback to prevent "stupid machine sound" (Issue: User feedback)
          // notify user visually if needed, but the text is already there.
          setTimeout(startRecognition, 1000);
        }
      };

      audio.onended = () => {
        setIsSpeaking(false);
        startRecognition();
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        console.error("Audio stream error");
      };

      playAudio();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setIsSpeaking(false);
      }
    };
  }, [audioBase64, startRecognition]);

  // Initial greeting
  useEffect(() => {
    if (initializedCharacter.current === character.name) return;
    initializedCharacter.current = character.name;

    const initGreeting = async () => {
      setIsProcessing(true);
      const greeting = `안녕? 나는 ${character.name}야. 만나서 반가워~ 넌 이름이 뭐야?`;
      setMessages([{ role: 'ai', text: greeting }]);
      
      let audio: string | null = null;
      const timeoutId = setTimeout(() => setIsProcessing(false), TIMEOUTS.GREETING_INIT);

      try {
        const audioPromise = getCachedGreetingAudio(character.name).then(async (cached) => {
          if (cached) return cached;
          return await generateAudio(character.name, greeting);
        });
        audio = await audioPromise;
      } catch (error: any) {
        console.error("Greeting audio error:", error);
      } finally {
        clearTimeout(timeoutId);
        setIsProcessing(false);
      }
      
      if (audio) {
        setAudioBase64(audio);
      } else {
        console.error("[Greeting] Audio failed");
        setIsSpeaking(false);
        setTimeout(startRecognition, 1000);
      }
    };
    initGreeting();
  }, [character, startRecognition]);

  // handleUserMessageRef 항상 최신 함수를 가리키도록 동기화 (stale closure 방지)
  useEffect(() => {
    handleUserMessageRef.current = handleUserMessage;
  });

  // Recognition setup (한 번만 실행, onresult는 ref를 통해 최신 핸들러 호출)
  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleUserMessageRef.current(transcript);
      };
      recognition.onerror = (event: any) => {
        console.error("Recognition error:", event.error);
        setIsListening(false);
        if (['network', 'audio-capture', 'no-speech', 'aborted'].includes(event.error)) {
          setTimeout(() => startRecognition(), 1500);
        }
      };
      recognition.onend = () => {
        setIsListening(false);
        if (!isSpeakingRef.current && detectedActivityRef.current === 'none') {
          setTimeout(() => startRecognition(), 300);
        }
      };
      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  // Audio analysis for Waveform
  useEffect(() => {
    if (isListening) startAudioAnalysis();
    else stopAudioAnalysis();
    return () => stopAudioAnalysis();
  }, [isListening]);

  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 128;
      
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 2; i < 15; i++) sum += dataArray[i];
        const boosted = Math.pow((sum / 13) / 128, 0.5) * 100;
        setAudioLevel(prev => (prev * 0.4) + (boosted * 0.6));
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.error("Mic analysis error:", err);
    }
  };

  const stopAudioAnalysis = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    animationRef.current = null; streamRef.current = null; audioCtxRef.current = null; analyserRef.current = null;
    setAudioLevel(0);
  };

  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newMessages = [...messages, { role: 'user' as const, text }];
    setMessages(newMessages);
    setIsProcessing(true);
    setAudioBase64(null);
    
    // Safety timeout to prevent "no response" hang
    const safetyTimeout = setTimeout(() => {
      if (isProcessing) {
        console.error("[Chat] Request timed out");
        setIsProcessing(false);
        const timeoutMsg = "미안해, 지금은 서버가 좀 느린 것 같아. 다시 한 번 말해줄래?";
        setMessages(prev => [...prev, { role: 'ai' as const, text: timeoutMsg }]);
      }
    }, TIMEOUTS.CHAT_RESPONSE);
    
    try {
      const aiResponse = await generateChatResponse(character.name, character.personality, messages, text);
      clearTimeout(safetyTimeout);
      
      let audio = await generateAudio(character.name, aiResponse.text);
      
      setMessages([...newMessages, { role: 'ai' as const, text: aiResponse.text }]);
      setDetectedActivity(aiResponse.detectedActivity);
      
      if (audio) {
        setAudioBase64(audio);
      } else {
        console.error("[TTS] All engines failed to provide audio");
        // Don't use mechanical sound, just show text and start mic
        setIsSpeaking(false);
        setTimeout(startRecognition, 1000);
      }
    } catch (e: any) {
      clearTimeout(safetyTimeout);
      console.error("[Chat] Error", e);
      const fallbackText = "미안해, 지금은 귀가 잘 안 들려. 다시 말해줄래?";
      setMessages([...newMessages, { role: 'ai' as const, text: fallbackText }]);
      setIsProcessing(false);
      setTimeout(startRecognition, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      // 오디오 재생 중이어도 버튼 누르면 즉시 중단하고 마이크 시작
      stopAllAudio();
      startRecognition();
    }
  };

  const latestAiMessage = [...messages].reverse().find(m => m.role === 'ai')?.text || '';

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col bg-white overflow-hidden relative"
    >
      {quotaExceeded && (
        <div className="absolute top-0 left-0 w-full bg-orange-500 text-white text-center py-2 z-50 font-medium text-sm flex items-center justify-center gap-4">
          <span>⚠️ 할당량 초과로 임시 음성을 사용합니다.</span>
          <button onClick={() => setQuotaExceeded(false)} className="bg-white text-orange-500 px-3 py-1 rounded-full text-xs font-bold">다시 시도</button>
        </div>
      )}

      {/* Character Area */}
      <div className="h-[55vh] min-h-[450px] relative flex items-end justify-center p-4 bg-gradient-to-b from-slate-50 to-white overflow-hidden shrink-0">
        <CharacterMedia 
          src={character.image} idleSrc={character.idleImage} isSpeaking={isSpeaking}
          mood={isProcessing ? 'thinking' : detectedActivity !== 'none' ? 'excited' : 'neutral'}
          className="w-full h-full z-10"
        />
        <div className="absolute inset-0 z-0 opacity-40">
           <VoiceVisualizer isListening={isListening} isSpeaking={isSpeaking} isProcessing={isProcessing} audioLevel={audioLevel} analyser={analyserRef.current} />
        </div>
      </div>

      {/* Text & Interaction Area */}
      <div className="flex-1 bg-white p-6 flex flex-col gap-4 z-20 overflow-y-auto">
        <div className="w-full relative">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 bg-slate-50 rounded-3xl border-2 border-dashed border-indigo-100">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-indigo-600 font-bold text-sm">{character.name}가 생각 중...</p>
            </div>
          ) : (
            <div className="bg-indigo-50/50 rounded-3xl p-6 relative border border-indigo-100/50">
              <div className="absolute -top-3 left-6 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">{character.name}</div>
              <p className="text-xl leading-relaxed text-slate-800 font-semibold text-center whitespace-pre-wrap">
                {latestAiMessage}
                {!isSpeaking && !isProcessing && latestAiMessage && (
                  <button onClick={() => generateAudio(character.name, latestAiMessage).then(a => a && setAudioBase64(a))} className="inline-block ml-2 p-1.5 text-indigo-500 bg-white rounded-full shadow-sm align-middle"><Volume2 size={18} /></button>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col items-center gap-4">
          {detectedActivity !== 'none' && !isProcessing ? (
            <div className="w-full flex flex-col gap-2">
              <button 
                onClick={() => { stopAllAudio(); onActivitySelect(detectedActivity); }}
                className="w-full py-5 rounded-2xl font-bold text-xl text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg"
              >
                {detectedActivity === 'photo' ? '사진 찍으러 가기' : detectedActivity === 'craft' ? '칠보공예 하러 가기' : '티셔츠 만들러 가기'} <ArrowRight size={24} />
              </button>
              <button onClick={() => { setDetectedActivity('none'); startRecognition(); }} className="w-full py-3 rounded-xl font-bold text-slate-500 bg-slate-100 flex items-center justify-center gap-2"><RotateCcw size={18} /> 다시 말하기</button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full">
              <p className="text-slate-500 font-bold text-sm">{isListening ? "듣고 있어요! 말씀해주세요" : "버튼을 누르고 대답해주세요"}</p>
              <div className="relative flex items-center justify-center h-24 w-full">
                <div className="absolute w-48 h-48 opacity-50"><VoiceVisualizer isListening={isListening} isSpeaking={isSpeaking} isProcessing={isProcessing} audioLevel={audioLevel} /></div>
                <button 
                  onClick={toggleListening} disabled={isProcessing}
                  className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 ${isListening ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'} ${isProcessing ? 'opacity-50' : ''}`}
                >
                  {isListening ? <MicOff size={36} /> : <Mic size={36} />}
                </button>
              </div>
              {!isListening && !isProcessing && (
                <div className="flex flex-wrap justify-center gap-2">
                  <button onClick={() => handleUserMessage("사진 찍을래!")} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100 font-medium">"사진 찍을래!"</button>
                  <button onClick={() => handleUserMessage("칠보공예 할래!")} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100 font-medium">"칠보공예 할래!"</button>
                </div>
              )}
              <div className="w-full flex justify-end"><button onClick={() => onActivitySelect('manual')} className="py-1.5 px-4 rounded-full font-bold text-slate-400 bg-slate-50 text-xs flex items-center gap-1">직접 선택하기 <ArrowRight size={14} /></button></div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
