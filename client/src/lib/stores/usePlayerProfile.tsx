import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LaptopSkin {
  id: string;
  name: string;
  description: string;
  cost: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  image: string;
  bonus?: {
    chargeSpeed?: number;
    damageBoost?: number;
    shieldBoost?: number;
  };
}

export interface MapArena {
  id: string;
  name: string;
  description: string;
  elements: string[];
  thumbnail: string;
  unlockLevel: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  unlocked: boolean;
  reward: number;
}

export interface PlayerStats {
  totalWordsTyped: number;
  totalMatchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  totalDamageDealt: number;
  totalShieldRestored: number;
  highestWPM: number;
  averageWPM: number;
  totalPlayTime: number;
  currentStreak: number;
  bestStreak: number;
}

export interface PlayerProfile {
  playerId: string;
  nickname: string;
  level: number;
  experience: number;
  currency: number;
  stats: PlayerStats;
  selectedLaptop: string;
  selectedMap: string;
  ownedLaptops: string[];
  unlockedMaps: string[];
  achievements: Achievement[];
  rank: string;
  rankPoints: number;
  createdAt: number;
  lastPlayed: number;
}

interface PlayerProfileStore {
  profile: PlayerProfile | null;
  
  initProfile: (nickname: string) => void;
  updateStats: (stats: Partial<PlayerStats>) => void;
  addCurrency: (amount: number) => void;
  purchaseLaptop: (laptopId: string, cost: number) => boolean;
  selectLaptop: (laptopId: string) => void;
  selectMap: (mapId: string) => void;
  unlockMap: (mapId: string) => void;
  updateAchievement: (achievementId: string, progress: number) => void;
  addExperience: (exp: number) => void;
  resetProfile: () => void;
}

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    name: 'First Victory',
    description: 'Win your first match',
    icon: '🏆',
    progress: 0,
    target: 1,
    unlocked: false,
    reward: 100
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Type at 100+ WPM',
    icon: '⚡',
    progress: 0,
    target: 1,
    unlocked: false,
    reward: 150
  },
  {
    id: 'word_master',
    name: 'Word Master',
    description: 'Type 1000 words',
    icon: '📝',
    progress: 0,
    target: 1000,
    unlocked: false,
    reward: 200
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Play 50 matches',
    icon: '🎮',
    progress: 0,
    target: 50,
    unlocked: false,
    reward: 300
  },
  {
    id: 'damage_dealer',
    name: 'Damage Dealer',
    description: 'Deal 10000 total damage',
    icon: '💥',
    progress: 0,
    target: 10000,
    unlocked: false,
    reward: 250
  },
  {
    id: 'win_streak',
    name: 'Unstoppable',
    description: 'Win 5 matches in a row',
    icon: '🔥',
    progress: 0,
    target: 5,
    unlocked: false,
    reward: 500
  }
];

const createDefaultProfile = (nickname: string): PlayerProfile => ({
  playerId: `player_${Date.now()}`,
  nickname,
  level: 1,
  experience: 0,
  currency: 500,
  stats: {
    totalWordsTyped: 0,
    totalMatchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    totalDamageDealt: 0,
    totalShieldRestored: 0,
    highestWPM: 0,
    averageWPM: 0,
    totalPlayTime: 0,
    currentStreak: 0,
    bestStreak: 0
  },
  selectedLaptop: 'default',
  selectedMap: 'elemental_arena',
  ownedLaptops: ['default'],
  unlockedMaps: ['elemental_arena'],
  achievements: DEFAULT_ACHIEVEMENTS,
  rank: 'Bronze',
  rankPoints: 0,
  createdAt: Date.now(),
  lastPlayed: Date.now()
});

export const usePlayerProfile = create<PlayerProfileStore>()(
  persist(
    (set, get) => ({
      profile: null,

      initProfile: (nickname: string) => {
        const existing = get().profile;
        if (!existing || existing.nickname !== nickname) {
          set({ profile: createDefaultProfile(nickname) });
        }
      },

      updateStats: (stats: Partial<PlayerStats>) => {
        set((state) => {
          if (!state.profile) return state;
          
          const newStats = { ...state.profile.stats, ...stats };
          
          let wordsEarned = 0;
          if (stats.totalWordsTyped !== undefined) {
            wordsEarned = stats.totalWordsTyped - state.profile.stats.totalWordsTyped;
          }
          
          return {
            profile: {
              ...state.profile,
              stats: newStats,
              currency: state.profile.currency + wordsEarned,
              lastPlayed: Date.now()
            }
          };
        });
      },

      addCurrency: (amount: number) => {
        set((state) => {
          if (!state.profile) return state;
          return {
            profile: {
              ...state.profile,
              currency: state.profile.currency + amount
            }
          };
        });
      },

      purchaseLaptop: (laptopId: string, cost: number) => {
        const profile = get().profile;
        if (!profile) return false;
        
        if (profile.currency >= cost && !profile.ownedLaptops.includes(laptopId)) {
          set((state) => {
            if (!state.profile) return state;
            return {
              profile: {
                ...state.profile,
                currency: state.profile.currency - cost,
                ownedLaptops: [...state.profile.ownedLaptops, laptopId]
              }
            };
          });
          return true;
        }
        return false;
      },

      selectLaptop: (laptopId: string) => {
        set((state) => {
          if (!state.profile || !state.profile.ownedLaptops.includes(laptopId)) return state;
          return {
            profile: {
              ...state.profile,
              selectedLaptop: laptopId
            }
          };
        });
      },

      selectMap: (mapId: string) => {
        set((state) => {
          if (!state.profile || !state.profile.unlockedMaps.includes(mapId)) return state;
          return {
            profile: {
              ...state.profile,
              selectedMap: mapId
            }
          };
        });
      },

      unlockMap: (mapId: string) => {
        set((state) => {
          if (!state.profile || state.profile.unlockedMaps.includes(mapId)) return state;
          return {
            profile: {
              ...state.profile,
              unlockedMaps: [...state.profile.unlockedMaps, mapId]
            }
          };
        });
      },

      updateAchievement: (achievementId: string, progress: number) => {
        set((state) => {
          if (!state.profile) return state;
          
          const achievements = state.profile.achievements.map(ach => {
            if (ach.id === achievementId) {
              const newProgress = Math.min(progress, ach.target);
              const wasUnlocked = ach.unlocked;
              const nowUnlocked = newProgress >= ach.target;
              
              if (!wasUnlocked && nowUnlocked) {
                setTimeout(() => {
                  get().addCurrency(ach.reward);
                }, 0);
              }
              
              return {
                ...ach,
                progress: newProgress,
                unlocked: nowUnlocked
              };
            }
            return ach;
          });
          
          return {
            profile: {
              ...state.profile,
              achievements
            }
          };
        });
      },

      addExperience: (exp: number) => {
        set((state) => {
          if (!state.profile) return state;
          
          let newExp = state.profile.experience + exp;
          let newLevel = state.profile.level;
          
          const expPerLevel = 1000;
          while (newExp >= expPerLevel) {
            newExp -= expPerLevel;
            newLevel++;
          }
          
          return {
            profile: {
              ...state.profile,
              experience: newExp,
              level: newLevel
            }
          };
        });
      },

      resetProfile: () => {
        set({ profile: null });
      }
    }),
    {
      name: 'player-profile-storage'
    }
  )
);
