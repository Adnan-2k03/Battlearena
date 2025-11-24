import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { useAudio } from '@/lib/stores/useAudio';

export type Element = 'fire' | 'water' | 'leaf';
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
  fire: number;
  water: number;
  leaf: number;
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
  myRole: Role
) {
  const [blueTeam, setBlueTeam] = useState<TeamState>({ hp: 100, shield: 0, barrier: null });
  const [redTeam, setRedTeam] = useState<TeamState>({ hp: 100, shield: 0, barrier: null });
  const [players, setPlayers] = useState<Map<string, PlayerData>>(new Map());
  const [words, setWords] = useState<WordWithElement[]>([]);
  const [attackEvents, setAttackEvents] = useState<AttackEvent[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [myCharges, setMyCharges] = useState<ElementCharges>({ fire: 0, water: 0, leaf: 0 });
  
  const { playHit, playSuccess, playCharge, playBarrier, playAttack } = useAudio();

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('player_ready', { roomId });

    // Words update
    socket.on('new_words', ({ words: newWords }: { words: WordWithElement[] }) => {
      setWords(newWords);
    });

    // Element charges update
    socket.on('element_charges_update', ({ playerCharges }: { playerCharges: any[] }) => {
      const playersMap = new Map<string, PlayerData>();
      playerCharges.forEach((p: any) => {
        playersMap.set(p.id, {
          id: p.id,
          nickname: p.nickname || 'Player',
          team: p.team,
          role: p.role,
          charges: p.charges,
          isTyping: false,
          lastKeyPressed: null
        });
      });
      setPlayers(playersMap);
      
      // Update my charges
      const myData = playerCharges.find((p: any) => p.id === socket.id);
      if (myData) {
        setMyCharges(myData.charges);
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

    // Attack landed
    socket.on('attack_landed', ({ attackerTeam, element, blueTeam: blue, redTeam: red, isCritical }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      
      const effectId = `${Date.now()}-${Math.random()}`;
      setAttackEvents(prev => [...prev, {
        id: effectId,
        attackerTeam,
        element,
        startTime: Date.now(),
        isCritical: isCritical || false
      }]);

      playAttack();

      setTimeout(() => {
        setAttackEvents(prev => prev.filter(e => e.id !== effectId));
      }, 2000);
    });

    // Barrier created
    socket.on('barrier_created', ({ team, element, blueTeam: blue, redTeam: red }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      playBarrier();
    });

    // Small boost (chip damage to enemy)
    socket.on('small_boost', ({ blueTeam: blue, redTeam: red, team }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      
      const damageId = `damage-${Date.now()}`;
      // Show the damage text over the enemy team, not the attacker's team
      const enemyTeam = team === 'blue' ? 'red' : 'blue';
      
      setFloatingTexts(prev => [...prev, 
        { id: damageId, text: '-3 HP', type: 'hp', team: enemyTeam, startTime: Date.now() }
      ]);
      
      setTimeout(() => {
        setFloatingTexts(prev => prev.filter(t => t.id !== damageId));
      }, 1500);
    });

    // Damage dealt
    socket.on('damage_dealt', ({ attackerTeam, blueTeam: blue, redTeam: red, damage }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      playHit();
      
      const damageId = `damage-${Date.now()}`;
      const targetTeam = attackerTeam === 'blue' ? 'red' : 'blue';
      setFloatingTexts(prev => [...prev, 
        { id: damageId, text: `-${damage} HP`, type: 'damage', team: targetTeam, startTime: Date.now() }
      ]);
      
      setTimeout(() => {
        setFloatingTexts(prev => prev.filter(t => t.id !== damageId));
      }, 1500);
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
      socket.off('attack_landed');
      socket.off('barrier_created');
      socket.off('small_boost');
      socket.off('damage_dealt');
      socket.off('word_correct');
      socket.off('word_invalid');
    };
  }, [socket, roomId, playHit, playSuccess, playCharge, playBarrier, playAttack]);

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
    if (!socket || myCharges[element] < 100) return;

    socket.emit('use_element', {
      roomId,
      element,
      action
    });
  };

  return {
    blueTeam,
    redTeam,
    players,
    words,
    attackEvents,
    floatingTexts,
    myCharges,
    myTeam,
    myRole,
    enemyTeam: myTeam === 'blue' ? 'red' as Team : 'blue' as Team,
    myTeamState: myTeam === 'blue' ? blueTeam : redTeam,
    enemyTeamState: myTeam === 'blue' ? redTeam : blueTeam,
    submitWord,
    useElement
  };
}
