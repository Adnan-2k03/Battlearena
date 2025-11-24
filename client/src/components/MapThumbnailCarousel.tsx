import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { MAPS, ELEMENT_ICONS, ELEMENT_COLORS } from '@/lib/data/maps';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface MapThumbnailCarouselProps {
  selectedMapId: string;
  onMapSelect: (mapId: string) => void;
  playerLevel?: number;
  ownedMaps?: string[];
}

export function MapThumbnailCarousel({ 
  selectedMapId, 
  onMapSelect,
  playerLevel = 1,
  ownedMaps = []
}: MapThumbnailCarouselProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
        <span>🗺️</span>
        <span>Select Map</span>
      </h3>
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {MAPS.map((map) => {
            const isUnlocked = playerLevel >= map.unlockLevel || ownedMaps.includes(map.id);
            const isSelected = selectedMapId === map.id;
            
            return (
              <button
                key={map.id}
                onClick={() => isUnlocked && onMapSelect(map.id)}
                disabled={!isUnlocked}
                className={cn(
                  "flex-shrink-0 w-32 h-24 rounded-lg border-2 transition-all relative overflow-hidden",
                  isSelected 
                    ? "border-blue-400 shadow-lg shadow-blue-500/50 scale-105" 
                    : "border-slate-600 hover:border-slate-500",
                  !isUnlocked && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br",
                  map.id === 'elemental_arena' 
                    ? "from-green-900/60 to-blue-900/60" 
                    : "from-purple-900/60 to-slate-900/60"
                )}>
                  <div className="flex flex-col items-center justify-center h-full p-2">
                    <div className="text-2xl mb-1">{map.thumbnail}</div>
                    <div className="text-xs font-bold text-white text-center line-clamp-2">
                      {map.name}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {map.elements.map((element) => (
                        <span 
                          key={element}
                          className="text-xs"
                          style={{ color: ELEMENT_COLORS[element] }}
                        >
                          {ELEMENT_ICONS[element]}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {!isUnlocked && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="text-center">
                        <Lock className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <div className="text-xs text-slate-300">Level {map.unlockLevel}</div>
                      </div>
                    </div>
                  )}
                  
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
