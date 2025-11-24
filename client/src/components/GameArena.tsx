import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Input } from './ui/input';
import { Swords, Shield as ShieldIcon, Heart, Flame, Droplet, Leaf } from 'lucide-react';
import { useAudio } from '@/lib/stores/useAudio';
import { LaptopCharacterStage } from './LaptopCharacterStage';
import { usePlayerProfile } from '@/lib/stores/usePlayerProfile';

interface TeamState {
  hp: number;
  shield: number;
  barrier?: {
    element: 'fire' | 'water' | 'leaf';
    strength: number;
  } | null;
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

interface FloatingText {
  id: string;
  text: string;
  type: 'hp' | 'shield';
  startTime: number;
}

type Element = 'fire' | 'water' | 'leaf';

interface WordWithElement {
  word: string;
  element: Element;
  isCharge: boolean;
}

interface ElementCharges {
  fire: number;
  water: number;
  leaf: number;
}

interface PlayerCharges {
  id: string;
  team: 'blue' | 'red' | null;
  charges: ElementCharges;
}

export function GameArena({ socket, roomId, myTeam, myRole }: GameArenaProps) {
  const [blueTeam, setBlueTeam] = useState<TeamState>({ hp: 100, shield: 0 });
  const [redTeam, setRedTeam] = useState<TeamState>({ hp: 100, shield: 0 });
  const [words, setWords] = useState<WordWithElement[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [shieldFlash, setShieldFlash] = useState<'blue' | 'red' | null>(null);
  const [playerCharges, setPlayerCharges] = useState<PlayerCharges[]>([]);
  const [myElementCharges, setMyElementCharges] = useState<ElementCharges>({ fire: 0, water: 0, leaf: 0 });
  const [enemyElementCharges, setEnemyElementCharges] = useState<ElementCharges>({ fire: 0, water: 0, leaf: 0 });
  const [keyboardFlash, setKeyboardFlash] = useState<string | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [typedKeys, setTypedKeys] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const { playHit, playSuccess, playCharge, playBarrier, playAttack } = useAudio();
  const { profile } = usePlayerProfile();

  const enemyTeam = myTeam === 'blue' ? 'red' : 'blue';
  const myTeamState = myTeam === 'blue' ? blueTeam : redTeam;
  const enemyTeamState = myTeam === 'blue' ? redTeam : blueTeam;

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('player_ready', { roomId });

    socket.on('new_words', ({ words: newWords }: { words: WordWithElement[] }) => {
      setWords(newWords);
    });

    socket.on('element_charges_update', ({ playerCharges: charges }: { playerCharges: PlayerCharges[] }) => {
      setPlayerCharges(charges);
      
      // Find my charges
      const myCharges = charges.find(p => p.id === socket.id);
      if (myCharges) {
        setMyElementCharges(myCharges.charges);
      }
      
      // Find enemy team charges (only players on the opposite team)
      const enemyTeamName = myTeam === 'blue' ? 'red' : 'blue';
      const enemyPlayers = charges.filter(p => p.team === enemyTeamName);
      
      if (enemyPlayers.length > 0) {
        // Average the enemy charges for display
        const avgCharges: ElementCharges = { fire: 0, water: 0, leaf: 0 };
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

    socket.on('attack_landed', ({ blueTeam: blue, redTeam: red, attackerTeam }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      playAttack();
      
      setKeyboardFlash(attackerTeam === myTeam ? 'attack-out' : 'attack-in');
      setTimeout(() => setKeyboardFlash(null), 500);
    });

    socket.on('barrier_created', ({ blueTeam: blue, redTeam: red, team }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      playBarrier();
      
      setKeyboardFlash(team === myTeam ? 'barrier' : null);
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

    socket.on('shield_restored', ({ team, blueTeam: blue, redTeam: red }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      
      setShieldFlash(team);
      playSuccess();
      
      setTimeout(() => {
        setShieldFlash(null);
      }, 500);
    });

    socket.on('word_correct', ({ isCharge }: any) => {
      setInputValue('');
      inputRef.current?.focus();
      
      if (isCharge) {
        playCharge();
        setKeyboardFlash('charge');
        setTimeout(() => setKeyboardFlash(null), 300);
      }
    });

    socket.on('word_invalid', () => {
      setInputValue('');
      inputRef.current?.focus();
    });

    return () => {
      socket.off('new_words');
      socket.off('element_charges_update');
      socket.off('damage_dealt');
      socket.off('attack_landed');
      socket.off('barrier_created');
      socket.off('small_boost');
      socket.off('shield_restored');
      socket.off('word_correct');
      socket.off('word_invalid');
    };
  }, [socket, roomId, myTeam, playHit, playSuccess, playCharge, playBarrier, playAttack]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket) return;

    socket.emit('word_typed', { 
      roomId, 
      word: inputValue.trim()
    });
  };
  
  // Track actual key presses for keyboard animation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only track alphanumeric and space keys
      if (e.key.length === 1 || e.key === ' ') {
        const keyCode = e.key.toUpperCase().charCodeAt(0);
        // Map keys to visual keyboard positions (0-19)
        let keyIndex = -1;
        
        if (keyCode >= 65 && keyCode <= 90) { // A-Z
          keyIndex = keyCode - 65; // Map A-Z to 0-19
          if (keyIndex > 19) keyIndex = keyIndex % 20;
        } else if (e.key === ' ') {
          keyIndex = 19; // Spacebar
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
    
    // Clear all keys on blur
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

  const getHealthBarColor = (hp: number) => {
    if (hp > 60) return 'bg-green-500';
    if (hp > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getElementIcon = (element: Element, size: string = "w-4 h-4") => {
    switch (element) {
      case 'fire':
        return <Flame className={`${size} text-orange-500`} />;
      case 'water':
        return <Droplet className={`${size} text-blue-500`} />;
      case 'leaf':
        return <Leaf className={`${size} text-green-500`} />;
    }
  };

  const getElementColor = (element: Element) => {
    switch (element) {
      case 'fire':
        return 'bg-orange-500';
      case 'water':
        return 'bg-blue-500';
      case 'leaf':
        return 'bg-green-500';
    }
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
            
            {/* Enemy Element Charges - Enhanced with glow */}
            <div className="bg-slate-700/30 rounded-lg p-3">
              <span className="text-white text-sm font-bold mb-2 block flex items-center gap-2">
                ⚡ Enemy Charging Energy
              </span>
              <div className="flex gap-3">
                {(['fire', 'water', 'leaf'] as Element[]).map(element => (
                  <div key={element} className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        {getElementIcon(element, "w-4 h-4")}
                        <span className="text-white text-xs font-bold capitalize">{element}</span>
                      </div>
                      <span className="text-white text-xs font-bold">{enemyElementCharges[element]}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-600 relative">
                      <div 
                        className={`h-full transition-all duration-500 ${getElementColor(element)} ${
                          enemyElementCharges[element] >= 80 ? 'animate-pulse shadow-lg' : ''
                        }`}
                        style={{ 
                          width: `${enemyElementCharges[element]}%`,
                          boxShadow: enemyElementCharges[element] >= 80 ? '0 0 10px currentColor' : 'none'
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
            
            {/* Enemy Barrier Display */}
            {enemyTeamState.barrier && (
              <div className="bg-slate-700/50 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  {getElementIcon(enemyTeamState.barrier.element, "w-5 h-5")}
                  <span className="text-white text-sm font-bold">Barrier Active!</span>
                  <span className="text-white text-sm">{enemyTeamState.barrier.strength}/100</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Arena - Middle */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        {/* Battle Companion - Bottom Right Corner */}
        {profile?.selectedLaptop && (
          <div className="absolute bottom-4 right-4 w-48 h-48 rounded-lg overflow-hidden shadow-2xl border-4 border-purple-500/50 hover:border-purple-400 transition-all">
            <LaptopCharacterStage selectedLaptopId={profile.selectedLaptop} />
          </div>
        )}
        
        {/* Improved Projectiles with trails */}
        {projectiles.map((projectile) => (
          <div key={projectile.id} className="absolute" style={{ bottom: '20%', left: '50%' }}>
            <div
              className={`w-12 h-12 md:w-16 md:h-16 rounded-full ${
                projectile.team === 'blue' ? 'bg-blue-500' : 'bg-red-500'
              }`}
              style={{
                transform: 'translateX(-50%)',
                animation: 'projectileUp 1s ease-out forwards',
                boxShadow: projectile.team === 'blue' 
                  ? '0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4)' 
                  : '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4)'
              }}
            >
              <div className="absolute inset-0 rounded-full animate-ping opacity-75" 
                style={{ backgroundColor: projectile.team === 'blue' ? '#3b82f6' : '#ef4444' }} 
              />
            </div>
          </div>
        ))}
        
        {/* Floating Text Indicators */}
        {floatingTexts.map((floating) => (
          <div
            key={floating.id}
            className={`absolute text-lg md:text-xl font-bold pointer-events-none ${
              floating.type === 'hp' ? 'text-green-400' : 'text-blue-400'
            }`}
            style={{
              bottom: '60%',
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
            keyboardFlash === 'charge' ? 'scale-110' :
            keyboardFlash === 'attack-out' ? 'scale-105 -translate-y-4' :
            keyboardFlash === 'attack-in' ? 'scale-95 translate-y-2' :
            keyboardFlash === 'barrier' ? 'scale-110' : ''
          }`}>
            {/* Keyboard Base */}
            <div className={`bg-slate-800 rounded-xl p-4 shadow-2xl border-4 transition-all duration-300 ${
              keyboardFlash === 'charge' ? 'border-yellow-400 shadow-yellow-500/50' :
              keyboardFlash === 'attack-out' ? 'border-red-500 shadow-red-500/50' :
              keyboardFlash === 'attack-in' ? 'border-orange-600 shadow-orange-600/50' :
              keyboardFlash === 'barrier' ? 'border-blue-400 shadow-blue-400/50' :
              'border-slate-600'
            }`}>
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
            
            {/* Effect Indicators */}
            {keyboardFlash === 'charge' && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl animate-ping">⚡</div>
            )}
            {keyboardFlash === 'attack-out' && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl animate-pulse">💥</div>
            )}
            {keyboardFlash === 'barrier' && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl animate-pulse">🛡️</div>
            )}
          </div>
          
          <p className="text-slate-300 text-sm md:text-base font-bold mb-2">
            {inputValue.length > 0 ? 'Typing...' : 'Type words to battle!'}
          </p>
          {keyboardFlash && (
            <p className="text-yellow-400 text-xs md:text-sm animate-pulse">
              {keyboardFlash === 'charge' && '⚡ Charging Element Energy!'}
              {keyboardFlash === 'attack-out' && '💥 Attack Sent!'}
              {keyboardFlash === 'attack-in' && '💥 Under Attack!'}
              {keyboardFlash === 'barrier' && '🛡️ Barrier Activated!'}
            </p>
          )}
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

          {/* My Element Charges */}
          <div>
            <span className="text-white text-sm font-medium mb-1 block">Your Element Charges:</span>
            <div className="flex gap-3">
              {(['fire', 'water', 'leaf'] as Element[]).map(element => (
                <div key={element} className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getElementIcon(element, "w-4 h-4")}
                    <span className="text-white text-sm font-bold">{myElementCharges[element]}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${getElementColor(element)} ${myElementCharges[element] >= 100 ? 'animate-pulse' : ''}`}
                      style={{ width: `${myElementCharges[element]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Type elemental words to charge. Use at 100% to attack/barrier!</p>
          </div>

          {/* Word Deck */}
          <div className="bg-slate-700/50 rounded-lg p-3 md:p-4">
            <h3 className="text-white font-bold mb-2 text-sm md:text-base">Available Words:</h3>
            <div className="flex flex-wrap gap-2">
              {words.map((wordObj, index) => {
                const isCharge = wordObj.isCharge;
                return (
                  <div
                    key={index}
                    className={`px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base flex items-center gap-1 ${
                      isCharge
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-pulse shadow-lg'
                        : 'bg-slate-600 text-white border-2 border-slate-500'
                    }`}
                  >
                    {getElementIcon(wordObj.element, "w-4 h-4")}
                    <span>{wordObj.word}</span>
                    {isCharge && <span className="ml-1">⚡</span>}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {words.some(w => w.isCharge) && "⚡ = Charge words (+30 energy)"}
              {" | "}Normal words: +10 energy, +2 HP, +3 Shield
            </p>
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
            bottom: 60%;
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
          50% {
            opacity: 1;
            transform: translateX(-50%) translateY(-20px) scale(1.2);
          }
          100% {
            bottom: 70%;
            opacity: 0;
            transform: translateX(-50%) translateY(-40px) scale(0.8);
          }
        }
      `}</style>
    </div>
  );
}
