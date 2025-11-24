import { useState, useEffect, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { useAudio } from '@/lib/stores/useAudio';
import { getMapById } from '@/lib/data/maps';

export type Element = 'fire' | 'water' | 'leaf' | 'light' | 'darkness' | 'space';
export type Team = 'blue' | 'red';
export type Role = 'striker' | 'guardian';

export interface TeamState {
  hp: number;
  shield: number;
  barrier?: {
    element: Element;
    strength: number;
  } | null;
}

export interface ElementCharges {
  [key: string]: number;
}

export interface PlayerData {
  id: string;
  nickname: string;
  team: Team | null;
  role: Role | null;
  charges: ElementCharges;
  isTyping: boolean;
  lastKeyPressed: number | null;
}

export interface WordWithElement {
  word: string;
  element: Element;
  isCharge: boolean;
}

export interface AttackEvent {
  id: string;
  attackerTeam: Team;
  element: Element;
  startTime: number;
  isCritical: boolean;
}

export interface FloatingText {
  id: string;
  text: string;
  type: 'hp' | 'shield' | 'damage';
  team: Team;
  startTime: number;
}

export function useGameState(
  socket: Socket | null,
  roomId: string,
  myTeam: Team,
  myRole: Role,
  isAdminMode: boolean = false,
  selectedMap?: string
) {
  // Get map elements to initialize charges correctly
  const mapData = useMemo(() => getMapById(selectedMap || 'elemental_arena'), [selectedMap]);
  const mapElements = useMemo(() => (mapData?.elements || ['fire', 'water', 'leaf']) as Element[], [mapData]);
  
  // Initialize charges with map-specific elements
  const initialCharges = useMemo(() => {
    const charges: ElementCharges = {};
    mapElements.forEach(element => {
      charges[element] = 0;
    });
    return charges;
  }, [mapElements]);
  
  const [blueTeam, setBlueTeam] = useState<TeamState>({ hp: 100, shield: 0, barrier: null });
  const [redTeam, setRedTeam] = useState<TeamState>({ hp: 100, shield: 0, barrier: null });
  const [players, setPlayers] = useState<Map<string, PlayerData>>(new Map());
  const [words, setWords] = useState<WordWithElement[]>([]);
  const [attackEvents, setAttackEvents] = useState<AttackEvent[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [myCharges, setMyCharges] = useState<ElementCharges>(initialCharges);
  
  const { playHit, playSuccess, playCharge, playBarrier, playAttack } = useAudio();

  // Reset charges when map changes
  useEffect(() => {
    setMyCharges(initialCharges);
  }, [initialCharges]);

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('player_ready', { roomId });

    // Words update
    socket.on('new_words', ({ words: newWords }: { words: WordWithElement[] }) => {
      setWords(newWords);
    });

    // Element charges update - Optimized to only update changed values
    socket.on('element_charges_update', ({ playerCharges }: { playerCharges: any[] }) => {
      setPlayers(prev => {
        const playersMap = new Map(prev);
        playerCharges.forEach((p: any) => {
          const existingPlayer = playersMap.get(p.id);
          // Normalize charges to only include current map elements
          const normalizedCharges: ElementCharges = {};
          mapElements.forEach(element => {
            normalizedCharges[element] = p.charges[element] ?? 0;
          });
          
          playersMap.set(p.id, {
            id: p.id,
            nickname: p.nickname || existingPlayer?.nickname || 'Player',
            team: p.team,
            role: p.role,
            charges: normalizedCharges,
            isTyping: existingPlayer?.isTyping || false,
            lastKeyPressed: existingPlayer?.lastKeyPressed || null
          });
        });
        return playersMap;
      });
      
      // Update my charges - normalize to current map elements
      const myData = playerCharges.find((p: any) => p.id === socket.id);
      if (myData) {
        const normalizedMyCharges: ElementCharges = {};
        mapElements.forEach(element => {
          normalizedMyCharges[element] = isAdminMode ? 100 : (myData.charges[element] ?? 0);
        });
        setMyCharges(normalizedMyCharges);
      }
    });

    // Player typing event
    socket.on('player_typing', ({ playerId, keyIndex }: { playerId: string; keyIndex: number }) => {
      setPlayers(prev => {
        const newMap = new Map(prev);
        const player = newMap.get(playerId);
        if (player) {
          newMap.set(playerId, { ...player, isTyping: true, lastKeyPressed: keyIndex });
          setTimeout(() => {
            setPlayers(curr => {
              const updated = new Map(curr);
              const p = updated.get(playerId);
              if (p) {
                updated.set(playerId, { ...p, isTyping: false, lastKeyPressed: null });
              }
              return updated;
            });
          }, 100);
        }
        return newMap;
      });
    });

    // Attack initiated - Shows projectile immediately
    socket.on('attack_initiated', ({ attackerTeam, element }: { attackerTeam: Team; element: Element }) => {
      const effectId = `${Date.now()}-${Math.random()}`;
      const newAttack = {
        id: effectId,
        attackerTeam,
        element,
        startTime: Date.now(),
        isCritical: false
      };
      
      setAttackEvents(prev => {
        const filtered = prev.filter(e => Date.now() - e.startTime < 2000);
        const limited = filtered.slice(-5);
        return [...limited, newAttack];
      });

      playAttack();
    });

    // Attack landed - Updates HP/shields after projectile hits
    socket.on('attack_landed', ({ attackerTeam, element, blueTeam: blue, redTeam: red, isCritical, damage }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      
      // Play hit sound when damage is dealt
      if (damage > 0) {
        playHit();
      }
      
      // Update existing attack event to show it's critical if it is
      if (isCritical) {
        setAttackEvents(prev => prev.map(attack => {
          if (attack.attackerTeam === attackerTeam && attack.element === element) {
            return { ...attack, isCritical: true };
          }
          return attack;
        }));
      }
    });

    // Barrier created
    socket.on('barrier_created', ({ team, element, blueTeam: blue, redTeam: red }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      playBarrier();
    });

    // Match reset (admin command)
    socket.on('match_reset', ({ blueTeam: blue, redTeam: red }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      setAttackEvents([]);
      setFloatingTexts([]);
    });

    // Small boost (chip damage to enemy) - Optimized cleanup
    socket.on('small_boost', ({ blueTeam: blue, redTeam: red, team }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      
      const damageId = `damage-${Date.now()}`;
      const enemyTeam = team === 'blue' ? 'red' : 'blue';
      
      setFloatingTexts(prev => {
        const filtered = prev.filter(t => Date.now() - t.startTime < 1500);
        return [...filtered, { id: damageId, text: '-3 HP', type: 'hp', team: enemyTeam, startTime: Date.now() }];
      });
    });

    // Damage dealt - Optimized cleanup
    socket.on('damage_dealt', ({ attackerTeam, blueTeam: blue, redTeam: red, damage }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      playHit();
      
      const damageId = `damage-${Date.now()}`;
      const targetTeam = attackerTeam === 'blue' ? 'red' : 'blue';
      setFloatingTexts(prev => {
        const filtered = prev.filter(t => Date.now() - t.startTime < 1500);
        return [...filtered, { id: damageId, text: `-${damage} HP`, type: 'damage', team: targetTeam, startTime: Date.now() }];
      });
    });

    // Word correct
    socket.on('word_correct', ({ element, isCharge }: { element: Element; isCharge: boolean }) => {
      if (isCharge) {
        playCharge();
      } else {
        playSuccess();
      }
    });

    // Word invalid
    socket.on('word_invalid', () => {
      // Just a notification, no action needed
    });

    return () => {
      socket.off('new_words');
      socket.off('element_charges_update');
      socket.off('player_typing');
      socket.off('attack_initiated');
      socket.off('attack_landed');
      socket.off('barrier_created');
      socket.off('match_reset');
      socket.off('small_boost');
      socket.off('damage_dealt');
      socket.off('word_correct');
      socket.off('word_invalid');
    };
  }, [socket, roomId, playHit, playSuccess, playCharge, playBarrier, playAttack, isAdminMode, mapElements]);

  // Periodic cleanup for attack events and floating texts to prevent accumulation
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setAttackEvents(prev => prev.filter(e => now - e.startTime < 2000));
      setFloatingTexts(prev => prev.filter(t => now - t.startTime < 1500));
    }, 500);

    return () => clearInterval(cleanupInterval);
  }, []);

  const submitWord = (word: string) => {
    if (!socket || !word.trim()) return;

    const typedWord = word.trim().toUpperCase();
    const matchedWord = words.find(w => w.word === typedWord);

    if (matchedWord) {
      socket.emit('word_typed', { 
        roomId, 
        word: word.trim()
      });
    }
  };

  const useElement = (element: Element, action: 'attack' | 'barrier') => {
    console.log('useElement called:', { element, action, isAdminMode });
    
    if (!socket) {
      console.log('Element use blocked - no socket');
      return;
    }

    // In admin mode, always allow element use
    const charge = myCharges[element] ?? 0;
    if (!isAdminMode && charge < 100) {
      console.log('Element use blocked - charge not full:', charge);
      return;
    }

    console.log('Emitting use_element to server');
    socket.emit('use_element', {
      roomId,
      element,
      action
    });
  };

  // For admin mode, always return 100 for all charges
  const displayCharges = isAdminMode 
    ? Object.keys(myCharges).reduce((acc, key) => ({ ...acc, [key]: 100 }), {} as ElementCharges)
    : myCharges;

  return {
    blueTeam,
    redTeam,
    players,
    words,
    attackEvents,
    floatingTexts,
    myCharges: displayCharges,
    myTeam,
    myRole,
    enemyTeam: myTeam === 'blue' ? 'red' as Team : 'blue' as Team,
    myTeamState: myTeam === 'blue' ? blueTeam : redTeam,
    enemyTeamState: myTeam === 'blue' ? redTeam : blueTeam,
    submitWord,
    useElement
  };
}
