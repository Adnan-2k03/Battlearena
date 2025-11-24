import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Volume2, VolumeX, LogOut } from 'lucide-react';
import { useAudio } from '@/lib/stores/useAudio';
import { usePlayerProfile } from '@/lib/stores/usePlayerProfile';
import { BattleDashboard } from './BattleDashboard';

interface HomePageProps {
  socket: Socket | null;
  onMatchStart: () => void;
  onRoomJoined?: (roomId: string) => void;
  onCompanionRoom?: () => void;
}

export function HomePage({ socket, onMatchStart, onRoomJoined, onCompanionRoom }: HomePageProps) {
  const [nickname, setNickname] = useState('');
  const [nicknameSet, setNicknameSet] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  
  const { initializeAudio, toggleMute, isMuted, initialized } = useAudio();
  const { profile, initProfile, logout } = usePlayerProfile();

  useEffect(() => {
    if (profile?.nickname) {
      setNicknameSet(true);
      setNickname(profile.nickname);
    }
  }, [profile]);

  useEffect(() => {
    if (!socket) return;

    socket.on('matched', ({ roomId }: { roomId: string }) => {
      setIsSearching(false);
      onRoomJoined?.(roomId);
    });

    socket.on('match_started', () => {
      onMatchStart();
    });

    return () => {
      socket.off('matched');
      socket.off('match_started');
    };
  }, [socket, onMatchStart, onRoomJoined]);

  const handleNicknameSubmit = () => {
    if (!nickname.trim()) {
      setError('Please enter your nickname');
      return;
    }
    setError('');
    initProfile(nickname.trim());
    setNicknameSet(true);
    if (!initialized) {
      initializeAudio();
    }
  };

  const handleStartMatch = (mode: 'solo' | 'team' | 'trio' | 'pentad') => {
    if (!socket || !profile) return;

    setError('');
    setIsSearching(true);
    socket.emit('join_queue', { 
      nickname: profile.nickname, 
      mode: mode,
      selectedMap: profile.selectedMap,
      selectedLaptop: profile.selectedLaptop
    });
  };

  const handleLogoutClick = () => {
    logout();
    setNicknameSet(false);
    setNickname('');
  };

  if (!nicknameSet || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/90 border-slate-700">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">⚔️ Type Battle Arena</h1>
              <p className="text-slate-400">Enter your warrior name</p>
            </div>
            
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNicknameSubmit()}
                className="bg-slate-800 border-slate-600 text-white text-lg"
                autoFocus
              />
              
              {error && (
                <div className="text-red-400 text-sm text-center">{error}</div>
              )}
              
              <Button
                onClick={handleNicknameSubmit}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-6 text-lg"
              >
                Enter Arena
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="relative">
      <BattleDashboard 
        socket={socket}
        onStartMatch={handleStartMatch}
        isSearching={isSearching}
        error={error}
      />
      
      {/* Top Right Controls */}
      <div className="fixed top-4 right-4 flex gap-2 z-50">
        <Button
          onClick={onCompanionRoom}
          variant="outline"
          className="bg-slate-900/90 border-slate-700 hover:bg-slate-800 text-white"
        >
          💻 Visit Companion
        </Button>
        <Button
          onClick={toggleMute}
          variant="outline"
          size="icon"
          className="bg-slate-900/90 border-slate-700 hover:bg-slate-800"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </Button>
        <Button
          onClick={handleLogoutClick}
          variant="outline"
          className="border-red-600 text-red-400 hover:bg-red-900/20 hover:text-red-300"
          title="Logout and switch accounts"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
