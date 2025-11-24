import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Lock, ShoppingCart, MessageCircle, LogOut } from 'lucide-react';
import { GameModeCollapse } from './GameModeCollapse';
import { MapThumbnailCarousel } from './MapThumbnailCarousel';
import { LaptopCharacterStage } from './LaptopCharacterStage';
import { LaptopCompanionChat } from './LaptopCompanionChat';
import { usePlayerProfile } from '@/lib/stores/usePlayerProfile';
import { LAPTOPS, getRarityColor } from '@/lib/data/laptops';
import { cn } from '@/lib/utils';

interface BattleDashboardProps {
  socket: Socket | null;
  onStartMatch: (mode: 'solo' | 'team' | 'trio' | 'pentad') => void;
  isSearching: boolean;
  error?: string;
}

export function BattleDashboard({ socket, onStartMatch, isSearching, error }: BattleDashboardProps) {
  const { profile, selectLaptop, selectMap, purchaseLaptop, logout } = usePlayerProfile();
  const [gameMode, setGameMode] = useState<'solo' | 'team' | 'trio' | 'pentad'>('solo');
  const [purchaseError, setPurchaseError] = useState('');
  const [showChat, setShowChat] = useState(false);

  const handleStartMatch = () => {
    onStartMatch(gameMode);
  };

  const handleLogout = () => {
    logout();
  };

  if (!profile) return null;

  const handlePurchaseLaptop = (laptopId: string, cost: number) => {
    const success = purchaseLaptop(laptopId, cost);
    if (success) {
      setPurchaseError('');
      selectLaptop(laptopId);
    } else {
      setPurchaseError(`Not enough currency! Need ${cost} words`);
      setTimeout(() => setPurchaseError(''), 3000);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      {/* Logout Button - Top Right Corner */}
      <Button
        onClick={handleLogout}
        variant="outline"
        className="absolute top-4 right-4 border-red-600 text-red-400 hover:bg-red-900/20 hover:text-red-300 z-50"
        title="Logout and switch accounts"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Logout
      </Button>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">⚔️ Type Battle Arena</h1>
          <div className="flex items-center gap-4 text-slate-300">
            <span className="text-lg font-semibold">{profile.nickname}</span>
            <Badge variant="outline" className="bg-slate-800 text-yellow-400 border-yellow-600">
              💰 {profile.currency} words
            </Badge>
          </div>
        </div>

        {/* Game Mode Selector (BGMI-style) */}
        <div className="mb-6">
          <GameModeCollapse selectedMode={gameMode} onModeChange={setGameMode} />
        </div>

        {/* Main Battle Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Left: Character Preview & Chat */}
          <Card className="bg-slate-900/80 border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>💻</span>
                <span>Your Battle Companion</span>
              </h2>
              <Button
                onClick={() => setShowChat(!showChat)}
                variant={showChat ? "default" : "outline"}
                size="sm"
                className={showChat ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600"}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {showChat ? 'Close Chat' : 'Chat'}
              </Button>
            </div>
            
            {showChat ? (
              <div className="h-[500px]">
                <LaptopCompanionChat 
                  laptopId={profile.selectedLaptop}
                  onClose={() => setShowChat(false)}
                />
              </div>
            ) : (
              <>
                <div className="h-80 rounded-lg overflow-hidden">
                  <LaptopCharacterStage selectedLaptopId={profile.selectedLaptop} />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-white font-semibold text-lg">
                    {LAPTOPS.find(l => l.id === profile.selectedLaptop)?.name}
                  </p>
                  <p className="text-slate-400 text-sm mb-2">
                    {LAPTOPS.find(l => l.id === profile.selectedLaptop)?.description}
                  </p>
                </div>
              </>
            )}
          </Card>

          {/* Right: Map Selection & Battle Controls */}
          <Card className="bg-slate-900/80 border-slate-700 p-6">
            <div className="space-y-6">
              {/* Map Selection */}
              <MapThumbnailCarousel
                selectedMapId={profile.selectedMap}
                onMapSelect={selectMap}
                playerLevel={profile.level}
                ownedMaps={profile.unlockedMaps}
              />

              {/* Start Match Button */}
              <div className="space-y-3">
                {(error || purchaseError) && (
                  <div className="text-red-400 text-sm text-center p-2 bg-red-900/20 rounded">
                    {error || purchaseError}
                  </div>
                )}
                
                <Button
                  onClick={handleStartMatch}
                  disabled={isSearching || !socket}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-6 text-lg"
                >
                  {isSearching ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Finding Match...
                    </>
                  ) : (
                    <>
                      ⚔️ Start {gameMode === 'team' ? '2v2 Team' : '1v1 Solo'} Battle
                    </>
                  )}
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{profile.level}</div>
                  <div className="text-xs text-slate-400">Level</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{profile.stats.matchesWon}</div>
                  <div className="text-xs text-slate-400">Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{profile.stats.totalMatchesPlayed}</div>
                  <div className="text-xs text-slate-400">Matches</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Laptop Collection (Horizontal Scroll) */}
        <Card className="bg-slate-900/80 border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🏪</span>
            <span>Laptop Collection</span>
          </h2>
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4">
              {LAPTOPS.map((laptop) => {
                const isOwned = profile.ownedLaptops.includes(laptop.id);
                const isSelected = profile.selectedLaptop === laptop.id;
                
                return (
                  <div
                    key={laptop.id}
                    onClick={() => {
                      if (isOwned) {
                        selectLaptop(laptop.id);
                      } else {
                        handlePurchaseLaptop(laptop.id, laptop.cost);
                      }
                    }}
                    className={cn(
                      "flex-shrink-0 w-48 p-4 rounded-lg border-2 transition-all cursor-pointer",
                      isSelected 
                        ? "border-blue-400 shadow-lg shadow-blue-500/50" 
                        : "border-slate-600 hover:border-slate-500",
                      !isOwned && "opacity-70"
                    )}
                    style={{ 
                      backgroundColor: `${laptop.color}20`,
                      borderColor: isSelected ? '#60a5fa' : getRarityColor(laptop.rarity)
                    }}
                  >
                    <div className="text-center">
                      <div className="text-5xl mb-2">{laptop.image}</div>
                      <div className="text-white font-bold text-sm mb-1">{laptop.name}</div>
                      <Badge 
                        className="mb-2 text-xs"
                        style={{ backgroundColor: getRarityColor(laptop.rarity) }}
                      >
                        {laptop.rarity}
                      </Badge>
                      <div className="text-slate-300 text-xs mb-3 line-clamp-2 min-h-[2.5rem]">
                        {laptop.description}
                      </div>
                      
                      {!isOwned ? (
                        <Button
                          size="sm"
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          {laptop.cost} words
                        </Button>
                      ) : isSelected ? (
                        <div className="text-green-400 font-semibold text-sm">
                          ✓ Equipped
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
