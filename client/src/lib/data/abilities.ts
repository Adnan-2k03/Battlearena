export interface Ability {
  id: string;
  name: string;
  description: string;
  cost: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  bonus: {
    chargeSpeed?: number;
    damageBoost?: number;
    shieldBoost?: number;
  };
}

export const ABILITIES: Ability[] = [
  {
    id: 'speed_boost',
    name: 'Speed Boost',
    description: 'Faster charge regeneration',
    cost: 500,
    rarity: 'rare',
    icon: '⚡',
    bonus: {
      chargeSpeed: 10
    }
  },
  {
    id: 'power_surge',
    name: 'Power Surge',
    description: 'Increased attack damage',
    cost: 800,
    rarity: 'rare',
    icon: '⚔️',
    bonus: {
      damageBoost: 15
    }
  },
  {
    id: 'shield_enhancement',
    name: 'Shield Enhancement',
    description: 'Enhanced shield restoration',
    cost: 800,
    rarity: 'rare',
    icon: '🛡️',
    bonus: {
      shieldBoost: 15
    }
  },
  {
    id: 'balanced_power',
    name: 'Balanced Power',
    description: 'Balanced performance boost',
    cost: 1200,
    rarity: 'epic',
    icon: '⚖️',
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
    icon: '🐉',
    bonus: {
      damageBoost: 25
    }
  },
  {
    id: 'phoenix_regeneration',
    name: 'Phoenix Regeneration',
    description: 'Superior regeneration',
    cost: 1500,
    rarity: 'epic',
    icon: '🔥',
    bonus: {
      chargeSpeed: 25,
      shieldBoost: 10
    }
  },
  {
    id: 'ultimate_power',
    name: 'Ultimate Power',
    description: 'Maximum power in all aspects',
    cost: 3000,
    rarity: 'legendary',
    icon: '👑',
    bonus: {
      chargeSpeed: 30,
      damageBoost: 30,
      shieldBoost: 30
    }
  },
  {
    id: 'cosmic_energy',
    name: 'Cosmic Energy',
    description: 'Legendary cosmic power',
    cost: 2500,
    rarity: 'legendary',
    icon: '🌌',
    bonus: {
      chargeSpeed: 25,
      damageBoost: 35,
      shieldBoost: 20
    }
  }
];

export const getAbilityById = (id: string): Ability | undefined => {
  return ABILITIES.find(ability => ability.id === id);
};

export const getRarityColor = (rarity: Ability['rarity']): string => {
  switch (rarity) {
    case 'common': return '#9ca3af';
    case 'rare': return '#3b82f6';
    case 'epic': return '#a855f7';
    case 'legendary': return '#eab308';
    default: return '#6b7280';
  }
};
