import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Flame, Droplet, Leaf, Shield as ShieldIcon, Heart, Zap } from 'lucide-react';
import { useAudio } from '@/lib/stores/useAudio';
import * as THREE from 'three';

type Element = 'fire' | 'water' | 'leaf';

interface TeamState {
  hp: number;
  shield: number;
  barrier?: {
    element: Element;
    strength: number;
  } | null;
}

interface ElementCharge {
  fire: number;
  water: number;
  leaf: number;
}

interface ElementalArenaProps {
  socket: Socket | null;
  roomId: string;
  myTeam: 'blue' | 'red';
  myRole: 'striker' | 'guardian';
}

interface WordWithElement {
  word: string;
  element: Element;
  isCharge: boolean;
}

interface AttackEffect {
  id: string;
  element: Element;
  team: 'blue' | 'red';
  startTime: number;
  isCritical: boolean;
}

const ELEMENT_COLORS = {
  fire: '#ef4444',
  water: '#3b82f6',
  leaf: '#22c55e'
};

const ELEMENT_ICONS = {
  fire: Flame,
  water: Droplet,
  leaf: Leaf
};

// Element advantage system (rock-paper-scissors)
const getElementAdvantage = (attacker: Element, defender: Element): 'critical' | 'normal' | 'weak' => {
  if (attacker === 'fire' && defender === 'leaf') return 'critical';
  if (attacker === 'water' && defender === 'fire') return 'critical';
  if (attacker === 'leaf' && defender === 'water') return 'critical';
  
  if (attacker === 'fire' && defender === 'water') return 'weak';
  if (attacker === 'water' && defender === 'leaf') return 'weak';
  if (attacker === 'leaf' && defender === 'fire') return 'weak';
  
  return 'normal';
};

export function ElementalArena({ socket, roomId, myTeam, myRole }: ElementalArenaProps) {
  const [blueTeam, setBlueTeam] = useState<TeamState>({ hp: 100, shield: 0, barrier: null });
  const [redTeam, setRedTeam] = useState<TeamState>({ hp: 100, shield: 0, barrier: null });
  const [myCharges, setMyCharges] = useState<ElementCharge>({ fire: 0, water: 0, leaf: 0 });
  const [words, setWords] = useState<WordWithElement[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [attackEffects, setAttackEffects] = useState<AttackEffect[]>([]);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [actionMode, setActionMode] = useState<'attack' | 'barrier'>('attack');
  const inputRef = useRef<HTMLInputElement>(null);
  const { playHit, playSuccess } = useAudio();

  const enemyTeam = myTeam === 'blue' ? 'red' : 'blue';
  const myTeamState = myTeam === 'blue' ? blueTeam : redTeam;
  const enemyTeamState = myTeam === 'blue' ? redTeam : blueTeam;

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('player_ready', { roomId });

    socket.on('new_words', ({ words: newWords }: { words: WordWithElement[] }) => {
      setWords(newWords);
    });

    socket.on('element_charged', ({ element, charge }: { element: Element; charge: number }) => {
      setMyCharges(prev => ({ ...prev, [element]: charge }));
    });

    socket.on('attack_landed', ({ attackerTeam, element, blueTeam: blue, redTeam: red, isCritical }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      
      const effectId = `${Date.now()}-${Math.random()}`;
      setAttackEffects(prev => [...prev, {
        id: effectId,
        element,
        team: attackerTeam,
        startTime: Date.now(),
        isCritical
      }]);

      playHit();

      setTimeout(() => {
        setAttackEffects(prev => prev.filter(e => e.id !== effectId));
      }, 1500);
    });

    socket.on('barrier_created', ({ team, element, blueTeam: blue, redTeam: red }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      playSuccess();
    });

    socket.on('word_correct', ({ element, isCharge }: { element: Element; isCharge: boolean }) => {
      if (isCharge) {
        setMyCharges(prev => ({ 
          ...prev, 
          [element]: Math.min(100, prev[element] + 25) 
        }));
      }
      setInputValue('');
      inputRef.current?.focus();
    });

    socket.on('word_invalid', () => {
      setInputValue('');
      inputRef.current?.focus();
    });

    return () => {
      socket.off('new_words');
      socket.off('element_charged');
      socket.off('attack_landed');
      socket.off('barrier_created');
      socket.off('word_correct');
      socket.off('word_invalid');
    };
  }, [socket, roomId, playHit, playSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket) return;

    const typedWord = inputValue.trim().toUpperCase();
    const matchedWord = words.find(w => w.word === typedWord);

    if (matchedWord) {
      socket.emit('word_typed', { 
        roomId, 
        word: inputValue.trim(),
        element: matchedWord.element,
        isCharge: matchedWord.isCharge
      });
    }
  };

  const handleElementAction = (element: Element) => {
    if (!socket || myCharges[element] < 100) return;

    socket.emit('use_element', {
      roomId,
      element,
      action: actionMode
    });

    setMyCharges(prev => ({ ...prev, [element]: 0 }));
  };

  const getHealthBarColor = (hp: number) => {
    if (hp > 60) return 'bg-green-500';
    if (hp > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const ElementIcon = ({ element }: { element: Element }) => {
    const Icon = ELEMENT_ICONS[element];
    return <Icon className="w-5 h-5" style={{ color: ELEMENT_COLORS[element] }} />;
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Enemy Team Status - Top */}
      <div className="bg-slate-800/90 border-b-4 border-slate-700 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <h3 className={`text-lg md:text-xl font-bold mb-2 ${enemyTeam === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
            Enemy ({enemyTeam.toUpperCase()})
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
            {enemyTeamState.barrier && (
              <div className="bg-slate-700/50 rounded p-2 flex items-center gap-2 border-2" style={{ borderColor: ELEMENT_COLORS[enemyTeamState.barrier.element] }}>
                <ShieldIcon className="w-4 h-4" style={{ color: ELEMENT_COLORS[enemyTeamState.barrier.element] }} />
                <span className="text-white text-sm font-medium capitalize">{enemyTeamState.barrier.element} Barrier: {enemyTeamState.barrier.strength}/100</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Arena - Middle */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        {/* Attack Effects */}
        {attackEffects.map((effect) => (
          <div
            key={effect.id}
            className="absolute w-16 h-16 rounded-full flex items-center justify-center animate-ping"
            style={{
              backgroundColor: ELEMENT_COLORS[effect.element],
              bottom: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              animation: 'projectileUp 1.5s ease-out forwards',
              opacity: effect.isCritical ? 1 : 0.7,
              boxShadow: effect.isCritical ? `0 0 20px ${ELEMENT_COLORS[effect.element]}` : 'none'
            }}
          >
            <ElementIcon element={effect.element} />
            {effect.isCritical && (
              <Zap className="absolute w-8 h-8 text-yellow-300 animate-pulse" />
            )}
          </div>
        ))}
        
        <div className="text-center text-white">
          <div className="text-6xl md:text-8xl mb-4">⚔️</div>
          <p className="text-slate-400 text-sm md:text-base">Charge elements and unleash attacks!</p>
        </div>
      </div>

      {/* My Team Status - Bottom */}
      <div className="bg-slate-800/90 border-t-4 border-slate-700 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* My Team Stats */}
          <div className="space-y-2">
            <div className="text-center">
              <h2 className={`text-xl font-bold ${myTeam === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                Your Team ({myTeam.toUpperCase()})
              </h2>
            </div>
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
            {myTeamState.barrier && (
              <div className="bg-slate-700/50 rounded p-2 flex items-center gap-2 border-2 animate-pulse" style={{ borderColor: ELEMENT_COLORS[myTeamState.barrier.element] }}>
                <ShieldIcon className="w-4 h-4" style={{ color: ELEMENT_COLORS[myTeamState.barrier.element] }} />
                <span className="text-white text-sm font-medium capitalize">{myTeamState.barrier.element} Barrier: {myTeamState.barrier.strength}/100</span>
              </div>
            )}
          </div>

          {/* Element Charges */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <h3 className="text-white font-bold mb-2 text-sm">Element Energy:</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['fire', 'water', 'leaf'] as Element[]).map((element) => (
                <div key={element} className="space-y-1">
                  <div className="flex items-center gap-1">
                    <ElementIcon element={element} />
                    <span className="text-white text-xs capitalize">{element}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden border border-slate-600">
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${myCharges[element]}%`,
                        backgroundColor: ELEMENT_COLORS[element]
                      }}
                    />
                  </div>
                  <div className="text-xs text-center" style={{ color: ELEMENT_COLORS[element] }}>
                    {myCharges[element]}/100
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Mode Selector */}
          <div className="flex gap-2">
            <Button
              onClick={() => setActionMode('attack')}
              className={`flex-1 ${actionMode === 'attack' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-600 hover:bg-slate-500'}`}
            >
              <Zap className="w-4 h-4 mr-2" />
              Attack Mode
            </Button>
            <Button
              onClick={() => setActionMode('barrier')}
              className={`flex-1 ${actionMode === 'barrier' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-600 hover:bg-slate-500'}`}
            >
              <ShieldIcon className="w-4 h-4 mr-2" />
              Barrier Mode
            </Button>
          </div>

          {/* Element Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(['fire', 'water', 'leaf'] as Element[]).map((element) => {
              const isCharged = myCharges[element] >= 100;
              return (
                <Button
                  key={element}
                  onClick={() => handleElementAction(element)}
                  disabled={!isCharged}
                  className={`font-bold py-3 ${isCharged ? 'animate-pulse' : 'opacity-50'}`}
                  style={{
                    backgroundColor: isCharged ? ELEMENT_COLORS[element] : '#374151',
                    color: 'white'
                  }}
                >
                  <ElementIcon element={element} />
                  <span className="ml-2 capitalize">{actionMode === 'attack' ? 'Attack' : 'Barrier'}</span>
                </Button>
              );
            })}
          </div>

          {/* Word Deck */}
          <div className="bg-slate-700/50 rounded-lg p-3 md:p-4">
            <h3 className="text-white font-bold mb-2 text-sm md:text-base">Available Words:</h3>
            <div className="flex flex-wrap gap-2">
              {words.map((wordObj, index) => (
                <div
                  key={index}
                  className={`px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base border-2 ${
                    wordObj.isCharge ? 'animate-pulse shadow-lg' : ''
                  }`}
                  style={{
                    backgroundColor: ELEMENT_COLORS[wordObj.element] + (wordObj.isCharge ? 'FF' : '80'),
                    borderColor: ELEMENT_COLORS[wordObj.element],
                    color: 'white'
                  }}
                >
                  {wordObj.word}
                  {wordObj.isCharge && <span className="ml-1">⚡</span>}
                </div>
              ))}
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
            transform: translateX(-50%) scale(2);
          }
        }
      `}</style>
    </div>
  );
}
