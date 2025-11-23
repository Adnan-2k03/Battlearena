import { Trophy, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface VictoryModalProps {
  winner: 'blue' | 'red';
  myTeam: 'blue' | 'red';
  onPlayAgain: () => void;
}

export function VictoryModal({ winner, myTeam, onPlayAgain }: VictoryModalProps) {
  const isWinner = winner === myTeam;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-w-md ${
        isWinner ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : 'bg-slate-800'
      } border-4 ${
        isWinner ? 'border-yellow-300' : 'border-slate-600'
      }`}>
        <CardContent className="pt-6 text-center space-y-6">
          <div className="text-6xl md:text-8xl">
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
            <div className="flex items-center justify-center gap-2 text-yellow-100">
              <Trophy className="w-8 h-8" />
              <span className="text-lg font-bold">Congratulations!</span>
              <Trophy className="w-8 h-8" />
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
