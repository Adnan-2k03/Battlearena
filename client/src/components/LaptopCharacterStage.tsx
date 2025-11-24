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
      {/* Laptop base/chassis - metallic body */}
      <mesh position={[0, -0.05, 0]} castShadow>
        <boxGeometry args={[1.4, 0.08, 1.0]} />
        <meshStandardMaterial 
          color="#1a1a1a"
          metalness={0.7}
          roughness={0.2}
          emissive="#0a0a0a"
        />
      </mesh>

      {/* Screen bezel - dark frame */}
      <mesh position={[0, 0.15, -0.08]}>
        <boxGeometry args={[1.5, 0.95, 0.05]} />
        <meshStandardMaterial 
          color="#0d0d0d"
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Screen display - glowing surface */}
      <mesh position={[0, 0.15, 0.02]} castShadow>
        <boxGeometry args={[1.35, 0.85, 0.04]} />
        <meshStandardMaterial 
          color={color}
          metalness={0.3}
          roughness={0.1}
          emissive={color}
          emissiveIntensity={hovered ? 0.4 : 0.15}
        />
      </mesh>

      {/* Screen shine/reflection */}
      <mesh position={[0, 0.2, 0.08]}>
        <boxGeometry args={[1.25, 0.75, 0.01]} />
        <meshBasicMaterial 
          color="#ffffff"
          transparent
          opacity={hovered ? 0.2 : 0.08}
        />
      </mesh>

      {/* Keyboard deck - main keyboard area */}
      <mesh position={[0, -0.15, 0.35]} castShadow>
        <boxGeometry args={[1.35, 0.05, 0.7]} />
        <meshStandardMaterial 
          color="#1a1a1a"
          metalness={0.4}
          roughness={0.35}
        />
      </mesh>

      {/* Keys - simplified grid pattern */}
      {[...Array(4)].map((_, row) => 
        [...Array(5)].map((_, col) => (
          <mesh key={`key-${row}-${col}`} position={[-0.4 + col * 0.22, -0.17, 0.15 + row * 0.15]} castShadow>
            <boxGeometry args={[0.18, 0.04, 0.12]} />
            <meshStandardMaterial 
              color="#2a2a2a"
              metalness={0.2}
              roughness={0.6}
            />
          </mesh>
        ))
      )}

      {/* Trackpad area */}
      <mesh position={[0, -0.16, 0.55]}>
        <boxGeometry args={[0.5, 0.03, 0.25]} />
        <meshStandardMaterial 
          color="#242424"
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Hinge line connecting screen and keyboard */}
      <mesh position={[0, 0.05, 0.15]}>
        <boxGeometry args={[1.4, 0.04, 0.08]} />
        <meshStandardMaterial 
          color="#0f0f0f"
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>

      {/* Left edge accent */}
      <mesh position={[-0.72, 0, 0]}>
        <boxGeometry args={[0.04, 0.35, 0.8]} />
        <meshStandardMaterial 
          color={personality.handType === 'glowing' ? color : '#1a1a1a'}
          emissive={personality.handType === 'glowing' ? color : '#000000'}
          emissiveIntensity={personality.handType === 'glowing' ? 0.4 : 0}
          metalness={0.5}
        />
      </mesh>

      {/* Right edge accent */}
      <mesh position={[0.72, 0, 0]}>
        <boxGeometry args={[0.04, 0.35, 0.8]} />
        <meshStandardMaterial 
          color={personality.handType === 'glowing' ? color : '#1a1a1a'}
          emissive={personality.handType === 'glowing' ? color : '#000000'}
          emissiveIntensity={personality.handType === 'glowing' ? 0.4 : 0}
          metalness={0.5}
        />
      </mesh>

      {/* Status LED indicator */}
      <mesh position={[0.6, -0.14, -0.05]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial 
          color={hovered ? '#22c55e' : '#666'}
          emissive={hovered ? '#22c55e' : '#000'}
          emissiveIntensity={hovered ? 0.6 : 0}
        />
      </mesh>

      {/* Hover effect - glow around laptop */}
      {hovered && (
        <>
          <mesh position={[0, 0, -0.15]}>
            <boxGeometry args={[1.55, 1.0, 0.05]} />
            <meshBasicMaterial color={color} transparent opacity={0.15} />
          </mesh>
          <pointLight position={[0, 0.15, 0]} color={color} intensity={1.5} distance={2} />
        </>
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
