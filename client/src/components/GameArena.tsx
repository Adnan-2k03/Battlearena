import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Input } from './ui/input';
import { Swords, Shield as ShieldIcon, Heart } from 'lucide-react';
import { useAudio } from '@/lib/stores/useAudio';

interface TeamState {
  hp: number;
  shield: number;
}

interface GameArenaProps {
  socket: Socket | null;
  roomId: string;
  myTeam: 'blue' | 'red';
  myRole: 'striker' | 'guardian';
}

interface Projectile {
  id: string;
  team: 'blue' | 'red';
  startTime: number;
}

type WordType = 'normal' | 'double_damage' | 'full_shield' | 'stun';

interface WordWithType {
  word: string;
  type: WordType;
}

export function GameArena({ socket, roomId, myTeam, myRole }: GameArenaProps) {
  const [blueTeam, setBlueTeam] = useState<TeamState>({ hp: 100, shield: 0 });
  const [redTeam, setRedTeam] = useState<TeamState>({ hp: 100, shield: 0 });
  const [words, setWords] = useState<WordWithType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [shieldFlash, setShieldFlash] = useState<'blue' | 'red' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { playHit, playSuccess } = useAudio();

  const enemyTeam = myTeam === 'blue' ? 'red' : 'blue';
  const myTeamState = myTeam === 'blue' ? blueTeam : redTeam;
  const enemyTeamState = myTeam === 'blue' ? redTeam : blueTeam;

  useEffect(() => {
    if (!socket) return;

    socket.on('new_words', ({ words: newWords }: { words: WordWithType[] }) => {
      setWords(newWords);
    });

    socket.on('damage_dealt', ({ attackerTeam, blueTeam: blue, redTeam: red }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      
      const projectileId = `${Date.now()}-${Math.random()}`;
      setProjectiles(prev => [...prev, {
        id: projectileId,
        team: attackerTeam,
        startTime: Date.now()
      }]);

      playHit();

      setTimeout(() => {
        setProjectiles(prev => prev.filter(p => p.id !== projectileId));
      }, 1000);
    });

    socket.on('shield_restored', ({ team, blueTeam: blue, redTeam: red }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      
      setShieldFlash(team);
      playSuccess();
      
      setTimeout(() => {
        setShieldFlash(null);
      }, 500);
    });

    socket.on('word_correct', () => {
      setInputValue('');
      inputRef.current?.focus();
    });

    socket.on('word_invalid', () => {
      setInputValue('');
      inputRef.current?.focus();
    });

    return () => {
      socket.off('new_words');
      socket.off('damage_dealt');
      socket.off('shield_restored');
      socket.off('word_correct');
      socket.off('word_invalid');
    };
  }, [socket, playHit, playSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket) return;

    const typedWord = inputValue.trim().toUpperCase();
    const matchedWord = words.find(w => w.word === typedWord);

    socket.emit('word_typed', { 
      roomId, 
      word: inputValue.trim(),
      wordType: matchedWord?.type || 'normal'
    });
  };

  const getHealthBarColor = (hp: number) => {
    if (hp > 60) return 'bg-green-500';
    if (hp > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Enemy Team Status - Top */}
      <div className="bg-slate-800/90 border-b-4 border-slate-700 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <h3 className={`text-lg md:text-xl font-bold mb-2 ${enemyTeam === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
            Enemy Team ({enemyTeam.toUpperCase()})
          </h3>
          <div className="space-y-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="text-white text-sm font-medium">HP: {enemyTeamState.hp}/100</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-6 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${getHealthBarColor(enemyTeamState.hp)}`}
                  style={{ width: `${enemyTeamState.hp}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldIcon className="w-4 h-4 text-blue-400" />
                <span className="text-white text-sm font-medium">Shield: {enemyTeamState.shield}/100</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                <div 
                  className="h-full bg-blue-400 transition-all duration-300"
                  style={{ width: `${enemyTeamState.shield}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Arena - Middle */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        {/* Projectiles */}
        {projectiles.map((projectile) => (
          <div
            key={projectile.id}
            className={`absolute w-8 h-8 md:w-12 md:h-12 rounded-full animate-ping ${
              projectile.team === 'blue' ? 'bg-blue-500' : 'bg-red-500'
            }`}
            style={{
              bottom: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              animation: 'projectileUp 1s ease-out forwards'
            }}
          />
        ))}
        
        <div className="text-center text-white">
          <div className="text-6xl md:text-8xl mb-4">⚔️</div>
          <p className="text-slate-400 text-sm md:text-base">Type words to battle!</p>
        </div>
      </div>

      {/* My Team Status - Bottom */}
      <div className={`bg-slate-800/90 border-t-4 p-4 md:p-6 ${
        shieldFlash === myTeam ? 'border-blue-400 animate-pulse' : 'border-slate-700'
      } transition-all duration-200`}>
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Role Display */}
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              {myRole === 'striker' ? (
                <>
                  <Swords className="w-6 h-6 text-red-400" />
                  <span className="text-red-400">YOU ARE THE STRIKER</span>
                </>
              ) : (
                <>
                  <ShieldIcon className="w-6 h-6 text-blue-400" />
                  <span className="text-blue-400">YOU ARE THE GUARDIAN</span>
                </>
              )}
            </h2>
            <p className={`text-sm md:text-base ${myTeam === 'blue' ? 'text-blue-300' : 'text-red-300'}`}>
              Team {myTeam.toUpperCase()}
            </p>
          </div>

          {/* My Team Stats */}
          <div className="space-y-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="text-white text-sm font-medium">HP: {myTeamState.hp}/100</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-6 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${getHealthBarColor(myTeamState.hp)}`}
                  style={{ width: `${myTeamState.hp}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldIcon className="w-4 h-4 text-blue-400" />
                <span className="text-white text-sm font-medium">Shield: {myTeamState.shield}/100</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                <div 
                  className="h-full bg-blue-400 transition-all duration-300"
                  style={{ width: `${myTeamState.shield}%` }}
                />
              </div>
            </div>
          </div>

          {/* Word Deck */}
          <div className="bg-slate-700/50 rounded-lg p-3 md:p-4">
            <h3 className="text-white font-bold mb-2 text-sm md:text-base">Available Words:</h3>
            <div className="flex flex-wrap gap-2">
              {words.map((wordObj, index) => {
                const isPowerUp = wordObj.type !== 'normal';
                return (
                  <div
                    key={index}
                    className={`px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base ${
                      isPowerUp
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-pulse shadow-lg'
                        : myRole === 'striker' 
                          ? 'bg-red-600 text-white' 
                          : 'bg-blue-600 text-white'
                    }`}
                  >
                    {wordObj.word}
                    {isPowerUp && <span className="ml-1">⚡</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Input Box */}
          <form onSubmit={handleSubmit}>
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a word and press Enter..."
              className="w-full bg-slate-700 border-slate-600 text-white text-lg md:text-xl py-6 placeholder:text-slate-400"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              autoFocus
            />
          </form>
        </div>
      </div>

      <style>{`
        @keyframes projectileUp {
          0% {
            bottom: 20%;
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
          100% {
            bottom: 80%;
            opacity: 0;
            transform: translateX(-50%) scale(0.5);
          }
        }
      `}</style>
    </div>
  );
}
