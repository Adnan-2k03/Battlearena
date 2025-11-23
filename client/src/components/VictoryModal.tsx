import { useEffect } from 'react';
import { Trophy, RotateCcw, Swords, Shield, Target, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { useAudio } from '@/lib/stores/useAudio';

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

interface VictoryModalProps {
  winner: 'blue' | 'red';
  myTeam: 'blue' | 'red';
  stats?: PlayerStat[];
  onPlayAgain: () => void;
}

export function VictoryModal({ winner, myTeam, stats, onPlayAgain }: VictoryModalProps) {
  const isWinner = winner === myTeam;
  const { playSuccess, playHit } = useAudio();

  useEffect(() => {
    if (isWinner) {
      playSuccess();
    } else {
      playHit();
    }
  }, [isWinner, playSuccess, playHit]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className={`w-full max-w-3xl my-8 ${
        isWinner ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : 'bg-slate-800'
      } border-4 ${
        isWinner ? 'border-yellow-300' : 'border-slate-600'
      }`}>
        <CardContent className="pt-6 space-y-6">
          <div className="text-center">
            <div className="text-6xl md:text-8xl mb-4">
              {isWinner ? '🎉' : '😔'}
            </div>
            
            <div>
              <h2 className={`text-3xl md:text-4xl font-bold mb-2 ${
                isWinner ? 'text-white' : winner === 'blue' ? 'text-blue-400' : 'text-red-400'
              }`}>
                {isWinner ? 'VICTORY!' : 'DEFEAT'}
              </h2>
              <p className={`text-xl md:text-2xl font-semibold ${
                isWinner ? 'text-yellow-100' : 'text-white'
              }`}>
                Team {winner.toUpperCase()} Wins!
              </p>
            </div>

            {isWinner && (
              <div className="flex items-center justify-center gap-2 text-yellow-100 mt-4">
                <Trophy className="w-8 h-8" />
                <span className="text-lg font-bold">Congratulations!</span>
                <Trophy className="w-8 h-8" />
              </div>
            )}
          </div>

          {stats && stats.length > 0 && (
            <div className={`rounded-lg p-4 ${isWinner ? 'bg-white/20' : 'bg-slate-700/50'}`}>
              <h3 className={`text-xl font-bold mb-4 text-center ${isWinner ? 'text-white' : 'text-white'}`}>
                Match Statistics
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {stats.map((player) => (
                  <div 
                    key={player.id}
                    className={`rounded-lg p-4 ${
                      player.team === 'blue' ? 'bg-blue-900/40' : 'bg-red-900/40'
                    } border ${
                      player.team === 'blue' ? 'border-blue-500' : 'border-red-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {player.role === 'striker' ? (
                        <Swords className="w-5 h-5 text-red-400" />
                      ) : (
                        <Shield className="w-5 h-5 text-blue-400" />
                      )}
                      <h4 className={`font-bold ${
                        player.team === 'blue' ? 'text-blue-300' : 'text-red-300'
                      }`}>
                        {player.nickname}
                      </h4>
                    </div>
                    
                    <div className="space-y-2 text-sm text-white">
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4" /> WPM:
                        </span>
                        <span className="font-bold">{player.wpm}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1">
                          <Target className="w-4 h-4" /> Accuracy:
                        </span>
                        <span className="font-bold">{player.accuracy}%</span>
                      </div>
                      {player.role === 'striker' ? (
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">
                            <Swords className="w-4 h-4" /> Damage:
                          </span>
                          <span className="font-bold">{player.damageDealt}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">
                            <Shield className="w-4 h-4" /> Shield:
                          </span>
                          <span className="font-bold">{player.shieldRestored}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={onPlayAgain}
            className={`w-full font-bold py-6 text-lg ${
              isWinner 
                ? 'bg-white text-orange-600 hover:bg-yellow-100' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Play Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
