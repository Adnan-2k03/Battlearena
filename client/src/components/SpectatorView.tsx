import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Swords, Shield as ShieldIcon, Heart, Eye } from 'lucide-react';

interface TeamState {
  hp: number;
  shield: number;
}

interface Player {
  id: string;
  nickname: string;
  team: 'blue' | 'red';
  role: 'striker' | 'guardian';
}

interface SpectatorViewProps {
  socket: Socket | null;
  roomId: string;
  initialPlayers: Player[];
  initialBlueTeam: TeamState;
  initialRedTeam: TeamState;
  initialPhase: string;
}

export function SpectatorView({ 
  socket, 
  roomId, 
  initialPlayers, 
  initialBlueTeam, 
  initialRedTeam,
  initialPhase 
}: SpectatorViewProps) {
  const [blueTeam, setBlueTeam] = useState<TeamState>(initialBlueTeam);
  const [redTeam, setRedTeam] = useState<TeamState>(initialRedTeam);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [gamePhase, setGamePhase] = useState(initialPhase);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_update', ({ players: updatedPlayers, phase }: any) => {
      setPlayers(updatedPlayers);
      setGamePhase(phase);
    });

    socket.on('match_started', ({ blueTeam: blue, redTeam: red }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      setGamePhase('playing');
    });

    socket.on('damage_dealt', ({ blueTeam: blue, redTeam: red }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
    });

    socket.on('shield_restored', ({ blueTeam: blue, redTeam: red }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
    });

    socket.on('match_ended', ({ winner, blueTeam: blue, redTeam: red }: any) => {
      setBlueTeam(blue);
      setRedTeam(red);
      setGamePhase('ended');
    });

    return () => {
      socket.off('room_update');
      socket.off('match_started');
      socket.off('damage_dealt');
      socket.off('shield_restored');
      socket.off('match_ended');
    };
  }, [socket]);

  const getHealthBarColor = (hp: number) => {
    if (hp > 60) return 'bg-green-500';
    if (hp > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Spectator Banner */}
      <div className="bg-yellow-600 border-b-2 border-yellow-700 py-2 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-white font-bold">
          <Eye className="w-5 h-5" />
          <span>SPECTATOR MODE</span>
        </div>
      </div>

      {/* Blue Team Status */}
      <div className="bg-blue-900/40 border-b-4 border-blue-700 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-lg md:text-xl font-bold mb-2 text-blue-400">
            Blue Team
          </h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {players.filter(p => p.team === 'blue').map((player) => (
              <div key={player.id} className="flex items-center gap-2 text-white">
                {player.role === 'striker' ? (
                  <Swords className="w-4 h-4 text-red-400" />
                ) : (
                  <ShieldIcon className="w-4 h-4 text-blue-400" />
                )}
                <span>{player.nickname}</span>
                <span className="text-slate-400 text-sm">({player.role})</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="text-white text-sm font-medium">HP: {blueTeam.hp}/100</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-6 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${getHealthBarColor(blueTeam.hp)}`}
                  style={{ width: `${blueTeam.hp}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldIcon className="w-4 h-4 text-blue-400" />
                <span className="text-white text-sm font-medium">Shield: {blueTeam.shield}/100</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                <div 
                  className="h-full bg-blue-400 transition-all duration-300"
                  style={{ width: `${blueTeam.shield}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Arena */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-white">
          {gamePhase === 'lobby' && (
            <>
              <div className="text-6xl mb-4">⏳</div>
              <p className="text-xl font-bold">Waiting for match to start...</p>
            </>
          )}
          {gamePhase === 'playing' && (
            <>
              <div className="text-6xl mb-4">⚔️</div>
              <p className="text-xl font-bold">Battle in Progress!</p>
            </>
          )}
          {gamePhase === 'ended' && (
            <>
              <div className="text-6xl mb-4">🏆</div>
              <p className="text-xl font-bold">Match Ended</p>
            </>
          )}
        </div>
      </div>

      {/* Red Team Status */}
      <div className="bg-red-900/40 border-t-4 border-red-700 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-lg md:text-xl font-bold mb-2 text-red-400">
            Red Team
          </h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {players.filter(p => p.team === 'red').map((player) => (
              <div key={player.id} className="flex items-center gap-2 text-white">
                {player.role === 'striker' ? (
                  <Swords className="w-4 h-4 text-red-400" />
                ) : (
                  <ShieldIcon className="w-4 h-4 text-blue-400" />
                )}
                <span>{player.nickname}</span>
                <span className="text-slate-400 text-sm">({player.role})</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="text-white text-sm font-medium">HP: {redTeam.hp}/100</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-6 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${getHealthBarColor(redTeam.hp)}`}
                  style={{ width: `${redTeam.hp}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldIcon className="w-4 h-4 text-blue-400" />
                <span className="text-white text-sm font-medium">Shield: {redTeam.shield}/100</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                <div 
                  className="h-full bg-blue-400 transition-all duration-300"
                  style={{ width: `${redTeam.shield}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
