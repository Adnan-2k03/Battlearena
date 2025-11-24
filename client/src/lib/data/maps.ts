import { MapArena } from '../stores/usePlayerProfile';

export const MAPS: MapArena[] = [
  {
    id: 'elemental_arena',
    name: 'Elemental Arena',
    description: 'Classic battlefield with Fire, Water, and Leaf elements',
    elements: ['fire', 'water', 'leaf'],
    thumbnail: '🌊🔥🍃',
    unlockLevel: 1
  },
  {
    id: 'cosmic_realm',
    name: 'Cosmic Realm',
    description: 'Mystical dimension with Light, Darkness, and Space elements',
    elements: ['light', 'darkness', 'space'],
    thumbnail: '✨🌑🌌',
    unlockLevel: 5
  }
];

export const getMapById = (id: string): MapArena | undefined => {
  return MAPS.find(map => map.id === id);
};

export const ELEMENT_COLORS: Record<string, string> = {
  fire: '#ef4444',
  water: '#3b82f6',
  leaf: '#22c55e',
  light: '#fbbf24',
  darkness: '#6b21a8',
  space: '#8b5cf6'
};

export const ELEMENT_ICONS: Record<string, string> = {
  fire: '🔥',
  water: '💧',
  leaf: '🍃',
  light: '✨',
  darkness: '🌑',
  space: '🌌'
};
