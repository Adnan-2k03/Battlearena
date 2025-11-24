import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameModeCollapseProps {
  selectedMode: 'solo' | 'team' | 'trio' | 'pentad';
  onModeChange: (mode: 'solo' | 'team' | 'trio' | 'pentad') => void;
}

export function GameModeCollapse({ selectedMode, onModeChange }: GameModeCollapseProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const modes = [
    { id: 'solo', label: '1v1 Solo', icon: '⚔️' },
    { id: 'team', label: '2v2 Team', icon: '👥' },
    { id: 'trio', label: '3v3 Trio', icon: '🎪' },
    { id: 'pentad', label: '5v5 Squad', icon: '⚡' }
  ];

  const selectedModeData = modes.find(m => m.id === selectedMode) || modes[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-600 rounded-md text-white text-sm hover:bg-slate-700/80 transition-all"
      >
        <span className="text-base">{selectedModeData.icon}</span>
        <span className="font-medium">{selectedModeData.label}</span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 ml-1" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-1" />
        )}
      </button>

      {isExpanded && (
        <div className="absolute top-full left-0 mt-1 w-full bg-slate-800 border border-slate-600 rounded-md overflow-hidden z-50 shadow-lg">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                onModeChange(mode.id as 'team' | 'solo');
                setIsExpanded(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-700 transition-colors",
                selectedMode === mode.id ? "bg-slate-700 text-white" : "text-slate-300"
              )}
            >
              <span className="text-base">{mode.icon}</span>
              <span className="font-medium">{mode.label}</span>
              {selectedMode === mode.id && (
                <span className="ml-auto text-green-400">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
