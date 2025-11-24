import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { LaptopCharacterStage } from './LaptopCharacterStage';
import { getPersonality } from '@/lib/data/laptop-personalities';
import { LAPTOPS } from '@/lib/data/laptops';

interface CompanionRoomProps {
  laptopId: string;
  onBack: () => void;
}

export function CompanionRoom({ laptopId, onBack }: CompanionRoomProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem('companion_voice_enabled') === 'true';
  });
  const [tapCount, setTapCount] = useState(0);
  const [lastResponse, setLastResponse] = useState('');
  
  const personality = getPersonality(laptopId);
  const laptop = LAPTOPS.find(l => l.id === laptopId);

  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    switch(personality.personality) {
      case 'friendly':
        utterance.pitch = 1.1;
        utterance.rate = 1.0;
        break;
      case 'energetic':
        utterance.pitch = 1.3;
        utterance.rate = 1.2;
        break;
      case 'cool':
        utterance.pitch = 0.9;
        utterance.rate = 0.95;
        break;
      case 'elegant':
        utterance.pitch = 1.15;
        utterance.rate = 0.9;
        break;
      case 'fierce':
        utterance.pitch = 0.85;
        utterance.rate = 1.1;
        break;
      case 'mysterious':
        utterance.pitch = 0.95;
        utterance.rate = 0.85;
        break;
      case 'royal':
        utterance.pitch = 1.0;
        utterance.rate = 0.9;
        break;
      case 'cosmic':
        utterance.pitch = 0.95;
        utterance.rate = 0.95;
        break;
      default:
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
    }
    
    utterance.volume = 0.8;
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.name.toLowerCase().includes('female') || 
      voice.name.toLowerCase().includes('samantha') ||
      voice.name.toLowerCase().includes('zira')
    );
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const handleLaptopClick = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    
    const response = personality.clickResponses[
      Math.floor(Math.random() * personality.clickResponses.length)
    ];
    
    setLastResponse(response);
    speakText(response);
    
    setTimeout(() => {
      setLastResponse('');
    }, 3000);
  };

  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    localStorage.setItem('companion_voice_enabled', String(newState));
    
    if (newState) {
      speakText("Voice enabled!");
    } else {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-slate-700 p-4 flex items-center justify-between">
        <Button
          onClick={onBack}
          variant="outline"
          className="border-slate-600"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          💻 {laptop?.name}
        </h1>
        
        <Button
          onClick={toggleVoice}
          variant="ghost"
          className={voiceEnabled ? "text-green-400 hover:text-green-300" : "text-slate-400 hover:text-white"}
        >
          {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>
      </div>

      {/* Main Companion Interaction Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Large Companion */}
        <div 
          className="w-96 h-96 mb-8 cursor-pointer transform transition-transform hover:scale-105 active:scale-95"
          onClick={handleLaptopClick}
        >
          <LaptopCharacterStage selectedLaptopId={laptopId} />
        </div>

        {/* Tap Response */}
        {lastResponse && (
          <div className="text-center mb-8 animate-bounce">
            <div className="bg-white text-slate-900 px-6 py-3 rounded-lg shadow-lg text-lg font-semibold max-w-md">
              {lastResponse}
            </div>
          </div>
        )}

        {/* Interaction Stats */}
        <div className="text-center text-white space-y-2">
          <p className="text-6xl font-bold text-blue-400">{tapCount}</p>
          <p className="text-slate-300">Interactions</p>
          <p className="text-sm text-slate-400">Click the companion to interact!</p>
        </div>
      </div>

      {/* Fun Facts Footer */}
      <div className="bg-slate-900/80 border-t border-slate-700 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-300 text-sm">
            {personality.personality.charAt(0).toUpperCase() + personality.personality.slice(1)} • {laptop?.description}
          </p>
        </div>
      </div>
    </div>
  );
}
