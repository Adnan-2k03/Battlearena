import { LaptopPersonality } from './laptops';

export const LAPTOP_PERSONALITIES: Record<string, LaptopPersonality> = {
  default: {
    personality: 'friendly',
    eyeType: 'round',
    mouthType: 'smile',
    handType: 'normal',
    voicePitch: 'medium',
    idleAnimations: ['wave', 'blink', 'look-around'],
    clickResponses: [
      "Hi there! Ready to battle?",
      "Let's type our way to victory!",
      "I'm here to help you win!",
      "Click me anytime!"
    ]
  },
  gaming_beast: {
    personality: 'energetic',
    eyeType: 'sharp',
    mouthType: 'grin',
    handType: 'normal',
    voicePitch: 'high',
    idleAnimations: ['pump-fist', 'jump', 'excited-bounce'],
    clickResponses: [
      "LET'S GOOOO!",
      "Time to dominate!",
      "Ready for some action!",
      "Victory incoming!"
    ]
  },
  cyber_laptop: {
    personality: 'cool',
    eyeType: 'sharp',
    mouthType: 'smirk',
    handType: 'robotic',
    voicePitch: 'low',
    idleAnimations: ['scan', 'matrix-rain', 'digital-glitch'],
    clickResponses: [
      "System online.",
      "Initiating battle protocol.",
      "Processing... Let's win.",
      "Cybernetic advantage activated."
    ]
  },
  neon_edge: {
    personality: 'energetic',
    eyeType: 'sparkle',
    mouthType: 'grin',
    handType: 'glowing',
    voicePitch: 'high',
    idleAnimations: ['glow-pulse', 'sparkle', 'dance'],
    clickResponses: [
      "Shine bright!",
      "Let's light up the arena!",
      "Neon power activate!",
      "Glowing with confidence!"
    ]
  },
  crystal_laptop: {
    personality: 'elegant',
    eyeType: 'sparkle',
    mouthType: 'smile',
    handType: 'thin',
    voicePitch: 'medium',
    idleAnimations: ['shimmer', 'graceful-wave', 'crystal-spin'],
    clickResponses: [
      "Elegance in every keystroke.",
      "Crystal clear victory ahead.",
      "Refined and ready.",
      "Grace under pressure."
    ]
  },
  fire_laptop: {
    personality: 'fierce',
    eyeType: 'sharp',
    mouthType: 'grin',
    handType: 'glowing',
    voicePitch: 'medium',
    idleAnimations: ['flame-flicker', 'heat-wave', 'blazing-spin'],
    clickResponses: [
      "Burn them all!",
      "Feel the heat!",
      "Inferno unleashed!",
      "Fire it up!"
    ]
  },
  golden_laptop: {
    personality: 'royal',
    eyeType: 'sleepy',
    mouthType: 'neutral',
    handType: 'thin',
    voicePitch: 'low',
    idleAnimations: ['royal-wave', 'crown-adjust', 'proud-stance'],
    clickResponses: [
      "Victory is our birthright.",
      "Only the best will do.",
      "Royalty in action.",
      "Excellence expected."
    ]
  },
  cosmic_laptop: {
    personality: 'mysterious',
    eyeType: 'sparkle',
    mouthType: 'neutral',
    handType: 'glowing',
    voicePitch: 'low',
    idleAnimations: ['float', 'star-twinkle', 'cosmic-swirl'],
    clickResponses: [
      "The cosmos guide us...",
      "Infinite possibilities await.",
      "Stars align for victory.",
      "Beyond comprehension."
    ]
  }
};

export const getPersonality = (laptopId: string): LaptopPersonality => {
  return LAPTOP_PERSONALITIES[laptopId] || LAPTOP_PERSONALITIES.default;
};
