import { LaptopSkin } from '../stores/usePlayerProfile';

export const LAPTOPS: LaptopSkin[] = [
  {
    id: 'default',
    name: 'Standard Laptop',
    description: 'Your trusty starting laptop',
    cost: 0,
    rarity: 'common',
    image: '💻',
    color: '#6b7280',
    bonus: {}
  },
  {
    id: 'gaming_beast',
    name: 'Gaming Beast',
    description: 'RGB illuminated gaming laptop',
    cost: 500,
    rarity: 'rare',
    image: '🖥️',
    color: '#ef4444',
    bonus: {}
  },
  {
    id: 'cyber_laptop',
    name: 'Cyber Laptop',
    description: 'Futuristic cyberpunk design',
    cost: 800,
    rarity: 'rare',
    image: '⚡',
    color: '#06b6d4',
    bonus: {}
  },
  {
    id: 'neon_edge',
    name: 'Neon Edge',
    description: 'Glowing neon accents',
    cost: 1000,
    rarity: 'epic',
    image: '🌟',
    color: '#a855f7',
    bonus: {}
  },
  {
    id: 'crystal_laptop',
    name: 'Crystal Laptop',
    description: 'Transparent crystal design',
    cost: 1200,
    rarity: 'epic',
    image: '💎',
    color: '#3b82f6',
    bonus: {}
  },
  {
    id: 'fire_laptop',
    name: 'Inferno Laptop',
    description: 'Blazing fire themed design',
    cost: 1500,
    rarity: 'epic',
    image: '🔥',
    color: '#f97316',
    bonus: {}
  },
  {
    id: 'golden_laptop',
    name: 'Golden Elite',
    description: 'Luxurious gold finish',
    cost: 2500,
    rarity: 'legendary',
    image: '👑',
    color: '#eab308',
    bonus: {}
  },
  {
    id: 'cosmic_laptop',
    name: 'Cosmic Laptop',
    description: 'Galaxy themed masterpiece',
    cost: 3000,
    rarity: 'legendary',
    image: '🌌',
    color: '#8b5cf6',
    bonus: {}
  }
];

export const getLaptopById = (id: string): LaptopSkin | undefined => {
  return LAPTOPS.find(laptop => laptop.id === id);
};

export const getRarityColor = (rarity: LaptopSkin['rarity']): string => {
  switch (rarity) {
    case 'common': return '#9ca3af';
    case 'rare': return '#3b82f6';
    case 'epic': return '#a855f7';
    case 'legendary': return '#eab308';
    default: return '#6b7280';
  }
};
