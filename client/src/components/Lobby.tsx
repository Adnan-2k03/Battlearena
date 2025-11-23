import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Users, Swords, Shield } from 'lucide-react';

interface Player {
  id: string;
  nickname: string;
  team: 'blue' | 'red' | null;
  role: 'striker' | 'guardian' | null;
}

interface LobbyProps {
  socket: Socket | null;
  onMatchStart: () => void;
  onRoomJoined?: (roomId: string) => void;
}

export function Lobby({ socket, onMatchStart, onRoomJoined }: LobbyProps) {
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [canStart, setCanStart] = useState(false);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [useManualRoom, setUseManualRoom] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_update', ({ players: updatedPlayers, canStart: canStartMatch }) => {
      setPlayers(updatedPlayers);
      setCanStart(canStartMatch);
      setIsSearching(false);
    });

    socket.on('room_full', () => {
      setError('Room is full (max 4 players)');
      setHasJoined(false);
      setIsSearching(false);
    });

    socket.on('match_started', () => {
      onMatchStart();
    });

    socket.on('queue_update', ({ position }: { position: number }) => {
      setQueuePosition(position);
    });

    socket.on('matched', ({ roomId: matchedRoomId }: { roomId: string }) => {
      setRoomId(matchedRoomId);
      setHasJoined(true);
      setIsSearching(false);
      onRoomJoined?.(matchedRoomId);
    });

    return () => {
      socket.off('room_update');
      socket.off('room_full');
      socket.off('match_started');
      socket.off('queue_update');
      socket.off('matched');
    };
  }, [socket, onMatchStart, onRoomJoined]);

  const handleQuickMatch = () => {
    if (!nickname.trim()) {
      setError('Please enter your nickname');
      return;
    }

    if (!socket) {
      setError('Connection not ready');
      return;
    }

    setError('');
    setIsSearching(true);
    socket.emit('join_queue', { nickname: nickname.trim() });
  };

  const handleJoin = () => {
    if (!nickname.trim() || !roomId.trim()) {
      setError('Please enter both nickname and room ID');
      return;
    }

    if (!socket) {
      setError('Connection not ready');
      return;
    }

    setError('');
    socket.emit('join_room', { nickname: nickname.trim(), roomId: roomId.trim() });
    setHasJoined(true);
    onRoomJoined?.(roomId.trim());
  };

  const handleStartMatch = () => {
    if (!socket || !roomId) return;
    socket.emit('start_match', { roomId });
  };

  const getTeamColor = (team: string | null) => {
    return team === 'blue' ? 'text-blue-500' : 'text-red-500';
  };

  const getRoleIcon = (role: string | null) => {
    return role === 'striker' ? <Swords className="w-4 h-4" /> : <Shield className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-2xl bg-slate-800/90 border-slate-700 text-white">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
            <Users className="w-8 h-8" />
            2v2 Battle Arena
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasJoined && !isSearching ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nickname</label>
                <Input
                  type="text"
                  placeholder="Enter your nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !useManualRoom && handleQuickMatch()}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  autoComplete="off"
                />
              </div>
              
              {useManualRoom && (
                <div>
                  <label className="block text-sm font-medium mb-2">Room ID</label>
                  <Input
                    type="text"
                    placeholder="Enter room ID (e.g., room123)"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    autoComplete="off"
                  />
                </div>
              )}
              
              {error && (
                <div className="text-red-400 text-sm bg-red-900/30 p-3 rounded">
                  {error}
                </div>
              )}
              
              {!useManualRoom ? (
                <div className="space-y-2">
                  <Button 
                    onClick={handleQuickMatch}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-6 text-lg"
                  >
                    Quick Match (Auto-Find Players)
                  </Button>
                  <button
                    onClick={() => setUseManualRoom(true)}
                    className="w-full text-slate-400 hover:text-white text-sm underline"
                  >
                    Or join a specific room
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button 
                    onClick={handleJoin}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 text-lg"
                  >
                    Join Room
                  </Button>
                  <button
                    onClick={() => setUseManualRoom(false)}
                    className="w-full text-slate-400 hover:text-white text-sm underline"
                  >
                    Back to Quick Match
                  </button>
                </div>
              )}
            </div>
          ) : isSearching ? (
            <div className="space-y-4 text-center">
              <div className="animate-spin mx-auto w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full" />
              <h3 className="text-xl font-bold">Searching for Players...</h3>
              <p className="text-slate-400">
                Players in queue: {queuePosition}
              </p>
              <p className="text-sm text-slate-500">
                Waiting for 4 players to start a match
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Room: {roomId}</h3>
                <p className="text-slate-400 text-sm">
                  Waiting for players... ({players.length}/4)
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                  <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    Blue Team
                  </h4>
                  <div className="space-y-2">
                    {players.filter(p => p.team === 'blue').map((player) => (
                      <div key={player.id} className="flex items-center gap-2 text-sm">
                        {getRoleIcon(player.role)}
                        <span className={getTeamColor(player.team)}>{player.nickname}</span>
                        <span className="text-slate-400 text-xs">
                          ({player.role})
                        </span>
                      </div>
                    ))}
                    {players.filter(p => p.team === 'blue').length === 0 && (
                      <p className="text-slate-500 text-sm italic">Waiting for players...</p>
                    )}
                  </div>
                </div>

                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                  <h4 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    Red Team
                  </h4>
                  <div className="space-y-2">
                    {players.filter(p => p.team === 'red').map((player) => (
                      <div key={player.id} className="flex items-center gap-2 text-sm">
                        {getRoleIcon(player.role)}
                        <span className={getTeamColor(player.team)}>{player.nickname}</span>
                        <span className="text-slate-400 text-xs">
                          ({player.role})
                        </span>
                      </div>
                    ))}
                    {players.filter(p => p.team === 'red').length === 0 && (
                      <p className="text-slate-500 text-sm italic">Waiting for players...</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 text-sm">
                <p className="text-slate-300 mb-2">
                  <strong>How to Play:</strong>
                </p>
                <ul className="text-slate-400 space-y-1 ml-4">
                  <li>• <strong className="text-red-400">Strikers</strong> type attack words to damage enemies</li>
                  <li>• <strong className="text-blue-400">Guardians</strong> type defense words to restore shields</li>
                  <li>• First team to reduce enemy HP to 0 wins!</li>
                </ul>
              </div>

              <Button 
                onClick={handleStartMatch}
                disabled={!canStart}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-6 text-lg"
              >
                {canStart ? 'Start Match' : `Waiting for ${2 - players.length} more player(s)`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
