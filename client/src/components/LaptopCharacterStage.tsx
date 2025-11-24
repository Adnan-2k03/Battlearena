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
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.25, 0.15, 0.12]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
          <mesh position={[0.25, 0.15, 0.06]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.25, 0.15, 0.12]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#000000" />
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

      {/* Mouth */}
      {personality.mouthType === 'smile' && (
        <mesh position={[0, -0.15, 0.06]}>
          <torusGeometry args={[0.2, 0.03, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      )}

      {personality.mouthType === 'grin' && (
        <mesh position={[0, -0.15, 0.06]}>
          <boxGeometry args={[0.4, 0.05, 0.02]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
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

export function LaptopCharacterStage({ 
  selectedLaptopId, 
  onCharacterClick 
}: { 
  selectedLaptopId: string;
  onCharacterClick?: () => void;
}) {
  const [speechBubble, setSpeechBubble] = useState<string>('');
  const personality = getPersonality(selectedLaptopId);

  const handleCharacterClick = () => {
    const randomResponse = personality.clickResponses[
      Math.floor(Math.random() * personality.clickResponses.length)
    ];
    setSpeechBubble(randomResponse);
    setTimeout(() => setSpeechBubble(''), 2500);
    onCharacterClick?.();
  };

  return (
    <div className="relative w-full h-full">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0, 4]} />
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
        />
        <ambientLight intensity={0.5} />
        <spotLight 
          position={[5, 5, 5]} 
          angle={0.3} 
          penumbra={1} 
          intensity={1}
          castShadow
        />
        <pointLight position={[-5, -5, -5]} intensity={0.5} />
        <LaptopCharacter laptopId={selectedLaptopId} onClick={handleCharacterClick} />
      </Canvas>

      {speechBubble && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-slate-900 px-4 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap animate-bounce">
          {speechBubble}
        </div>
      )}
    </div>
  );
}
