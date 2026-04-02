import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, RotateCcw, ArrowRight, Volume2 } from 'lucide-react';
import { Character } from '../types';
import { generateAudio, generateChatResponse, getCachedGreetingAudio } from '../services/geminiService';
import { CharacterMedia } from './CharacterMedia';
import { VoiceVisualizer } from './VoiceVisualizer';

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

  // Refs for latest state to avoid re-triggering audio playback
  const isListeningRef = useRef(isListening);
  const detectedActivityRef = useRef(detectedActivity);
  const initializedCharacter = useRef<string | null>(null);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    detectedActivityRef.current = detectedActivity;
  }, [detectedActivity]);

  // Auto-play audio when audioBase64 changes
  useEffect(() => {
    if (audioBase64) {
      console.log("Audio data received, length:", audioBase64.length);
      // Cancel any native speech synthesis if we have real audio
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      const audioUrl = audioBase64.startsWith('data:') ? audioBase64 : `data:audio/wav;base64,${audioBase64}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      const playAudio = async () => {
        console.log("Attempting to play audio...");
        try {
          // Set speaking to true as soon as we attempt to play
          // This ensures the video animation starts even if there's a tiny buffer delay
          setIsSpeaking(true);
          await audio.play();
          console.log("Audio started playing successfully");
        } catch (e: any) {
          if (e.name === 'AbortError') {
            console.log("Audio playback interrupted by pause (expected during cleanup)");
            return;
          }
          console.error("Audio playback failed:", e);
          setIsSpeaking(false);
          // If auto-play failed, try native fallback as last resort
          if (messages.length > 0 && messages[messages.length - 1].role === 'ai') {
            console.log("Falling back to native speech due to playback failure");
            speakNativeFallback(messages[messages.length - 1].text);
          }
        }
      };

      audio.onended = () => {
        console.log("Audio playback ended");
        setIsSpeaking(false);
        // Auto-start listening after AI finishes speaking, only if no activity detected
        if (recognitionRef.current && !isListeningRef.current && detectedActivityRef.current === 'none') {
          try {
            console.log("Auto-starting recognition...");
            recognitionRef.current.start();
          } catch (e) {
            console.error("Could not auto-start mic", e);
          }
        }
      };

      audio.onerror = (e) => {
        console.error("Audio object error event:", e);
        setIsSpeaking(false);
      };

      playAudio();
    }
    return () => {
      if (audioRef.current) {
        console.log("Cleaning up audio object");
        audioRef.current.pause();
        audioRef.current = null;
        setIsSpeaking(false);
      }
    };
  }, [audioBase64]);

  const speakNativeFallback = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Clear queue to prevent repeating
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.1;
      
      const voices = window.speechSynthesis.getVoices();
      const koVoice = voices.find(v => v.lang.includes('ko'));
      if (koVoice) utterance.voice = koVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (recognitionRef.current && !isListeningRef.current && detectedActivityRef.current === 'none') {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error("Could not auto-start mic (fallback)");
          }
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        if (recognitionRef.current && !isListeningRef.current && detectedActivityRef.current === 'none') {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error("Could not auto-start mic (fallback)");
          }
        }
      }, 3000);
    }
  };

  // Initial greeting
  useEffect(() => {
    if (initializedCharacter.current === character.name) return;
    initializedCharacter.current = character.name;

    const initGreeting = async () => {
      console.log("Initializing greeting for", character.name);
      setIsProcessing(true);
      const greeting = `안녕? 나는 ${character.name}야. 만나서 반가워~ 넌 이름이 뭐야?`;
      setMessages([{ role: 'ai', text: greeting }]);
      
      let audio: string | null = null;
      
      // Safety timeout for the entire initialization process
      const timeoutId = setTimeout(() => {
        console.warn("Greeting initialization timed out, clearing processing state.");
        setIsProcessing(false);
      }, 12000);

      try {
        console.log("Fetching greeting audio...");
        // Use a race to prevent hanging on cached promise
        const audioPromise = getCachedGreetingAudio(character.name).then(async (cached) => {
          if (cached) return cached;
          return await generateAudio(character.name, greeting);
        });

        audio = await audioPromise;
        console.log("Greeting audio fetch result:", audio ? "Success (length: " + audio.length + ")" : "Failed");
      } catch (error: any) {
        console.error("Greeting audio error:", error);
        if (error.message === 'QUOTA_EXCEEDED') {
          setQuotaExceeded(true);
        }
      } finally {
        clearTimeout(timeoutId);
        setIsProcessing(false);
      }
      
      if (audio) {
        console.log("Setting audioBase64...");
        setAudioBase64(audio);
      } else {
        console.warn("Greeting audio generation failed, using native fallback.");
        speakNativeFallback(greeting);
      }
    };
    initGreeting();
  }, [character]);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleUserMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          alert("마이크 권한이 필요해요! 브라우저 주소창 옆의 마이크 아이콘을 눌러 권한을 허용해주세요.");
        } else if (event.error === 'no-speech') {
          // Silent error
        } else if (event.error === 'network') {
          alert("네트워크 연결이 불안정해요. 인터넷 연결을 확인해주세요.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Audio analysis for Waveform
  useEffect(() => {
    if (isListening) {
      startAudioAnalysis();
    } else {
      stopAudioAnalysis();
    }
    return () => stopAudioAnalysis();
  }, [isListening]);

  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 128; // Increased for slightly more detail
      
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average level focused on human speech frequencies
        let sum = 0;
        // Use a subset of bins that correspond more to speech
        for (let i = 2; i < 15; i++) {
          sum += dataArray[i];
        }
        const average = sum / 13;
        // Boost the signal for better visual feedback
        const boosted = Math.pow(average / 128, 0.5) * 100;
        
        // Normalize and damp the level for smoother animation
        setAudioLevel(prev => (prev * 0.4) + (boosted * 0.6));
        
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (err) {
      console.error("Error accessing microphone for visualizer:", err);
    }
  };

  const stopAudioAnalysis = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  const handleUserMessage = async (text: string) => {
    const newMessages = [...messages, { role: 'user' as const, text }];
    setMessages(newMessages);
    setIsProcessing(true);
    setAudioBase64(null);
    
    try {
      const aiResponse = await generateChatResponse(character.name, character.personality, messages, text);
      let audio: string | null = null;
      try {
        audio = await generateAudio(character.name, aiResponse.text);
      } catch (error: any) {
        if (error.message === 'QUOTA_EXCEEDED') {
          setQuotaExceeded(true);
        }
      }
      
      setMessages([...newMessages, { role: 'ai' as const, text: aiResponse.text }]);
      setDetectedActivity(aiResponse.detectedActivity);
      
      if (audio) {
        setAudioBase64(audio);
      } else {
        console.warn("Gemini TTS generation failed for chat response, using native fallback.");
        speakNativeFallback(aiResponse.text);
      }
    } catch (e: any) {
      if (e.message === 'QUOTA_EXCEEDED') {
        setQuotaExceeded(true);
      } else {
        console.error("Chat error", e);
      }
      const fallbackText = "미안해, 지금은 귀가 잘 안 들려. 다시 말해줄래?";
      setMessages([...newMessages, { role: 'ai' as const, text: fallbackText }]);
      speakNativeFallback(fallbackText);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const latestAiMessage = [...messages].reverse().find(m => m.role === 'ai')?.text || '';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col bg-white overflow-hidden relative"
    >
      {quotaExceeded && (
        <div className="absolute top-0 left-0 w-full bg-orange-500 text-white text-center py-2 z-50 font-medium text-sm shadow-md flex items-center justify-center gap-4">
          <span>⚠️ AI 음성 생성 무료 사용량(할당량)이 초과되어 임시 기계음으로 대체됩니다.</span>
          <button 
            onClick={() => setQuotaExceeded(false)} 
            className="bg-white text-orange-500 px-3 py-1 rounded-full text-xs font-bold hover:bg-orange-50 transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Character Area (Top) - Fixed height to stabilize layout */}
      <div className="h-[55vh] min-h-[450px] relative flex items-end justify-center p-4 bg-gradient-to-b from-slate-50 to-white overflow-hidden shrink-0">
        <div className="w-full h-full relative z-10">
          <CharacterMedia 
            src={character.image}
            idleSrc={character.idleImage}
            isSpeaking={isSpeaking}
            mood={isProcessing ? 'thinking' : detectedActivity !== 'none' ? 'excited' : 'neutral'}
            className="w-full h-full"
          />
        </div>

        {/* Improved Visualizer Overlay behind or around the character */}
        <div className="absolute inset-0 z-0 opacity-40">
           <VoiceVisualizer 
             isListening={isListening} 
             isSpeaking={isSpeaking} 
             isProcessing={isProcessing} 
             audioLevel={audioLevel}
             analyser={analyserRef.current}
           />
        </div>
        
        {/* Background decorative elements for kiosk feel */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-40 right-10 w-48 h-48 bg-emerald-100 rounded-full blur-3xl opacity-60"></div>
      </div>

      {/* Text & Interaction Area (Bottom) - Takes the remaining space */}
      <div className="flex-1 bg-white p-8 pt-10 flex flex-col gap-6 z-20 overflow-y-auto">
        <div className="w-full relative mt-2">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 bg-slate-50 rounded-3xl border-2 border-dashed border-indigo-100">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-indigo-600 font-bold">{character.name}가 생각 중이에요...</p>
            </div>
          ) : (
            <div className="bg-indigo-50/50 rounded-3xl p-8 relative shadow-inner border border-indigo-100/50">
              <div className="absolute -top-4 left-10 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                {character.name}
              </div>
              <p className="text-xl md:text-2xl leading-relaxed text-slate-800 font-semibold whitespace-pre-wrap text-center relative pr-10">
                {latestAiMessage}
                {!isSpeaking && !isProcessing && latestAiMessage && (
                  <button 
                    onClick={() => {
                      console.log("Manual replay requested for:", latestAiMessage);
                      generateAudio(character.name, latestAiMessage)
                        .then(audio => {
                          if (audio) setAudioBase64(audio);
                          else speakNativeFallback(latestAiMessage);
                        })
                        .catch(err => {
                          if (err.message === 'QUOTA_EXCEEDED') setQuotaExceeded(true);
                          speakNativeFallback(latestAiMessage);
                        });
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-indigo-500 hover:text-indigo-700 transition-colors bg-white rounded-full shadow-sm"
                    title="다시 듣기"
                  >
                    <Volume2 size={24} />
                  </button>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col items-center gap-6">
          {detectedActivity !== 'none' && !isProcessing ? (
            <div className="w-full flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  onActivitySelect(detectedActivity);
                }}
                className="w-full py-6 rounded-2xl font-bold text-2xl text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
              >
                {detectedActivity === 'photo' ? '사진 찍으러 가기' : detectedActivity === 'craft' ? '칠보공예 하러 가기' : '티셔츠 만들러 가기'} <ArrowRight size={28} />
              </button>
              <button 
                onClick={() => {
                  setDetectedActivity('none');
                  toggleListening();
                }}
                className="w-full py-4 rounded-2xl font-bold text-lg text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} /> 다시 대답하기
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 w-full">
              <div className="flex flex-col items-center gap-2">
                <p className="text-slate-500 font-bold text-lg">
                  {isListening ? "듣고 있어요! 말씀해주세요" : "버튼을 누르고 대답해주세요"}
                </p>
              </div>
              
              <div className="flex items-center justify-center relative w-full h-32">
                {/* Secondary Visualizer around the mic button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64">
                    <VoiceVisualizer 
                      isListening={isListening} 
                      isSpeaking={isSpeaking} 
                      isProcessing={isProcessing} 
                      audioLevel={audioLevel}
                    />
                  </div>
                </div>

                <div className="relative">
                  <button 
                    onClick={toggleListening}
                    disabled={isProcessing}
                    className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 ${
                      isListening 
                        ? 'bg-red-500 text-white' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isListening ? <MicOff size={44} /> : <Mic size={44} />}
                  </button>
                </div>
              </div>

              {!isListening && !isProcessing && (
                <div className="flex flex-wrap justify-center gap-2">
                  <button 
                    onClick={() => handleUserMessage("사진 찍을래!")}
                    className="text-sm bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors font-medium border border-indigo-100"
                  >
                    "사진 찍을래!"
                  </button>
                  <button 
                    onClick={() => handleUserMessage("칠보공예 할래!")}
                    className="text-sm bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors font-medium border border-indigo-100"
                  >
                    "칠보공예 할래!"
                  </button>
                </div>
              )}

              <div className="w-full flex justify-end">
                <button 
                  onClick={() => onActivitySelect('manual')}
                  className="py-2 px-6 rounded-full font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-2 text-sm"
                >
                  직접 선택하기 <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
