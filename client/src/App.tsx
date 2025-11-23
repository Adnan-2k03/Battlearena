import { useEffect, useState } from "react";
import "@fontsource/inter";
import { useSocket } from "./hooks/useSocket";
import { Lobby } from "./components/Lobby";
import { GameArena } from "./components/GameArena";
import { ElementalArena } from "./components/ElementalArena";
import { VictoryModal } from "./components/VictoryModal";
import { SoundManager } from "./components/SoundManager";
import { SpectatorView } from "./components/SpectatorView";

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

  useEffect(() => {
    if (!socket) return;

    console.log('Setting up socket listeners, socket.id:', socket.id);

    const handleMatched = ({ roomId: matchedRoomId, team, role }: { roomId: string; team: 'blue' | 'red'; role: 'striker' | 'guardian' }) => {
      console.log('Matched event received - roomId:', matchedRoomId, 'team:', team, 'role:', role);
      setRoomId(matchedRoomId);
      setMyTeam(team);
      setMyRole(role);
    };

    const handleRoomUpdate = ({ players }: { players: Player[] }) => {
      console.log('Room update event received, players:', players, 'my socket.id:', socket.id);
      const me = players.find(p => p.id === socket.id);
      if (me) {
        console.log('Found me in players - Setting team:', me.team, 'role:', me.role);
        if (me.team) setMyTeam(me.team);
        if (me.role) setMyRole(me.role);
      } else {
        console.log('Could not find myself in players list!');
      }
    };

    socket.on('matched', handleMatched);
    socket.on('room_update', handleRoomUpdate);

    socket.on('match_started', () => {
      console.log('Match started event received');
      setGamePhase('playing');
    });

    socket.on('match_ended', ({ winner: winningTeam, stats }: { winner: 'blue' | 'red'; stats: PlayerStat[] }) => {
      setWinner(winningTeam);
      setMatchStats(stats || []);
      setGamePhase('ended');
    });

    socket.on('joined_as_spectator', ({ roomId: specRoomId, players, blueTeam, redTeam, phase }: any) => {
      setUserMode('spectator');
      setRoomId(specRoomId);
      const validPlayers = players.filter((p: any) => p.team && p.role);
      setSpectatorData({ players: validPlayers, blueTeam, redTeam, phase });
    });

    socket.onAny((eventName, ...args) => {
      console.log('Socket event received:', eventName, args);
    });

    return () => {
      socket.off('matched');
      socket.off('room_update');
      socket.off('match_started');
      socket.off('match_ended');
      socket.off('joined_as_spectator');
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
    
    if (nickname) {
      socket.emit('join_queue', { nickname, mode: gameMode });
    }
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
            <Lobby 
              socket={socket} 
              onMatchStart={handleMatchStart}
              onRoomJoined={setRoomId}
              initialNickname={nickname}
              onNicknameSet={setNickname}
              onModeSelect={setGameMode}
            />
          )}

          {gamePhase === 'playing' && (
            <>
              {myTeam && myRole && roomId ? (
                <ElementalArena 
                  socket={socket}
                  roomId={roomId}
                  myTeam={myTeam}
                  myRole={myRole}
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
              onPlayAgain={handlePlayAgain}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
