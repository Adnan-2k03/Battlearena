import { useEffect } from 'react';
import { useAudio } from '@/lib/stores/useAudio';

export function SoundManager() {
  const { setHitSound, setSuccessSound, toggleMute } = useAudio();

  useEffect(() => {
    const hitAudio = new Audio('/sounds/hit.mp3');
    const successAudio = new Audio('/sounds/success.mp3');
    
    hitAudio.volume = 0.3;
    successAudio.volume = 0.5;

    setHitSound(hitAudio);
    setSuccessSound(successAudio);

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [setHitSound, setSuccessSound, toggleMute]);

  return null;
}
