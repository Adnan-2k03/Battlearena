import { useEffect, useState } from "react";
import "@fontsource/inter";
import { useSocket } from "./hooks/useSocket";
import { Lobby } from "./components/Lobby";
import { GameArena } from "./components/GameArena";
import { VictoryModal } from "./components/VictoryModal";

type GamePhase = 'lobby' | 'playing' | 'ended';

interface Player {
  id: string;
  nickname: string;
  team: 'blue' | 'red' | null;
  role: 'striker' | 'guardian' | null;
}

function App() {
  const socket = useSocket();
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
  const [roomId, setRoomId] = useState('');
  const [myTeam, setMyTeam] = useState<'blue' | 'red' | null>(null);
  const [myRole, setMyRole] = useState<'striker' | 'guardian' | null>(null);
  const [winner, setWinner] = useState<'blue' | 'red' | null>(null);

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

    socket.on('match_ended', ({ winner: winningTeam }: { winner: 'blue' | 'red' }) => {
      setWinner(winningTeam);
      setGamePhase('ended');
    });

    return () => {
      socket.off('room_update');
      socket.off('match_started');
      socket.off('match_ended');
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
      {gamePhase === 'lobby' && (
        <Lobby socket={socket} onMatchStart={handleMatchStart} />
      )}

      {gamePhase === 'playing' && myTeam && myRole && (
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
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}

export default App;
