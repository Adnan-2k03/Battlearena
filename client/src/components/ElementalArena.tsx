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

interface FloatingText {
  id: string;
  text: string;
  type: 'hp' | 'shield';
  startTime: number;
}

interface PlayerCharges {
  id: string;
  team: 'blue' | 'red' | null;
  charges: ElementCharge;
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
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [typedKeys, setTypedKeys] = useState<Set<number>>(new Set());
  const [enemyElementCharges, setEnemyElementCharges] = useState<ElementCharge>({ fire: 0, water: 0, leaf: 0 });
  const [keyboardFlash, setKeyboardFlash] = useState<{ type: string; element?: Element } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { playHit, playSuccess, playCharge, playBarrier, playAttack } = useAudio();

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

    socket.on('element_charges_update', ({ playerCharges }: { playerCharges: PlayerCharges[] }) => {
      // Find enemy team charges
      const enemyTeamName = myTeam === 'blue' ? 'red' : 'blue';
      const enemyPlayers = playerCharges.filter(p => p.team === enemyTeamName);
      
      if (enemyPlayers.length > 0) {
        // Average the enemy charges for display
        const avgCharges: ElementCharge = { fire: 0, water: 0, leaf: 0 };
        enemyPlayers.forEach(p => {
          avgCharges.fire += p.charges.fire;
          avgCharges.water += p.charges.water;
          avgCharges.leaf += p.charges.leaf;
        });
        avgCharges.fire = Math.round(avgCharges.fire / enemyPlayers.length);
        avgCharges.water = Math.round(avgCharges.water / enemyPlayers.length);
        avgCharges.leaf = Math.round(avgCharges.leaf / enemyPlayers.length);
        setEnemyElementCharges(avgCharges);
      }
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

      playAttack();
      
      // Show keyboard flash for attack
      setKeyboardFlash({ type: attackerTeam === myTeam ? 'attack-out' : 'attack-in', element });
      setTimeout(() => setKeyboardFlash(null), 500);

      setTimeout(() => {
        setAttackEffects(prev => prev.filter(e => e.id !== effectId));
      }, 1500);
    });

    socket.on('barrier_created', ({ team, element, blueTeam: blue, redTeam: red }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      playBarrier();
      
      // Show keyboard flash for barrier
      setKeyboardFlash({ type: 'barrier', element });
      setTimeout(() => setKeyboardFlash(null), 500);
    });

    socket.on('small_boost', ({ blueTeam: blue, redTeam: red, team }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      
      // Show floating text indicating chip damage to enemy (always show it, not gated to myTeam)
      const damageId = `damage-${Date.now()}`;
      
      setFloatingTexts(prev => [...prev, 
        { id: damageId, text: '-3 HP', type: 'hp', startTime: Date.now() }
      ]);
      
      setTimeout(() => {
        setFloatingTexts(prev => prev.filter(t => t.id !== damageId));
      }, 1500);
    });

    socket.on('word_correct', ({ element, isCharge }: { element: Element; isCharge: boolean }) => {
      if (isCharge) {
        setMyCharges(prev => ({ 
          ...prev, 
          [element]: Math.min(100, prev[element] + 25) 
        }));
        playCharge();
        setKeyboardFlash({ type: 'charge', element });
        setTimeout(() => setKeyboardFlash(null), 300);
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
      socket.off('element_charges_update');
      socket.off('attack_landed');
      socket.off('barrier_created');
      socket.off('small_boost');
      socket.off('word_correct');
      socket.off('word_invalid');
    };
  }, [socket, roomId, myTeam, playHit, playSuccess, playCharge, playBarrier, playAttack]);
  
  // Track actual key presses for keyboard animation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.length === 1 || e.key === ' ') {
        const keyCode = e.key.toUpperCase().charCodeAt(0);
        let keyIndex = -1;
        
        if (keyCode >= 65 && keyCode <= 90) {
          keyIndex = keyCode - 65;
          if (keyIndex > 19) keyIndex = keyIndex % 20;
        } else if (e.key === ' ') {
          keyIndex = 19;
        }
        
        if (keyIndex >= 0) {
          setTypedKeys(prev => new Set(Array.from(prev).concat(keyIndex)));
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.length === 1 || e.key === ' ') {
        const keyCode = e.key.toUpperCase().charCodeAt(0);
        let keyIndex = -1;
        
        if (keyCode >= 65 && keyCode <= 90) {
          keyIndex = keyCode - 65;
          if (keyIndex > 19) keyIndex = keyIndex % 20;
        } else if (e.key === ' ') {
          keyIndex = 19;
        }
        
        if (keyIndex >= 0) {
          setTypedKeys(prev => {
            const newSet = new Set(prev);
            newSet.delete(keyIndex);
            return newSet;
          });
        }
      }
    };
    
    const handleBlur = () => {
      setTypedKeys(new Set());
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

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
            
            {/* Enemy Element Charges - Enhanced with glow */}
            <div className="bg-slate-700/30 rounded-lg p-3 mt-2">
              <span className="text-white text-sm font-bold mb-2 block flex items-center gap-2">
                ⚡ Enemy Charging Energy
              </span>
              <div className="flex gap-3">
                {(['fire', 'water', 'leaf'] as Element[]).map(element => (
                  <div key={element} className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <ElementIcon element={element} />
                        <span className="text-white text-xs font-bold capitalize">{element}</span>
                      </div>
                      <span className="text-white text-xs font-bold">{enemyElementCharges[element]}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-600 relative">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          enemyElementCharges[element] >= 80 ? 'animate-pulse' : ''
                        }`}
                        style={{ 
                          width: `${enemyElementCharges[element]}%`,
                          backgroundColor: ELEMENT_COLORS[element],
                          boxShadow: enemyElementCharges[element] >= 80 ? `0 0 10px ${ELEMENT_COLORS[element]}` : 'none'
                        }}
                      />
                      {enemyElementCharges[element] >= 100 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white text-xs font-bold animate-pulse">READY!</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {Object.values(enemyElementCharges).some(v => v >= 80) && (
                <p className="text-yellow-400 text-xs mt-2 animate-pulse font-bold">⚠️ Enemy attack incoming!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Arena - Middle */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        {/* Enhanced Attack Effects with trails */}
        {attackEffects.map((effect) => (
          <div key={effect.id} className="absolute" style={{ bottom: '20%', left: '50%' }}>
            <div
              className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: ELEMENT_COLORS[effect.element],
                transform: 'translateX(-50%)',
                animation: 'projectileUp 1.5s ease-out forwards',
                boxShadow: `0 0 20px ${ELEMENT_COLORS[effect.element]}, 0 0 40px ${ELEMENT_COLORS[effect.element]}${effect.isCritical ? ', 0 0 60px ' + ELEMENT_COLORS[effect.element] : ''}`
              }}
            >
              <ElementIcon element={effect.element} />
              <div className="absolute inset-0 rounded-full animate-ping opacity-75" 
                style={{ backgroundColor: ELEMENT_COLORS[effect.element] }} 
              />
              {effect.isCritical && (
                <Zap className="absolute w-10 h-10 text-yellow-300 animate-pulse" />
              )}
            </div>
          </div>
        ))}
        
        {/* Floating Text Indicators */}
        {floatingTexts.map((floating) => (
          <div
            key={floating.id}
            className={`absolute text-xl md:text-2xl font-bold pointer-events-none ${
              floating.type === 'hp' ? 'text-green-400' : 'text-blue-400'
            }`}
            style={{
              bottom: '50%',
              left: '50%',
              transform: 'translateX(-50%)',
              animation: 'floatUp 1.5s ease-out forwards',
              textShadow: '0 0 10px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            {floating.text}
          </div>
        ))}
        
        <div className="text-center">
          {/* Animated Keyboard Visual */}
          <div className={`relative mb-6 inline-block transition-all duration-300 ${
            keyboardFlash?.type === 'charge' ? 'scale-110' :
            keyboardFlash?.type === 'attack-out' ? 'scale-105 -translate-y-4' :
            keyboardFlash?.type === 'attack-in' ? 'scale-95 translate-y-2' :
            keyboardFlash?.type === 'barrier' ? 'scale-110' : ''
          }`}>
            {/* Keyboard Base */}
            <div className={`bg-slate-800 rounded-xl p-4 shadow-2xl border-4 transition-all duration-300 ${
              keyboardFlash?.type === 'charge' && keyboardFlash?.element ? 
                `shadow-lg` :
              keyboardFlash?.type === 'attack-out' && keyboardFlash?.element ? 
                `shadow-lg` :
              keyboardFlash?.type === 'attack-in' ? 'border-orange-600 shadow-orange-600/50' :
              keyboardFlash?.type === 'barrier' && keyboardFlash?.element ? 
                `shadow-lg` :
              'border-slate-600'
            }`}
            style={{
              borderColor: keyboardFlash?.element ? ELEMENT_COLORS[keyboardFlash.element] : undefined,
              boxShadow: keyboardFlash?.element ? `0 0 20px ${ELEMENT_COLORS[keyboardFlash.element]}` : undefined
            }}>
              {/* Keyboard Keys - 3 rows with better animation */}
              <div className="space-y-2">
                {/* Row 1 */}
                <div className="flex gap-1 justify-center">
                  {[...Array(10)].map((_, i) => (
                    <div key={`row1-${i}`} className={`w-6 h-6 md:w-8 md:h-8 rounded transition-all duration-100 ${
                      typedKeys.has(i) ? 'bg-slate-400 scale-95 shadow-inner' : 'bg-slate-700 shadow-md'
                    }`} />
                  ))}
                </div>
                {/* Row 2 */}
                <div className="flex gap-1 justify-center">
                  {[...Array(9)].map((_, i) => (
                    <div key={`row2-${i}`} className={`w-6 h-6 md:w-8 md:h-8 rounded transition-all duration-100 ${
                      typedKeys.has(i + 10) ? 'bg-slate-400 scale-95 shadow-inner' : 'bg-slate-700 shadow-md'
                    }`} />
                  ))}
                </div>
                {/* Row 3 - Spacebar */}
                <div className="flex gap-1 justify-center">
                  <div className={`w-40 h-6 md:w-48 md:h-8 rounded transition-all duration-100 ${
                    typedKeys.has(19) ? 'bg-slate-400 scale-95 shadow-inner' : 'bg-slate-700 shadow-md'
                  }`} />
                </div>
              </div>
              
              {/* Hands - Simplified finger indicators */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex gap-16">
                <div className="text-4xl opacity-70">👈</div>
                <div className="text-4xl opacity-70">👉</div>
              </div>
            </div>
            
            {/* Effect Indicators with element colors */}
            {keyboardFlash?.type === 'charge' && keyboardFlash?.element && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl animate-ping" 
                style={{ color: ELEMENT_COLORS[keyboardFlash.element] }}>⚡</div>
            )}
            {keyboardFlash?.type === 'attack-out' && keyboardFlash?.element && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl animate-pulse">
                <ElementIcon element={keyboardFlash.element} />
              </div>
            )}
            {keyboardFlash?.type === 'barrier' && keyboardFlash?.element && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl animate-pulse"
                style={{ color: ELEMENT_COLORS[keyboardFlash.element] }}>🛡️</div>
            )}
          </div>
          
          <p className="text-slate-300 text-sm md:text-base font-bold mb-2">
            {inputValue.length > 0 ? 'Typing...' : 'Type words to battle!'}
          </p>
          {keyboardFlash && (
            <p className="text-yellow-400 text-xs md:text-sm animate-pulse font-bold">
              {keyboardFlash.type === 'charge' && `⚡ Charging ${keyboardFlash.element?.toUpperCase()} Energy!`}
              {keyboardFlash.type === 'attack-out' && `💥 ${keyboardFlash.element?.toUpperCase()} Attack Sent!`}
              {keyboardFlash.type === 'attack-in' && '💥 Under Attack!'}
              {keyboardFlash.type === 'barrier' && `🛡️ ${keyboardFlash.element?.toUpperCase()} Barrier Activated!`}
            </p>
          )}
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
            transform: translateX(-50%) scale(0.3);
          }
        }
        
        @keyframes floatUp {
          0% {
            bottom: 50%;
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
          50% {
            opacity: 1;
            transform: translateX(-50%) translateY(-20px) scale(1.2);
          }
          100% {
            bottom: 60%;
            opacity: 0;
            transform: translateX(-50%) translateY(-40px) scale(0.8);
          }
        }
      `}</style>
    </div>
  );
}
