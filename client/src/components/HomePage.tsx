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
    if (profile?.nickname) {
      setNicknameSet(true);
      setNickname(profile.nickname);
    }
  }, [profile]);

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
            <Card className="bg-slate-900/90 border-slate-700 border-2 shadow-xl">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-400" />
                  Game Mode
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Button
                    onClick={() => setGameMode('team')}
                    className={cn(
                      "h-20 text-lg font-bold transition-all border-2",
                      gameMode === 'team'
                        ? "bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-blue-400 shadow-lg shadow-blue-500/50 scale-105"
                        : "bg-slate-800/50 hover:bg-slate-700 text-slate-400 border-slate-700"
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Users className="w-6 h-6" />
                      <div>Team 2v2</div>
                      <div className="text-xs font-normal opacity-75">4 Players</div>
                    </div>
                  </Button>
                  <Button
                    onClick={() => setGameMode('solo')}
                    className={cn(
                      "h-20 text-lg font-bold transition-all border-2",
                      gameMode === 'solo'
                        ? "bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 hover:from-orange-700 hover:to-red-700 border-orange-400 shadow-lg shadow-orange-500/50 scale-105"
                        : "bg-slate-800/50 hover:bg-slate-700 text-slate-400 border-slate-700"
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Swords className="w-6 h-6" />
                      <div>Solo 1v1</div>
                      <div className="text-xs font-normal opacity-75">2 Players</div>
                    </div>
                  </Button>
                </div>

                <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 mb-4 border border-slate-600 shadow-inner">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <span className="text-slate-400 text-xs font-medium">Selected Laptop</span>
                      <Button
                        onClick={() => setActiveTab('laptops')}
                        className="flex items-center justify-start gap-2 bg-slate-900/50 hover:bg-slate-800 rounded-lg p-3 border border-slate-600 h-auto"
                      >
                        <span className="text-2xl">{selectedLaptopData?.image}</span>
                        <span className="text-white font-bold text-sm flex-1 text-left">{selectedLaptopData?.name}</span>
                        <Laptop className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-slate-400 text-xs font-medium">Selected Map</span>
                      <Button
                        onClick={() => setActiveTab('maps')}
                        className="flex items-center justify-start gap-2 bg-slate-900/50 hover:bg-slate-800 rounded-lg p-3 border border-slate-600 h-auto"
                      >
                        <span className="text-2xl">{selectedMapData?.thumbnail}</span>
                        <span className="text-white font-bold text-sm flex-1 text-left">{selectedMapData?.name}</span>
                        <Map className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/20 border-2 border-red-500 text-red-200 rounded-xl p-4 mb-6 font-medium">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleStartMatch}
                  disabled={isSearching}
                  className="w-full bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-6 text-xl shadow-lg shadow-green-600/30 border-2 border-green-400 transition-all hover:scale-[1.02]"
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
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Laptop className="w-6 h-6" />
                Laptop Collection
              </h3>
              <div className="text-yellow-400 font-bold text-lg">💰 {profile.currency} Words</div>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                {LAPTOPS.map((laptop) => {
                  const isAdmin = profile.nickname.toLowerCase().startsWith('admin');
                  const owned = isAdmin || profile.ownedLaptops.includes(laptop.id);
                  const selected = profile.selectedLaptop === laptop.id;
                  const rarityColor = getRarityColor(laptop.rarity);

                  return (
                    <Card
                      key={laptop.id}
                      className={cn(
                        "bg-slate-900/80 border-2 transition-all cursor-pointer hover:scale-[1.02]",
                        selected ? "border-green-500 shadow-lg shadow-green-500/50" : "border-slate-700"
                      )}
                      style={{ borderColor: selected ? '#22c55e' : rarityColor }}
                    >
                      <CardContent className="p-5">
                        <div className="text-center mb-4">
                          <div 
                            className="text-7xl mb-3 p-4 rounded-xl mx-auto w-fit"
                            style={{ 
                              backgroundColor: laptop.color ? `${laptop.color}20` : undefined,
                              border: laptop.color ? `2px solid ${laptop.color}` : undefined
                            }}
                          >
                            {laptop.image}
                          </div>
                          <h4 className="text-xl font-bold text-white mb-1">{laptop.name}</h4>
                          <Badge style={{ backgroundColor: rarityColor }} className="text-xs">
                            {laptop.rarity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-300 text-center mb-4 min-h-[2.5rem]">{laptop.description}</p>
                        
                        {owned ? (
                          <Button
                            onClick={() => selectLaptop(laptop.id)}
                            className={cn(
                              "w-full font-bold",
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
                            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700 disabled:text-slate-500 font-bold"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            {laptop.cost === 0 ? 'Free' : `${laptop.cost} 💰`}
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
            <h3 className="text-xl font-bold text-white mb-3">Select Arena</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {MAPS.map((map) => {
                const unlocked = profile.unlockedMaps.includes(map.id);
                const selected = profile.selectedMap === map.id;

                return (
                  <Card
                    key={map.id}
                    className={cn(
                      "bg-slate-900/80 border-2 transition-all cursor-pointer min-w-[180px] flex-shrink-0",
                      selected ? "border-green-500 shadow-lg shadow-green-500/30" : "border-slate-700",
                      unlocked && "hover:border-slate-500"
                    )}
                    onClick={() => unlocked && selectMap(map.id)}
                  >
                    <CardContent className="p-3">
                      <div className="text-center">
                        <div className="text-4xl mb-1">{map.thumbnail}</div>
                        <h4 className="text-sm font-bold text-white mb-1">{map.name}</h4>
                        <div className="flex gap-1 justify-center mb-2">
                          {map.elements.map((element) => (
                            <div
                              key={element}
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: ELEMENT_COLORS[element] }}
                            >
                              {ELEMENT_ICONS[element]}
                            </div>
                          ))}
                        </div>
                        {!unlocked ? (
                          <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Lv {map.unlockLevel}</span>
                          </div>
                        ) : selected ? (
                          <div className="bg-green-600 text-white text-xs py-1 rounded font-bold">
                            ✓ Selected
                          </div>
                        ) : (
                          <div className="text-xs text-blue-400">Tap to select</div>
                        )}
                      </div>
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
