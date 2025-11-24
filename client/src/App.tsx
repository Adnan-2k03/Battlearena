import { useEffect, useState, useRef } from "react";
import "@fontsource/inter";
import { useSocket } from "./hooks/useSocket";
import { HomePage } from "./components/HomePage";
import { ElementalArena3D } from "./components/ElementalArena3D";
import { VictoryModal } from "./components/VictoryModal";
import { SoundManager } from "./components/SoundManager";
import { SpectatorView } from "./components/SpectatorView";
import { useAudio } from "./lib/stores/useAudio";
import { usePlayerProfile } from "./lib/stores/usePlayerProfile";
import { Button } from "./components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

type GamePhase = 'lobby' | 'playing' | 'ended';
type UserMode = 'player' | 'spectator';

interface Player {
  id: string;
  nickname: string;
  team: 'blue' | 'red' | null;
  role: 'striker' | 'guardian' | null;
}

interface AssignedPlayer {
  id: string;
  nickname: string;
  team: 'blue' | 'red';
  role: 'striker' | 'guardian';
}

interface PlayerStat {
  id: string;
  nickname: string;
  team: 'blue' | 'red';
  role: 'striker' | 'guardian';
  wpm: number;
  accuracy: number;
  damageDealt: number;
  shieldRestored: number;
}

interface TeamState {
  hp: number;
  shield: number;
}

function App() {
  const socket = useSocket();
  const [userMode, setUserMode] = useState<UserMode>('player');
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
  const [roomId, setRoomId] = useState('');
  const [myTeam, setMyTeam] = useState<'blue' | 'red' | null>(null);
  const [myRole, setMyRole] = useState<'striker' | 'guardian' | null>(null);
  const [winner, setWinner] = useState<'blue' | 'red' | null>(null);
  const [matchStats, setMatchStats] = useState<PlayerStat[]>([]);
  const [nickname, setNickname] = useState<string>('');
  const [gameMode, setGameMode] = useState<'team' | 'solo'>('solo');
  const [spectatorData, setSpectatorData] = useState<{
    players: AssignedPlayer[];
    blueTeam: TeamState;
    redTeam: TeamState;
    phase: string;
  } | null>(null);
  
  const { profile, updateStats, updateAchievement, addExperience } = usePlayerProfile();
  const isAdminMode = profile?.nickname?.toLowerCase().startsWith('admin') || false;
  
  const { initializeAudio, toggleMute, isMuted, initialized } = useAudio();

  useEffect(() => {
    if (!socket) return;

    console.log('Setting up socket listeners, socket.id:', socket.id);

    // Remove all previous listeners first
    socket.removeAllListeners('matched');
    socket.removeAllListeners('room_update');
    socket.removeAllListeners('match_started');
    socket.removeAllListeners('match_ended');
    socket.removeAllListeners('joined_as_spectator');

    socket.onAny((eventName, ...args) => {
      console.log('Socket event received:', eventName, args);
      
      // Manually handle events if handlers aren't working
      if (eventName === 'matched' && args[0]) {
        const { roomId: matchedRoomId, team, role } = args[0];
        console.log('MANUAL MATCHED HANDLER - roomId:', matchedRoomId, 'team:', team, 'role:', role);
        setRoomId(matchedRoomId);
        setMyTeam(team);
        setMyRole(role);
      } else if (eventName === 'room_update' && args[0]) {
        const { players } = args[0];
        console.log('MANUAL ROOM UPDATE HANDLER - players:', players, 'my socket.id:', socket.id);
        const me = players.find((p: any) => p.id === socket.id);
        if (me) {
          console.log('Found me in players - Setting team:', me.team, 'role:', me.role);
          if (me.team) setMyTeam(me.team);
          if (me.role) setMyRole(me.role);
        }
      } else if (eventName === 'match_started') {
        console.log('MANUAL MATCH STARTED HANDLER');
        setGamePhase('playing');
      } else if (eventName === 'match_ended' && args[0]) {
        const { winner: winningTeam, stats } = args[0];
        setWinner(winningTeam);
        setMatchStats(stats || []);
        setGamePhase('ended');
        
        if (profile) {
          const myStats = stats?.find((s: PlayerStat) => s.id === socket?.id);
          if (myStats) {
            const won = winningTeam === myStats.team;
            const wordsTypedThisMatch = myStats.wpm * 3;
            
            updateStats({
              totalWordsTyped: profile.stats.totalWordsTyped + wordsTypedThisMatch,
              totalMatchesPlayed: profile.stats.totalMatchesPlayed + 1,
              matchesWon: profile.stats.matchesWon + (won ? 1 : 0),
              matchesLost: profile.stats.matchesLost + (won ? 0 : 1),
              totalDamageDealt: profile.stats.totalDamageDealt + myStats.damageDealt,
              totalShieldRestored: profile.stats.totalShieldRestored + myStats.shieldRestored,
              highestWPM: Math.max(profile.stats.highestWPM, myStats.wpm),
              currentStreak: won ? profile.stats.currentStreak + 1 : 0,
              bestStreak: won ? Math.max(profile.stats.bestStreak, profile.stats.currentStreak + 1) : profile.stats.bestStreak
            });
            
            addExperience(won ? 200 : 50);
            
            if (won) {
              updateAchievement('first_win', profile.stats.matchesWon + 1);
            }
            if (myStats.wpm >= 100) {
              updateAchievement('speed_demon', 1);
            }
            updateAchievement('veteran', profile.stats.totalMatchesPlayed + 1);
            updateAchievement('damage_dealer', profile.stats.totalDamageDealt + myStats.damageDealt);
            updateAchievement('win_streak', profile.stats.currentStreak + (won ? 1 : 0));
            updateAchievement('word_master', profile.stats.totalWordsTyped + wordsTypedThisMatch);
          }
        }
      } else if (eventName === 'joined_as_spectator' && args[0]) {
        const { roomId: specRoomId, players, blueTeam, redTeam, phase } = args[0];
        setUserMode('spectator');
        setRoomId(specRoomId);
        const validPlayers = players.filter((p: any) => p.team && p.role);
        setSpectatorData({ players: validPlayers, blueTeam, redTeam, phase });
      } else if (eventName === 'player_left' && args[0]) {
        const { nickname: leftNickname } = args[0];
        console.log(`Player ${leftNickname} left the match`);
      } else if (eventName === 'left_match' && args[0]) {
        const { success } = args[0];
        if (success) {
          console.log('Successfully left match, returning to lobby');
          setGamePhase('lobby');
          setMyTeam(null);
          setMyRole(null);
          setWinner(null);
          setMatchStats([]);
          setRoomId('');
        }
      }
    });

    return () => {
      socket.offAny();
    };
  }, [socket]);

  const handleMatchStart = () => {
    setGamePhase('playing');
  };

  const handlePlayAgain = () => {
    if (!socket) return;
    
    setGamePhase('lobby');
    setMyTeam(null);
    setMyRole(null);
    setWinner(null);
    setMatchStats([]);
    setRoomId('');
  };

  useEffect(() => {
    const handleJoinRoom = (data: any) => {
      if (data.roomId) {
        setRoomId(data.roomId);
      }
    };

    if (socket) {
      const originalEmit = socket.emit.bind(socket);
      socket.emit = function(event: string, ...args: any[]) {
        if (event === 'join_room' && args[0]?.roomId) {
          setRoomId(args[0].roomId);
        }
        return originalEmit(event, ...args);
      };
    }
  }, [socket]);

  console.log('App render - gamePhase:', gamePhase, 'myTeam:', myTeam, 'myRole:', myRole, 'roomId:', roomId);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <SoundManager />
      
      {userMode === 'spectator' && spectatorData ? (
        <SpectatorView
          socket={socket}
          roomId={roomId}
          initialPlayers={spectatorData.players}
          initialBlueTeam={spectatorData.blueTeam}
          initialRedTeam={spectatorData.redTeam}
          initialPhase={spectatorData.phase}
        />
      ) : (
        <>
          {gamePhase === 'lobby' && (
            <HomePage 
              socket={socket} 
              onMatchStart={handleMatchStart}
              onRoomJoined={setRoomId}
            />
          )}

          {gamePhase === 'playing' && (
            <>
              {myTeam && myRole && roomId ? (
                <ElementalArena3D 
                  socket={socket}
                  roomId={roomId}
                  myTeam={myTeam}
                  myRole={myRole}
                  isAdminMode={isAdminMode}
                  selectedLaptop={profile?.selectedLaptop}
                  selectedMap={profile?.selectedMap || 'elemental_arena'}
                />
              ) : (
                <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-4 animate-pulse">⚔️</div>
                    <h2 className="text-2xl font-bold mb-2">Starting Match...</h2>
                    <p className="text-slate-400">Preparing the arena</p>
                  </div>
                </div>
              )}
            </>
          )}

          {gamePhase === 'ended' && winner && myTeam && (
            <VictoryModal 
              winner={winner}
              myTeam={myTeam}
              stats={matchStats}
              mySocketId={socket?.id}
              onPlayAgain={handlePlayAgain}
              onReturnHome={handlePlayAgain}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
