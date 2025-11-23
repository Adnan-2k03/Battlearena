import { create } from "zustand";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  isMuted: boolean;
  initialized: boolean;
  
  // Setter functions
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  initializeAudio: () => void;
  
  // Control functions
  toggleMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playCharge: () => void;
  playBarrier: () => void;
  playAttack: () => void;
}

// Preload sounds
let hitSoundPreloaded: HTMLAudioElement | null = null;
let successSoundPreloaded: HTMLAudioElement | null = null;

if (typeof window !== 'undefined') {
  hitSoundPreloaded = new Audio('/sounds/hit.mp3');
  hitSoundPreloaded.preload = 'auto';
  hitSoundPreloaded.volume = 0.3;
  
  successSoundPreloaded = new Audio('/sounds/success.mp3');
  successSoundPreloaded.preload = 'auto';
  successSoundPreloaded.volume = 0.4;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  hitSound: hitSoundPreloaded,
  successSound: successSoundPreloaded,
  isMuted: true, // Start muted by default
  initialized: false,
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  
  initializeAudio: () => {
    const { initialized, hitSound, successSound } = get();
    if (initialized) return;
    
    // Play a short sound to initialize audio context (user gesture required)
    if (successSound) {
      successSound.volume = 0.1;
      successSound.play().then(() => {
        successSound.pause();
        successSound.currentTime = 0;
        console.log('Audio context initialized successfully');
      }).catch((err) => {
        console.log('Audio initialization warning:', err);
      });
    }
    
    set({ initialized: true, isMuted: false });
    console.log('Audio system initialized and unmuted');
  },
  
  toggleMute: () => {
    const { isMuted } = get();
    const newMutedState = !isMuted;
    
    // Update the muted state
    set({ isMuted: newMutedState });
    
    // Log the change
    console.log(`Sound ${newMutedState ? 'muted' : 'unmuted'}`);
  },
  
  playHit: () => {
    const { hitSound, isMuted, initialized } = get();
    if (isMuted || !initialized) return;
    if (hitSound) {
      try {
        // Clone the sound to allow overlapping playback
        const soundClone = hitSound.cloneNode(true) as HTMLAudioElement;
        soundClone.volume = 0.3;
        soundClone.play().catch(() => {});
      } catch (e) {
        // Fallback to direct play
        hitSound.currentTime = 0;
        hitSound.play().catch(() => {});
      }
    }
  },
  
  playSuccess: () => {
    const { successSound, isMuted, initialized } = get();
    if (isMuted || !initialized) return;
    if (successSound) {
      try {
        const clone = successSound.cloneNode(true) as HTMLAudioElement;
        clone.volume = 0.4;
        clone.play().catch(() => {});
      } catch (e) {
        successSound.currentTime = 0;
        successSound.play().catch(() => {});
      }
    }
  },
  
  playCharge: () => {
    const { successSound, isMuted, initialized } = get();
    if (isMuted || !initialized) return;
    if (successSound) {
      try {
        const clone = successSound.cloneNode(true) as HTMLAudioElement;
        clone.volume = 0.2;
        clone.playbackRate = 1.2;
        clone.play().catch(() => {});
      } catch (e) {}
    }
  },
  
  playBarrier: () => {
    const { successSound, isMuted, initialized } = get();
    if (isMuted || !initialized) return;
    if (successSound) {
      try {
        const clone = successSound.cloneNode(true) as HTMLAudioElement;
        clone.volume = 0.4;
        clone.playbackRate = 0.9;
        clone.play().catch(() => {});
      } catch (e) {}
    }
  },
  
  playAttack: () => {
    const { hitSound, isMuted, initialized } = get();
    if (isMuted || !initialized) return;
    if (hitSound) {
      try {
        const clone = hitSound.cloneNode(true) as HTMLAudioElement;
        clone.volume = 0.5;
        clone.play().catch(() => {});
      } catch (e) {}
    }
  }
}));
