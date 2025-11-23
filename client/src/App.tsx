import { useEffect, useState } from "react";
import "@fontsource/inter";
import { useSocket } from "./hooks/useSocket";
import { Lobby } from "./components/Lobby";
import { GameArena } from "./components/GameArena";
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
  const [spectatorData, setSpectatorData] = useState<{
    players: AssignedPlayer[];
    blueTeam: TeamState;
    redTeam: TeamState;
    phase: string;
  } | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_update', ({ players }: { players: Player[] }) => {
      const me = players.find(p => p.id === socket.id);
      if (me) {
        setMyTeam(me.team);
        setMyRole(me.role);
      }
    });

    socket.on('match_started', () => {
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

    socket.on('matched', ({ roomId: matchedRoomId, team, role }: { roomId: string; team: 'blue' | 'red'; role: 'striker' | 'guardian' }) => {
      setRoomId(matchedRoomId);
      setMyTeam(team);
      setMyRole(role);
    });

    return () => {
      socket.off('room_update');
      socket.off('match_started');
      socket.off('match_ended');
      socket.off('joined_as_spectator');
      socket.off('matched');
    };
  }, [socket]);

  const handleMatchStart = () => {
    setGamePhase('playing');
  };

  const handlePlayAgain = () => {
    window.location.reload();
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
            />
          )}

          {gamePhase === 'playing' && myTeam && myRole && roomId && (
            <GameArena 
              socket={socket}
              roomId={roomId}
              myTeam={myTeam}
              myRole={myRole}
            />
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
