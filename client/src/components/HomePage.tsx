import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Volume2, VolumeX, Users, Swords, Trophy, Target, ShoppingCart, Map, Laptop, Star, TrendingUp, Lock } from 'lucide-react';
import { useAudio } from '@/lib/stores/useAudio';
import { usePlayerProfile } from '@/lib/stores/usePlayerProfile';
import { LAPTOPS, getRarityColor } from '@/lib/data/laptops';
import { MAPS, ELEMENT_ICONS, ELEMENT_COLORS } from '@/lib/data/maps';
import { cn } from '@/lib/utils';

interface HomePageProps {
  socket: Socket | null;
  onMatchStart: () => void;
  onRoomJoined?: (roomId: string) => void;
}

export function HomePage({ socket, onMatchStart, onRoomJoined }: HomePageProps) {
  const [nickname, setNickname] = useState('');
  const [nicknameSet, setNicknameSet] = useState(false);
  const [gameMode, setGameMode] = useState<'team' | 'solo'>('solo');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  
  const { initializeAudio, toggleMute, isMuted, initialized } = useAudio();
  const { profile, initProfile, selectLaptop, selectMap, purchaseLaptop, addCurrency } = usePlayerProfile();

  useEffect(() => {
    if (!socket) return;

    socket.on('matched', ({ roomId }: { roomId: string }) => {
      setIsSearching(false);
      onRoomJoined?.(roomId);
    });

    socket.on('match_started', () => {
      onMatchStart();
    });

    return () => {
      socket.off('matched');
      socket.off('match_started');
    };
  }, [socket, onMatchStart, onRoomJoined]);

  const handleNicknameSubmit = () => {
    if (!nickname.trim()) {
      setError('Please enter your nickname');
      return;
    }
    setError('');
    initProfile(nickname.trim());
    setNicknameSet(true);
    if (!initialized) {
      initializeAudio();
    }
  };

  const handleStartMatch = () => {
    if (!socket || !profile) return;

    setError('');
    setIsSearching(true);
    socket.emit('join_queue', { 
      nickname: profile.nickname, 
      mode: gameMode,
      selectedMap: profile.selectedMap,
      selectedLaptop: profile.selectedLaptop
    });
  };

  const handlePurchaseLaptop = (laptopId: string, cost: number) => {
    const success = purchaseLaptop(laptopId, cost);
    if (success) {
      setError('');
    } else {
      setError(`Not enough currency! Need ${cost} words`);
      setTimeout(() => setError(''), 3000);
    }
  };

  if (!nicknameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/90 border-slate-700">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">⚔️ Type Battle Arena</h1>
              <p className="text-slate-400">Enter your warrior name</p>
            </div>
            
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNicknameSubmit()}
                className="bg-slate-800 border-slate-600 text-white text-lg"
                autoFocus
              />
              
              {error && (
                <div className="text-red-400 text-sm text-center">{error}</div>
              )}
              
              <Button
                onClick={handleNicknameSubmit}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-6 text-lg"
              >
                Enter Arena
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) return null;

  const selectedLaptopData = LAPTOPS.find(l => l.id === profile.selectedLaptop);
  const selectedMapData = MAPS.find(m => m.id === profile.selectedMap);
  const expProgress = (profile.experience / 1000) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700 flex-1 mr-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-3xl">
                {profile.nickname[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{profile.nickname}</h2>
                  <Badge className="bg-purple-600">Lv. {profile.level}</Badge>
                  <Badge className="bg-blue-600">{profile.rank}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${expProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{profile.experience}/1000 XP</span>
                </div>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-yellow-400 font-bold">💰 {profile.currency} Words</span>
                  <span className="text-green-400">{profile.stats.matchesWon}W</span>
                  <span className="text-red-400">{profile.stats.matchesLost}L</span>
                  <span className="text-blue-400">{profile.stats.totalMatchesPlayed} Played</span>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={toggleMute}
            variant="outline"
            size="icon"
            className="bg-slate-900/80 border-slate-700 hover:bg-slate-800"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-900/80 border border-slate-700 p-1">
            <TabsTrigger value="home" className="data-[state=active]:bg-purple-600">
              <Swords className="w-4 h-4 mr-2" />
              Battle
            </TabsTrigger>
            <TabsTrigger value="laptops" className="data-[state=active]:bg-purple-600">
              <Laptop className="w-4 h-4 mr-2" />
              Laptops
            </TabsTrigger>
            <TabsTrigger value="maps" className="data-[state=active]:bg-purple-600">
              <Map className="w-4 h-4 mr-2" />
              Maps
            </TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:bg-purple-600">
              <Trophy className="w-4 h-4 mr-2" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-purple-600">
              <TrendingUp className="w-4 h-4 mr-2" />
              Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-4">
            <Card className="bg-slate-900/80 border-slate-700">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  Game Mode
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Button
                    onClick={() => setGameMode('team')}
                    className={cn(
                      "h-24 text-lg font-bold transition-all",
                      gameMode === 'team'
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                    )}
                  >
                    <Users className="w-6 h-6 mr-2" />
                    Team 2v2
                    <div className="text-xs block mt-1">4 Players</div>
                  </Button>
                  <Button
                    onClick={() => setGameMode('solo')}
                    className={cn(
                      "h-24 text-lg font-bold transition-all",
                      gameMode === 'solo'
                        ? "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                    )}
                  >
                    <Swords className="w-6 h-6 mr-2" />
                    Solo 1v1
                    <div className="text-xs block mt-1">2 Players</div>
                  </Button>
                </div>

                <div className="bg-slate-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">Selected Laptop:</span>
                    <span className="text-white font-bold">{selectedLaptopData?.image} {selectedLaptopData?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Selected Map:</span>
                    <span className="text-white font-bold">{selectedMapData?.thumbnail} {selectedMapData?.name}</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500 text-red-200 rounded-lg p-3 mb-4">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleStartMatch}
                  disabled={isSearching}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-8 text-2xl"
                >
                  {isSearching ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3" />
                      Searching for opponents...
                    </>
                  ) : (
                    <>
                      <Swords className="w-6 h-6 mr-2" />
                      START MATCH
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="laptops" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">Laptop Collection</h3>
              <div className="text-yellow-400 font-bold">💰 {profile.currency} Words</div>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                {LAPTOPS.map((laptop) => {
                  const owned = profile.ownedLaptops.includes(laptop.id);
                  const selected = profile.selectedLaptop === laptop.id;
                  const rarityColor = getRarityColor(laptop.rarity);

                  return (
                    <Card
                      key={laptop.id}
                      className={cn(
                        "bg-slate-900/80 border-2 transition-all cursor-pointer hover:scale-105",
                        selected ? "border-green-500 shadow-lg shadow-green-500/50" : "border-slate-700"
                      )}
                      style={{ borderColor: selected ? '#22c55e' : rarityColor }}
                    >
                      <CardContent className="p-4">
                        <div className="text-center mb-3">
                          <div className="text-6xl mb-2">{laptop.image}</div>
                          <h4 className="text-lg font-bold text-white">{laptop.name}</h4>
                          <Badge style={{ backgroundColor: rarityColor }} className="mt-1">
                            {laptop.rarity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400 text-center mb-3">{laptop.description}</p>
                        
                        {laptop.bonus && Object.keys(laptop.bonus).length > 0 && (
                          <div className="bg-slate-800 rounded p-2 mb-3 text-xs space-y-1">
                            {laptop.bonus.chargeSpeed && (
                              <div className="flex justify-between text-blue-400">
                                <span>Charge Speed:</span>
                                <span>+{laptop.bonus.chargeSpeed}%</span>
                              </div>
                            )}
                            {laptop.bonus.damageBoost && (
                              <div className="flex justify-between text-red-400">
                                <span>Damage:</span>
                                <span>+{laptop.bonus.damageBoost}%</span>
                              </div>
                            )}
                            {laptop.bonus.shieldBoost && (
                              <div className="flex justify-between text-green-400">
                                <span>Shield:</span>
                                <span>+{laptop.bonus.shieldBoost}%</span>
                              </div>
                            )}
                          </div>
                        )}

                        {owned ? (
                          <Button
                            onClick={() => selectLaptop(laptop.id)}
                            className={cn(
                              "w-full",
                              selected
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-blue-600 hover:bg-blue-700"
                            )}
                          >
                            {selected ? '✓ Equipped' : 'Equip'}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handlePurchaseLaptop(laptop.id, laptop.cost)}
                            disabled={profile.currency < laptop.cost}
                            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Buy {laptop.cost} 💰
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="maps" className="space-y-4">
            <h3 className="text-2xl font-bold text-white mb-4">Arena Selection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MAPS.map((map) => {
                const unlocked = profile.unlockedMaps.includes(map.id);
                const selected = profile.selectedMap === map.id;
                const canUnlock = profile.level >= map.unlockLevel;

                return (
                  <Card
                    key={map.id}
                    className={cn(
                      "bg-slate-900/80 border-2 transition-all",
                      selected ? "border-green-500 shadow-lg shadow-green-500/50" : "border-slate-700",
                      unlocked && !selected && "cursor-pointer hover:scale-105"
                    )}
                    onClick={() => unlocked && selectMap(map.id)}
                  >
                    <CardContent className="p-6">
                      <div className="text-center mb-4">
                        <div className="text-7xl mb-3">{map.thumbnail}</div>
                        <h4 className="text-2xl font-bold text-white">{map.name}</h4>
                        <p className="text-slate-400 mt-2">{map.description}</p>
                      </div>

                      <div className="bg-slate-800 rounded-lg p-4 mb-4">
                        <div className="text-sm text-slate-400 mb-2">Elements:</div>
                        <div className="flex gap-2 justify-center">
                          {map.elements.map((element) => (
                            <div
                              key={element}
                              className="px-3 py-2 rounded-lg font-bold text-white"
                              style={{ backgroundColor: ELEMENT_COLORS[element] }}
                            >
                              {ELEMENT_ICONS[element]} {element.charAt(0).toUpperCase() + element.slice(1)}
                            </div>
                          ))}
                        </div>
                      </div>

                      {!unlocked ? (
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                          <Lock className="w-5 h-5" />
                          <span>Unlock at Level {map.unlockLevel}</span>
                        </div>
                      ) : selected ? (
                        <div className="bg-green-600 text-white text-center py-3 rounded-lg font-bold">
                          ✓ Selected
                        </div>
                      ) : (
                        <Button
                          onClick={() => selectMap(map.id)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          Select Map
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <h3 className="text-2xl font-bold text-white mb-4">Achievements</h3>
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                {profile.achievements.map((achievement) => (
                  <Card
                    key={achievement.id}
                    className={cn(
                      "bg-slate-900/80 border-2",
                      achievement.unlocked ? "border-yellow-500" : "border-slate-700"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-white">{achievement.name}</h4>
                          <p className="text-sm text-slate-400 mb-2">{achievement.description}</p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Progress</span>
                              <span className="text-white font-bold">
                                {achievement.progress}/{achievement.target}
                              </span>
                            </div>
                            <Progress 
                              value={(achievement.progress / achievement.target) * 100} 
                              className="h-2"
                            />
                            <div className="flex justify-between items-center">
                              <span className="text-yellow-400 font-bold">💰 {achievement.reward}</span>
                              {achievement.unlocked && (
                                <Badge className="bg-yellow-500">Unlocked!</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <h3 className="text-2xl font-bold text-white mb-4">Player Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-slate-900/80 border-slate-700">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📝</div>
                    <div className="text-3xl font-bold text-white">{profile.stats.totalWordsTyped}</div>
                    <div className="text-slate-400">Total Words Typed</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/80 border-slate-700">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎮</div>
                    <div className="text-3xl font-bold text-white">{profile.stats.totalMatchesPlayed}</div>
                    <div className="text-slate-400">Matches Played</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/80 border-slate-700">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🏆</div>
                    <div className="text-3xl font-bold text-green-400">{profile.stats.matchesWon}</div>
                    <div className="text-slate-400">Victories</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/80 border-slate-700">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-4xl mb-2">⚡</div>
                    <div className="text-3xl font-bold text-yellow-400">{profile.stats.highestWPM}</div>
                    <div className="text-slate-400">Highest WPM</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/80 border-slate-700">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-4xl mb-2">💥</div>
                    <div className="text-3xl font-bold text-red-400">{Math.round(profile.stats.totalDamageDealt)}</div>
                    <div className="text-slate-400">Total Damage</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/80 border-slate-700">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🔥</div>
                    <div className="text-3xl font-bold text-orange-400">{profile.stats.currentStreak}</div>
                    <div className="text-slate-400">Current Streak</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900/80 border-slate-700">
              <CardContent className="p-6">
                <h4 className="text-xl font-bold text-white mb-4">Win Rate</h4>
                <div className="flex items-center gap-4">
                  <Progress 
                    value={profile.stats.totalMatchesPlayed > 0 
                      ? (profile.stats.matchesWon / profile.stats.totalMatchesPlayed) * 100 
                      : 0
                    } 
                    className="flex-1 h-4"
                  />
                  <span className="text-2xl font-bold text-white">
                    {profile.stats.totalMatchesPlayed > 0
                      ? Math.round((profile.stats.matchesWon / profile.stats.totalMatchesPlayed) * 100)
                      : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
