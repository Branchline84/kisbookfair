import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { Character, AppState } from './types';
import { CharacterSelect } from './components/CharacterSelect';
import { Conversation } from './components/Conversation';
import { ActivitySelect } from './components/ActivitySelect';
import { FarewellCraft, FarewellPhoto } from './components/Farewell';
import { PhotoBooth } from './components/PhotoBooth';
import { PhotoReview } from './components/PhotoReview';
import SplashScreen from './components/SplashScreen';
import { CHARACTERS } from './constants';

export default function App() {
  const [appState, setAppState] = useState<AppState>('SPLASH');
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  const resetApp = () => {
    setAppState('SPLASH');
    setSelectedChar(null);
    setCapturedImage(null);
    setUserName('');
  };

  const handleStart = () => {
    setAppState('SELECT_CHARACTER');
  };

  const handleCharacterSelect = (char: Character) => {
    setSelectedChar(char);
    setAppState('CONVERSATION');
  };

  const handleActivitySelect = (activity: 'photo' | 'craft' | 'tshirt') => {
    if (activity === 'photo') {
      setAppState('PHOTO_BOOTH');
    } else {
      setAppState('FAREWELL_CRAFT');
      setTimeout(() => {
        resetApp();
      }, 5000);
    }
  };

  return (
    <div className="fixed inset-0 bg-white text-slate-800 font-sans overflow-hidden flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Immersive Floating Header */}
      <AnimatePresence>
        {appState !== 'SPLASH' && (
          <header className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-50 pointer-events-none">
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="flex items-center gap-3 bg-white/60 backdrop-blur-xl px-6 py-3 rounded-full shadow-2xl border border-white/40 pointer-events-auto cursor-pointer"
              onClick={resetApp}
            >
              <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-200">
                <Sparkles className="text-white" size={20} />
              </div>
              <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase whitespace-nowrap">사단법인 한국소공인협회</h1>
            </motion.div>
            
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900/5 backdrop-blur-md px-5 py-2.5 rounded-full border border-black/5 pointer-events-auto"
            >
              <span className="text-sm font-black text-slate-600 tracking-widest uppercase">어린이 책잔치</span>
            </motion.div>
          </header>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 relative flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {appState === 'SPLASH' && (
            <SplashScreen key="splash" onStart={handleStart} logoSrc="/ksalogo.png" />
          )}
          {appState === 'SELECT_CHARACTER' && (
            <CharacterSelect key="select" onSelect={handleCharacterSelect} />
          )}
          {appState === 'CONVERSATION' && selectedChar && (
            <Conversation 
              key="conversation" 
              character={selectedChar} 
              userName={userName}
              onUserNameSet={setUserName}
              onActivitySelect={(activity: 'photo' | 'craft' | 'tshirt' | 'manual') => {
                if (activity === 'manual') {
                  setAppState('ACTIVITY_SELECT');
                } else {
                  handleActivitySelect(activity as any);
                }
              }}
              // Passing setter to allow Conversation to switch character based on topic
              onCharacterChange={setSelectedChar}
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
  );
}
