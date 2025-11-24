import { LaptopSkin } from '../stores/usePlayerProfile';

export const LAPTOPS: LaptopSkin[] = [
  {
    id: 'default',
    name: 'Standard Laptop',
    description: 'Your trusty starting laptop',
    cost: 0,
    rarity: 'common',
    image: '💻',
    bonus: {}
  },
  {
    id: 'gaming_pro',
    name: 'Gaming Pro',
    description: 'Faster charge regeneration',
    cost: 500,
    rarity: 'rare',
    image: '🎮',
    bonus: {
      chargeSpeed: 10
    }
  },
  {
    id: 'cyber_blade',
    name: 'Cyber Blade',
    description: 'Increased attack damage',
    cost: 800,
    rarity: 'rare',
    image: '⚔️',
    bonus: {
      damageBoost: 15
    }
  },
  {
    id: 'shield_master',
    name: 'Shield Master',
    description: 'Enhanced shield restoration',
    cost: 800,
    rarity: 'rare',
    image: '🛡️',
    bonus: {
      shieldBoost: 15
    }
  },
  {
    id: 'elite_racer',
    name: 'Elite Racer',
    description: 'Balanced performance boost',
    cost: 1200,
    rarity: 'epic',
    image: '🏎️',
    bonus: {
      chargeSpeed: 15,
      damageBoost: 10
    }
  },
  {
    id: 'dragon_fury',
    name: 'Dragon Fury',
    description: 'Massive damage increase',
    cost: 1500,
    rarity: 'epic',
    image: '🐉',
    bonus: {
      damageBoost: 25
    }
  },
  {
    id: 'phoenix_wing',
    name: 'Phoenix Wing',
    description: 'Superior regeneration',
    cost: 1500,
    rarity: 'epic',
    image: '🔥',
    bonus: {
      chargeSpeed: 25,
      shieldBoost: 10
    }
  },
  {
    id: 'ultimate_titan',
    name: 'Ultimate Titan',
    description: 'Maximum power in all aspects',
    cost: 3000,
    rarity: 'legendary',
    image: '👑',
    bonus: {
      chargeSpeed: 30,
      damageBoost: 30,
      shieldBoost: 30
    }
  },
  {
    id: 'cosmic_legend',
    name: 'Cosmic Legend',
    description: 'Legendary cosmic power',
    cost: 2500,
    rarity: 'legendary',
    image: '🌌',
    bonus: {
      chargeSpeed: 25,
      damageBoost: 35,
      shieldBoost: 20
    }
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
