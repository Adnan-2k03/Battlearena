import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { getLaptopById } from '@/lib/data/laptops';
import { getPersonality } from '@/lib/data/laptop-personalities';

interface LaptopCharacterProps {
  laptopId: string;
  onClick?: () => void;
}

function LaptopCharacter({ laptopId, onClick }: LaptopCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const timeRef = useRef(0);
  const blinkRef = useRef(0);
  
  const laptop = getLaptopById(laptopId);
  const personality = getPersonality(laptopId);
  const color = laptop?.color || '#6b7280';

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    timeRef.current += delta;
    blinkRef.current += delta;

    if (clicked) {
      groupRef.current.scale.x = THREE.MathUtils.lerp(groupRef.current.scale.x, 1.1, 0.1);
      groupRef.current.scale.y = THREE.MathUtils.lerp(groupRef.current.scale.y, 1.1, 0.1);
      groupRef.current.scale.z = THREE.MathUtils.lerp(groupRef.current.scale.z, 1.1, 0.1);
    } else {
      groupRef.current.scale.x = THREE.MathUtils.lerp(groupRef.current.scale.x, 1, 0.1);
      groupRef.current.scale.y = THREE.MathUtils.lerp(groupRef.current.scale.y, 1, 0.1);
      groupRef.current.scale.z = THREE.MathUtils.lerp(groupRef.current.scale.z, 1, 0.1);
    }

    const bobAmount = Math.sin(timeRef.current * 2) * 0.05;
    groupRef.current.position.y = bobAmount;

    if (hovered) {
      groupRef.current.rotation.y = Math.sin(timeRef.current) * 0.2;
    } else {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.1);
    }
  });

  useEffect(() => {
    if (clicked) {
      const timer = setTimeout(() => setClicked(false), 300);
      return () => clearTimeout(timer);
    }
  }, [clicked]);

  const handleClick = () => {
    setClicked(true);
    onClick?.();
  };

  return (
    <group 
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Body - Laptop Screen */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.2, 0.8, 0.1]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.6} 
          roughness={0.3}
          emissive={color}
          emissiveIntensity={hovered ? 0.3 : 0.1}
        />
      </mesh>

      {/* Keyboard Base */}
      <mesh position={[0, -0.5, 0.3]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[1.2, 0.1, 0.8]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Eyes */}
      {personality.eyeType === 'round' && (
        <>
          <mesh position={[-0.25, 0.15, 0.06]}>
            <sphereGeometry args={[0.15, 32, 32]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.25, 0.15, 0.12]}>
            <sphereGeometry args={[0.08, 32, 32]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[-0.22, 0.18, 0.15]}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0.25, 0.15, 0.06]}>
            <sphereGeometry args={[0.15, 32, 32]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.25, 0.15, 0.12]}>
            <sphereGeometry args={[0.08, 32, 32]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0.28, 0.18, 0.15]}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
          </mesh>
        </>
      )}

      {personality.eyeType === 'sharp' && (
        <>
          <mesh position={[-0.25, 0.15, 0.06]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.15, 0.08, 0.05]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0.25, 0.15, 0.06]} rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.15, 0.08, 0.05]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.5} />
          </mesh>
        </>
      )}

      {personality.eyeType === 'sparkle' && (
        <>
          <mesh position={[-0.25, 0.15, 0.06]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial 
              color="#ffff00" 
              emissive="#ffff00" 
              emissiveIntensity={0.8}
            />
          </mesh>
          <mesh position={[0.25, 0.15, 0.06]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial 
              color="#ffff00" 
              emissive="#ffff00" 
              emissiveIntensity={0.8}
            />
          </mesh>
        </>
      )}

      {/* Mouth - Cartoonish Style */}
      {personality.mouthType === 'smile' && (
        <>
          {/* Pink curved mouth shape */}
          <mesh position={[0, -0.185, 0.08]}>
            <boxGeometry args={[0.26, 0.08, 0.04]} />
            <meshStandardMaterial color="#ff6b9d" emissive="#ff1493" emissiveIntensity={0.3} />
          </mesh>
          {/* Smile curve indentation */}
          <mesh position={[0, -0.155, 0.12]} rotation={[Math.PI / 8, 0, 0]}>
            <boxGeometry args={[0.24, 0.04, 0.03]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          {/* One tooth left */}
          <mesh position={[-0.08, -0.165, 0.11]}>
            <boxGeometry args={[0.04, 0.05, 0.03]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          {/* One tooth right */}
          <mesh position={[0.08, -0.165, 0.11]}>
            <boxGeometry args={[0.04, 0.05, 0.03]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </>
      )}

      {personality.mouthType === 'grin' && (
        <>
          {/* Big happy grin shape */}
          <mesh position={[0, -0.18, 0.08]}>
            <boxGeometry args={[0.32, 0.09, 0.04]} />
            <meshStandardMaterial color="#ff5588" emissive="#ff1493" emissiveIntensity={0.4} />
          </mesh>
          {/* Smile curve */}
          <mesh position={[0, -0.145, 0.12]} rotation={[Math.PI / 6, 0, 0]}>
            <boxGeometry args={[0.3, 0.05, 0.03]} />
            <meshStandardMaterial color="#2a0a2a" />
          </mesh>
          {/* Three teeth */}
          {[-0.1, 0, 0.1].map((x, i) => (
            <mesh key={i} position={[x, -0.16, 0.11]}>
              <boxGeometry args={[0.035, 0.06, 0.03]} />
              <meshStandardMaterial color="#fffcf0" />
            </mesh>
          ))}
        </>
      )}
      
      {personality.mouthType === 'smirk' && (
        <>
          {/* Confident smirk */}
          <mesh position={[0.05, -0.185, 0.08]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[0.2, 0.075, 0.04]} />
            <meshStandardMaterial color="#ff6b9d" emissive="#ff1493" emissiveIntensity={0.3} />
          </mesh>
          {/* Smirk curve */}
          <mesh position={[0.1, -0.155, 0.12]} rotation={[Math.PI / 10, 0, -0.1]}>
            <boxGeometry args={[0.18, 0.04, 0.03]} />
            <meshStandardMaterial color="#2a0a1a" />
          </mesh>
          {/* One visible tooth */}
          <mesh position={[0.1, -0.165, 0.11]}>
            <boxGeometry args={[0.03, 0.045, 0.03]} />
            <meshStandardMaterial color="#fffcf0" />
          </mesh>
        </>
      )}
      
      {personality.mouthType === 'neutral' && (
        <>
          {/* Simple neutral mouth */}
          <mesh position={[0, -0.18, 0.08]}>
            <boxGeometry args={[0.25, 0.06, 0.035]} />
            <meshStandardMaterial color="#ff8ab8" emissive="#ff1493" emissiveIntensity={0.15} />
          </mesh>
        </>
      )}

      {/* Left Hand */}
      <group position={[-0.7, -0.2, 0.3]}>
        <mesh>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial 
            color={personality.handType === 'glowing' ? '#ffaa00' : color}
            emissive={personality.handType === 'glowing' ? '#ffaa00' : '#000000'}
            emissiveIntensity={personality.handType === 'glowing' ? 0.6 : 0}
          />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.3]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      {/* Right Hand */}
      <group position={[0.7, -0.2, 0.3]}>
        <mesh>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial 
            color={personality.handType === 'glowing' ? '#ffaa00' : color}
            emissive={personality.handType === 'glowing' ? '#ffaa00' : '#000000'}
            emissiveIntensity={personality.handType === 'glowing' ? 0.6 : 0}
          />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.3]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      {/* Hover effect - glow ring */}
      {hovered && (
        <mesh position={[0, 0, -0.1]}>
          <ringGeometry args={[1.0, 1.2, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

const getBackgroundGradient = (laptopId: string): string => {
  const gradients: Record<string, string> = {
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gaming_beast: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    cyber_laptop: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    neon_edge: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    crystal_laptop: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    fire_laptop: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)',
    golden_laptop: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)',
    cosmic_laptop: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
  };
  return gradients[laptopId] || gradients.default;
};

export function LaptopCharacterStage({ 
  selectedLaptopId, 
  onCharacterClick 
}: { 
  selectedLaptopId: string;
  onCharacterClick?: () => void;
}) {
  const [speechBubble, setSpeechBubble] = useState<string>('');
  const personality = getPersonality(selectedLaptopId);
  const backgroundGradient = getBackgroundGradient(selectedLaptopId);

  const handleCharacterClick = () => {
    const randomResponse = personality.clickResponses[
      Math.floor(Math.random() * personality.clickResponses.length)
    ];
    setSpeechBubble(randomResponse);
    setTimeout(() => setSpeechBubble(''), 2500);
    onCharacterClick?.();
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden" style={{ background: backgroundGradient }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0, 4]} />
        <OrbitControls 
          enableZoom={true} 
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
          minDistance={2}
          maxDistance={8}
        />
        <ambientLight intensity={0.6} />
        <spotLight 
          position={[5, 5, 5]} 
          angle={0.3} 
          penumbra={1} 
          intensity={1.2}
          castShadow
        />
        <pointLight position={[-5, -5, -5]} intensity={0.7} color="#ffffff" />
        <pointLight position={[3, 3, 3]} intensity={0.5} color="#ffd700" />
        <LaptopCharacter laptopId={selectedLaptopId} onClick={handleCharacterClick} />
      </Canvas>

      {speechBubble && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-slate-900 px-4 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap animate-bounce z-10">
          {speechBubble}
        </div>
      )}
    </div>
  );
}
