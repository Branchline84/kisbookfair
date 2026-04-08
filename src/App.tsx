import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Sparkles, Home } from 'lucide-react';
import { Character, AppState } from './types';
import { CharacterSelect } from './components/CharacterSelect';
import { Conversation } from './components/Conversation';
import { ActivitySelect } from './components/ActivitySelect';
import { FarewellCraft, FarewellPhoto } from './components/Farewell';
import { PhotoBooth } from './components/PhotoBooth';
import { PhotoReview } from './components/PhotoReview';
import { prefetchGreetingAudio } from './services/geminiService';
import { TIMEOUTS } from './constants';

// Error Boundary (Issue 8)
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-10 text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">어머나! 문제가 생겼어요 😅</h1>
          <p className="text-xl text-slate-600 mb-8">잠시 후 다시 시작될 거예요.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-8 py-4 bg-indigo-600 text-white rounded-full font-bold shadow-lg"
          >
            다시 시작하기
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('SELECT_CHARACTER');
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const resetApp = () => {
    setAppState('SELECT_CHARACTER');
    setSelectedChar(null);
    setCapturedImage(null);
  };

  const handleCharacterSelect = (char: Character) => {
    // Unlock audio context for auto-play
    const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    silentAudio.play().catch(() => {});
    
    // Prefetch greeting for the selected character only to conserve quota
    prefetchGreetingAudio(char.name, char.personality);
    
    setSelectedChar(char);
    setAppState('CONVERSATION');
  };

  const handleActivitySelect = (activity: 'photo' | 'craft' | 'tshirt') => {
    // Stop any ongoing speech when transitioning
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    if (activity === 'photo') {
      setAppState('PHOTO_BOOTH');
    } else if (activity === 'craft' || activity === 'tshirt') {
      setAppState('FAREWELL_CRAFT');
      // Show farewell screen for 7 seconds (allow time to read) then reset
      setTimeout(() => {
        resetApp();
      }, TIMEOUTS.FAREWELL_SCREEN);
    }
  };

  return (
    <ErrorBoundary>
      <div className="w-full h-full max-w-[600px] mx-auto bg-white shadow-2xl overflow-hidden relative border-x border-slate-100 min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm p-4 flex items-center justify-between z-50 relative border-b border-slate-100 h-16 shrink-0">
          <div className="flex items-center gap-4">
            {appState !== 'SELECT_CHARACTER' && (
              <button 
                onClick={resetApp}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors active:scale-90"
                title="처음으로"
              >
                <Home size={24} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Sparkles className="text-indigo-500" size={20} />
              <h1 className="text-lg font-bold text-slate-800 line-clamp-1">한국소공인협회</h1>
            </div>
          </div>
          <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full shrink-0">어린이 책잔치</div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 relative flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            {appState === 'SELECT_CHARACTER' && (
              <CharacterSelect key="select" onSelect={handleCharacterSelect} />
            )}
            {appState === 'CONVERSATION' && selectedChar && (
              <Conversation 
                key="conversation" 
                character={selectedChar} 
                onBack={resetApp}
                onActivitySelect={(activity: 'photo' | 'craft' | 'tshirt' | 'manual') => {
                  if (activity === 'manual') {
                    setAppState('ACTIVITY_SELECT');
                  } else {
                    handleActivitySelect(activity);
                  }
                }}
              />
            )}
            {appState === 'ACTIVITY_SELECT' && selectedChar && (
              <ActivitySelect 
                key="activity" 
                character={selectedChar} 
                onSelect={handleActivitySelect} 
              />
            )}
            {appState === 'FAREWELL_CRAFT' && selectedChar && (
              <FarewellCraft key="farewell-craft" character={selectedChar} />
            )}
            {appState === 'PHOTO_BOOTH' && selectedChar && (
              <PhotoBooth 
                key="photo" 
                character={selectedChar} 
                onCapture={(img) => {
                  setCapturedImage(img);
                  setAppState('PHOTO_REVIEW');
                }} 
              />
            )}
            {appState === 'PHOTO_REVIEW' && capturedImage && selectedChar && (
              <PhotoReview 
                key="review" 
                imageSrc={capturedImage} 
                onRetake={() => {
                  setCapturedImage(null);
                  setAppState('PHOTO_BOOTH');
                }}
                onDownload={() => {
                  setAppState('FAREWELL_PHOTO');
                  setTimeout(() => resetApp(), 5000);
                }}
              />
            )}
            {appState === 'FAREWELL_PHOTO' && selectedChar && (
              <FarewellPhoto key="farewell-photo" character={selectedChar} />
            )}
          </AnimatePresence>
        </main>
      </div>
    </ErrorBoundary>
  );
}
