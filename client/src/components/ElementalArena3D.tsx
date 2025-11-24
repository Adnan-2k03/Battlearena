import { Suspense, useRef, useState, useEffect, useMemo, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Socket } from 'socket.io-client';
import { useGameState, Team, Element } from '@/hooks/useGameState';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Heart, Shield as ShieldIcon, Flame, Droplet, Leaf, Swords, Sun, Moon, Sparkles } from 'lucide-react';
import { AdminControlPanel } from './AdminControlPanel';
import { LeaveMatchButton } from './LeaveMatchButton';
import { getLaptopById } from '@/lib/data/laptops';
import { ELEMENT_COLORS, getMapById } from '@/lib/data/maps';

interface ElementalArena3DProps {
  socket: Socket | null;
  roomId: string;
  myTeam: 'blue' | 'red';
  myRole: 'striker' | 'guardian';
  isAdminMode?: boolean;
  selectedLaptop?: string;
  selectedMap?: string;
}

// Deterministic random function for stable terrain generation
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Skybox Component
const Skybox = memo(function Skybox({ mapId }: { mapId?: string }) {
  const isCosmicRealm = mapId === 'cosmic_realm';
  
  let skyTexture: THREE.Texture | null = null;
  try {
    skyTexture = useTexture('/textures/sky.png');
  } catch (e) {
    console.log('Sky texture not loaded, using gradient');
  }

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[200, 32, 32]} />
      <meshBasicMaterial 
        map={skyTexture || undefined}
        color={!skyTexture ? (isCosmicRealm ? '#0a0a2e' : '#87ceeb') : undefined}
        side={THREE.BackSide}
      />
    </mesh>
  );
});

// Terrain component - Memoized with mapId as dependency
const Terrain = memo(function Terrain({ mapId }: { mapId?: string }) {
  const isCosmicRealm = mapId === 'cosmic_realm';
  
  let grassTexture: THREE.Texture | null = null;
  try {
    grassTexture = useTexture('/textures/grass.png');
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(10, 10);
  } catch (e) {
    console.log('Grass texture not loaded, using default color');
  }

  const ambientParticles = useMemo(() => {
    return [...Array(20)].map((_, i) => {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 15 + seededRandom(i + 100) * 5;
      return {
        key: i,
        position: [Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius] as [number, number, number]
      };
    });
  }, []);

  const terrainColor = isCosmicRealm ? '#1a0b2e' : '#1a4d2e';
  const particleColor = isCosmicRealm ? '#8b5cf6' : '#4ade80';
  const boundaryColor = isCosmicRealm ? '#a855f7' : '#ffffff';

  return (
    <group>
      {/* Main terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial 
          map={isCosmicRealm ? undefined : (grassTexture || undefined)} 
          color={isCosmicRealm ? terrainColor : (grassTexture ? undefined : terrainColor)} 
          roughness={isCosmicRealm ? 0.3 : 0.8}
          metalness={isCosmicRealm ? 0.6 : 0.1}
          emissive={isCosmicRealm ? '#4c1d95' : '#000000'}
          emissiveIntensity={isCosmicRealm ? 0.3 : 0}
        />
      </mesh>
      
      {/* Arena boundary lines */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[18, 19, 64]} />
        <meshBasicMaterial color={boundaryColor} transparent opacity={isCosmicRealm ? 0.6 : 0.3} />
      </mesh>
      
      {/* Center dividing line */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 0.3]} />
        <meshBasicMaterial color={boundaryColor} transparent opacity={isCosmicRealm ? 0.8 : 0.5} />
      </mesh>
      
      {/* Ambient particles - Pre-calculated */}
      {ambientParticles.map(particle => (
        <mesh 
          key={particle.key}
          position={particle.position}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color={particleColor} transparent opacity={isCosmicRealm ? 0.8 : 0.6} />
        </mesh>
      ))}
      
      {/* Cosmic Realm specific elements - Floating stars */}
      {isCosmicRealm && [...Array(30)].map((_, i) => {
        const x = (seededRandom(i * 2) - 0.5) * 90;
        const y = seededRandom(i * 2 + 1) * 3 + 0.2;
        const z = (seededRandom(i * 2 + 2) - 0.5) * 90;
        return (
          <mesh key={`star-${i}`} position={[x, y, z]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="#fbbf24" />
            <pointLight position={[0, 0, 0]} color="#fbbf24" intensity={0.3} distance={2} />
          </mesh>
        );
      })}
    </group>
  );
});

// Keyboard 3D Model
interface Keyboard3DProps {
  position: [number, number, number];
  team: Team;
  playerId?: string;
  nickname?: string;
  role?: string;
  lastKeyPressed?: number | null;
  isMe?: boolean;
  laptopColor?: string;
}

function Keyboard3D({ position, team, playerId, nickname, role, lastKeyPressed, isMe, laptopColor }: Keyboard3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [keyStates, setKeyStates] = useState<Set<number>>(new Set());
  
  const teamColor = team === 'blue' ? '#3b82f6' : '#ef4444';
  const baseColor = laptopColor && isMe ? laptopColor : teamColor;
  const highlightColor = isMe ? (laptopColor || '#fbbf24') : teamColor;

  useEffect(() => {
    if (lastKeyPressed !== null && lastKeyPressed !== undefined) {
      setKeyStates(prev => new Set(prev).add(lastKeyPressed));
      setTimeout(() => {
        setKeyStates(prev => {
          const newSet = new Set(prev);
          newSet.delete(lastKeyPressed);
          return newSet;
        });
      }, 150);
    }
  }, [lastKeyPressed]);

  useFrame(() => {
    if (meshRef.current && isMe) {
      meshRef.current.rotation.y = Math.sin(Date.now() * 0.001) * 0.05;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Keyboard base */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[4, 0.2, 2]} />
        <meshStandardMaterial 
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isMe ? 0.4 : 0.1}
          metalness={laptopColor && isMe ? 0.6 : 0.2}
          roughness={laptopColor && isMe ? 0.3 : 0.5}
        />
      </mesh>
      
      {/* Keys - Row 1 */}
      {[...Array(10)].map((_, i) => {
        const isPressed = keyStates.has(i);
        return (
          <mesh 
            key={`key-r1-${i}`} 
            position={[-1.8 + i * 0.4, isPressed ? 0.15 : 0.25, -0.6]} 
            castShadow
          >
            <boxGeometry args={[0.35, 0.2, 0.35]} />
            <meshStandardMaterial 
              color={isPressed ? '#ffffff' : '#1f2937'}
              emissive={isPressed ? '#ffffff' : '#000000'}
              emissiveIntensity={isPressed ? 0.5 : 0}
            />
          </mesh>
        );
      })}
      
      {/* Keys - Row 2 */}
      {[...Array(9)].map((_, i) => {
        const isPressed = keyStates.has(i + 10);
        return (
          <mesh 
            key={`key-r2-${i}`} 
            position={[-1.6 + i * 0.4, isPressed ? 0.15 : 0.25, 0]} 
            castShadow
          >
            <boxGeometry args={[0.35, 0.2, 0.35]} />
            <meshStandardMaterial 
              color={isPressed ? '#ffffff' : '#1f2937'}
              emissive={isPressed ? '#ffffff' : '#000000'}
              emissiveIntensity={isPressed ? 0.5 : 0}
            />
          </mesh>
        );
      })}
      
      {/* Spacebar */}
      <mesh 
        position={[0, keyStates.has(19) ? 0.15 : 0.25, 0.6]} 
        castShadow
      >
        <boxGeometry args={[3, 0.2, 0.35]} />
        <meshStandardMaterial 
          color={keyStates.has(19) ? '#ffffff' : '#1f2937'}
          emissive={keyStates.has(19) ? '#ffffff' : '#000000'}
          emissiveIntensity={keyStates.has(19) ? 0.5 : 0}
        />
      </mesh>
      
      {/* Player label above keyboard */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[3, 0.5, 0.1]} />
        <meshStandardMaterial color={teamColor} />
      </mesh>
      
      {/* Glow effect for my keyboard */}
      {isMe && (
        <pointLight position={[0, 1, 0]} color={highlightColor} intensity={2} distance={5} />
      )}
    </group>
  );
}

// Barrier Sphere
interface BarrierSphereProps {
  team: Team;
  position: [number, number, number];
  element?: Element;
  strength?: number;
  visible: boolean;
}

function BarrierSphere({ team, position, element, strength, visible }: BarrierSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wingRef1 = useRef<THREE.Mesh>(null);
  const wingRef2 = useRef<THREE.Mesh>(null);
  const shieldRingRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (meshRef.current && visible) {
      meshRef.current.rotation.y = time * 0.5;
      meshRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.05);
    }
    
    // Animate wings
    if (wingRef1.current && visible) {
      wingRef1.current.rotation.y = time * 0.3;
      wingRef1.current.position.y = Math.sin(time * 1.5) * 0.2;
    }
    if (wingRef2.current && visible) {
      wingRef2.current.rotation.y = -time * 0.3;
      wingRef2.current.position.y = Math.sin(time * 1.5 + Math.PI) * 0.2;
    }
    
    // Rotate shield ring
    if (shieldRingRef.current && visible) {
      shieldRingRef.current.rotation.z = time * 0.4;
    }
  });

  if (!visible || !element) return null;

  const getBarrierColor = () => {
    return ELEMENT_COLORS[element] || '#888888';
  };

  const opacity = strength ? strength / 100 : 1;
  const color = getBarrierColor();

  return (
    <group position={position}>
      {/* Main Barrier Sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshStandardMaterial 
          color={color}
          transparent
          opacity={opacity * 0.4}
          emissive={color}
          emissiveIntensity={0.8}
          metalness={0.3}
          roughness={0.1}
        />
      </mesh>
      
      {/* Inner glow sphere */}
      <mesh scale={0.9}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={opacity * 0.2}
        />
      </mesh>
      
      {/* Outer protective ring */}
      <mesh ref={shieldRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.5, 0.15, 16, 32]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={opacity * 0.7}
        />
      </mesh>
      
      {/* Protective Wings/Shields - Left */}
      <mesh ref={wingRef1} position={[-3.5, 0, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.3, 4, 2.5]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={opacity * 0.5}
        />
      </mesh>
      
      {/* Protective Wings/Shields - Right */}
      <mesh ref={wingRef2} position={[3.5, 0, 0]} rotation={[0, -Math.PI / 4, 0]}>
        <boxGeometry args={[0.3, 4, 2.5]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={opacity * 0.5}
        />
      </mesh>
      
      {/* Front Shield Panel */}
      <mesh position={[0, 0, 3.5]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3, 3, 0.2]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.7}
          transparent
          opacity={opacity * 0.4}
        />
      </mesh>
      
      {/* Energy Particles */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 4;
        return (
          <mesh 
            key={i}
            position={[Math.cos(angle) * radius, Math.sin(angle * 0.5) * 2, Math.sin(angle) * radius]}
          >
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial 
              color={color}
              emissive={color}
              emissiveIntensity={1.5}
            />
          </mesh>
        );
      })}
      
      {/* Central glow light */}
      <pointLight color={color} intensity={6} distance={20} />
      
      {/* Pulsing outer glow */}
      <mesh scale={1.3}>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={opacity * 0.15}
        />
      </mesh>
    </group>
  );
}

// Attack Projectile
interface AttackProjectileProps {
  id: string;
  element: Element;
  fromTeam: Team;
  isCritical: boolean;
}

function AttackProjectile({ id, element, fromTeam, isCritical }: AttackProjectileProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  
  const startPos: [number, number, number] = fromTeam === 'blue' 
    ? [0, 2, 10] 
    : [0, 2, -10];
  const endPos: [number, number, number] = fromTeam === 'blue' 
    ? [0, 2, -10] 
    : [0, 2, 10];

  useFrame(() => {
    const elapsed = (Date.now() - startTimeRef.current) / 1200;
    progressRef.current = Math.min(elapsed, 1);
    
    if (meshRef.current && progressRef.current < 1) {
      const t = progressRef.current;
      meshRef.current.position.x = startPos[0] + (endPos[0] - startPos[0]) * t;
      meshRef.current.position.y = startPos[1] + (endPos[1] - startPos[1]) * t + Math.sin(t * Math.PI) * 3;
      meshRef.current.position.z = startPos[2] + (endPos[2] - startPos[2]) * t;
      meshRef.current.rotation.x += 0.15;
      meshRef.current.rotation.y += 0.2;
      
      if (trailRef.current) {
        trailRef.current.position.copy(meshRef.current.position);
        trailRef.current.scale.setScalar(0.7 + Math.sin(t * 8) * 0.15);
      }
    }
  });

  const getColor = () => {
    return ELEMENT_COLORS[element] || '#888888';
  };

  const getShape = () => {
    switch (element) {
      case 'fire': 
        return <octahedronGeometry args={[isCritical ? 1.2 : 0.7, 0]} />;
      case 'water': 
        return <sphereGeometry args={[isCritical ? 1 : 0.6, 16, 16]} />;
      case 'leaf': 
        return <tetrahedronGeometry args={[isCritical ? 1.1 : 0.7, 0]} />;
      case 'light':
        return <icosahedronGeometry args={[isCritical ? 1.1 : 0.7, 0]} />;
      case 'darkness':
        return <dodecahedronGeometry args={[isCritical ? 1 : 0.6, 0]} />;
      case 'space':
        return <torusGeometry args={[isCritical ? 0.8 : 0.5, isCritical ? 0.4 : 0.25, 16, 32]} />;
      default:
        return <sphereGeometry args={[isCritical ? 1 : 0.6, 16, 16]} />;
    }
  };

  const color = getColor();

  return (
    <group>
      {/* Main projectile */}
      <mesh ref={meshRef} position={startPos}>
        {getShape()}
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={isCritical ? 3 : 1.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Single optimized trail */}
      <mesh ref={trailRef} position={startPos}>
        <sphereGeometry args={[isCritical ? 0.7 : 0.5, 12, 12]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={0.4}
        />
      </mesh>
      
      {/* Simplified critical glow */}
      {isCritical && (
        <mesh position={startPos}>
          <sphereGeometry args={[1.2, 16, 16]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.2} 
          />
        </mesh>
      )}
      
      <pointLight 
        position={meshRef.current?.position || startPos} 
        color={color} 
        intensity={isCritical ? 8 : 4} 
        distance={isCritical ? 12 : 7} 
      />
    </group>
  );
}

// Main Scene
function Scene({ gameState, selectedLaptop, mySocketId, selectedMap }: { gameState: ReturnType<typeof useGameState>, selectedLaptop?: string, mySocketId?: string, selectedMap?: string }) {
  const { players, blueTeam, redTeam, attackEvents, myTeam } = gameState;
  const isCosmicRealm = selectedMap === 'cosmic_realm';
  
  // Get player positions
  const playerPositions: Map<string, [number, number, number]> = new Map();
  const playersArray = Array.from(players.values());
  const bluePlayers = playersArray.filter(p => p.team === 'blue');
  const redPlayers = playersArray.filter(p => p.team === 'red');

  // Position blue team keyboards (bottom of screen)
  bluePlayers.forEach((player, idx) => {
    playerPositions.set(player.id, [idx === 0 ? -5 : 5, 0, 10]);
  });

  // Position red team keyboards (top of screen)
  redPlayers.forEach((player, idx) => {
    playerPositions.set(player.id, [idx === 0 ? -5 : 5, 0, -10]);
  });

  return (
    <>
      {/* Lighting - different for each map */}
      <ambientLight intensity={isCosmicRealm ? 0.4 : 0.6} />
      <directionalLight position={[10, 20, 10]} intensity={isCosmicRealm ? 0.8 : 1.2} castShadow />
      <directionalLight position={[-10, 20, -10]} intensity={isCosmicRealm ? 0.5 : 0.7} />
      <pointLight position={[0, 15, 0]} intensity={isCosmicRealm ? 1.2 : 0.8} color={isCosmicRealm ? '#a855f7' : '#ffffff'} />
      <pointLight position={[0, 5, 12]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[0, 5, -12]} intensity={0.5} color="#ef4444" />
      
      {/* Cosmic-specific accent lights */}
      {isCosmicRealm && (
        <>
          <pointLight position={[-15, 10, 0]} intensity={0.6} color="#fbbf24" />
          <pointLight position={[15, 10, 0]} intensity={0.6} color="#6b21a8" />
          <pointLight position={[0, 20, 0]} intensity={0.8} color="#8b5cf6" />
        </>
      )}
      
      {/* Environment */}
      <Environment preset={isCosmicRealm ? "night" : "sunset"} />
      
      {/* Skybox */}
      <Skybox key={`skybox-${selectedMap}`} mapId={selectedMap} />
      
      {/* Terrain */}
      <Terrain key={selectedMap} mapId={selectedMap} />
      
      {/* Player Keyboards */}
      {Array.from(players.values()).map((player, idx) => {
        const pos = playerPositions.get(player.id);
        if (!pos) return null;
        
        // Identify "me" by socket ID
        const isMe = !!(mySocketId && player.id === mySocketId);
        const laptopData = isMe && selectedLaptop ? getLaptopById(selectedLaptop) : undefined;
        const laptopColor = laptopData?.color;
        
        return (
          <Keyboard3D
            key={player.id}
            position={pos}
            team={player.team || 'blue'}
            playerId={player.id}
            nickname={player.nickname}
            role={player.role || undefined}
            lastKeyPressed={player.lastKeyPressed}
            isMe={isMe}
            laptopColor={laptopColor}
          />
        );
      })}
      
      {/* Barriers */}
      <BarrierSphere
        team="blue"
        position={[0, 3, 10]}
        element={blueTeam.barrier?.element}
        strength={blueTeam.barrier?.strength}
        visible={!!blueTeam.barrier}
      />
      <BarrierSphere
        team="red"
        position={[0, 3, -10]}
        element={redTeam.barrier?.element}
        strength={redTeam.barrier?.strength}
        visible={!!redTeam.barrier}
      />
      
      {/* Attack Projectiles */}
      {attackEvents.map(attack => (
        <AttackProjectile
          key={attack.id}
          id={attack.id}
          element={attack.element}
          fromTeam={attack.attackerTeam}
          isCritical={attack.isCritical}
        />
      ))}
      
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 28, 0]} fov={75} />
      <OrbitControls 
        enablePan={false} 
        minDistance={18} 
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />
    </>
  );
}

// Main Component
export function ElementalArena3D({ socket, roomId, myTeam, myRole, isAdminMode = false, selectedLaptop, selectedMap }: ElementalArena3DProps) {
  const gameState = useGameState(socket, roomId, myTeam, myRole, isAdminMode, selectedMap);
  const [inputValue, setInputValue] = useState('');
  const [actionMode, setActionMode] = useState<'attack' | 'barrier'>('attack');
  const inputRef = useRef<HTMLInputElement>(null);

  // Track keypresses for visual feedback
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (key.length === 1 || key === ' ') {
        const keyCode = key.toUpperCase().charCodeAt(0);
        let keyIndex = -1;
        
        if (keyCode >= 65 && keyCode <= 90) {
          keyIndex = keyCode - 65;
          if (keyIndex > 19) keyIndex = keyIndex % 20;
        } else if (key === ' ') {
          keyIndex = 19;
        }
        
        if (keyIndex >= 0) {
          socket.emit('player_typing', { roomId, keyIndex });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [socket, roomId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    gameState.submitWord(inputValue);
    setInputValue('');
    inputRef.current?.focus();
  };

  const getElementIcon = (element: Element, className = "w-4 h-4") => {
    switch (element) {
      case 'fire': return <Flame className={className} />;
      case 'water': return <Droplet className={className} />;
      case 'leaf': return <Leaf className={className} />;
      case 'light': return <Sun className={className} />;
      case 'darkness': return <Moon className={className} />;
      case 'space': return <Sparkles className={className} />;
    }
  };

  // Get map data and elements
  const mapData = getMapById(selectedMap || 'elemental_arena');
  const mapElements = (mapData?.elements || ['fire', 'water', 'leaf']) as Element[];
  
  // Calculate enemy team's element charges (average across all enemy players)
  // Only include elements from the current map
  const enemyCharges: Record<string, number> = {};
  mapElements.forEach(element => {
    enemyCharges[element] = 0;
  });
  
  const enemyPlayers = Array.from(gameState.players.values()).filter(p => p.team === gameState.enemyTeam);
  if (enemyPlayers.length > 0) {
    enemyPlayers.forEach(p => {
      if (p.charges) {
        mapElements.forEach(element => {
          enemyCharges[element] += (p.charges as any)[element] || 0;
        });
      }
    });
    mapElements.forEach(element => {
      enemyCharges[element] = Math.round(enemyCharges[element] / enemyPlayers.length);
    });
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Canvas */}
      <Canvas shadows>
        <Suspense fallback={null}>
          <Scene gameState={gameState} selectedLaptop={selectedLaptop} mySocketId={socket?.id} selectedMap={selectedMap} />
        </Suspense>
      </Canvas>

      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Enemy Team Status - Top Compact */}
        <div className="pointer-events-auto bg-slate-900/90 border-b-2 border-red-900 p-2">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-2">
              <h3 className={`text-sm font-bold ${gameState.enemyTeam === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                Enemy ({gameState.enemyTeam.toUpperCase()})
              </h3>
              <div className="flex items-center gap-2 flex-1">
                <Heart className="w-4 h-4 text-red-400" />
                <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-600 max-w-xs">
                  <div 
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${gameState.enemyTeamState.hp}%` }}
                  />
                </div>
                <span className="text-white text-xs font-bold w-16">{gameState.enemyTeamState.hp}/100</span>
              </div>
              {gameState.enemyTeamState.barrier && (
                <>
                  <ShieldIcon className="w-4 h-4" style={{ 
                    color: ELEMENT_COLORS[gameState.enemyTeamState.barrier.element] || '#888888'
                  }} />
                  <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-600 max-w-xs">
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${gameState.enemyTeamState.barrier.strength}%`,
                        backgroundColor: ELEMENT_COLORS[gameState.enemyTeamState.barrier.element] || '#888888'
                      }}
                    />
                  </div>
                  <span className="text-white text-xs font-bold w-16 capitalize">{gameState.enemyTeamState.barrier.strength}/100</span>
                </>
              )}
            </div>
            
            {/* Enemy Element Charges */}
            <div className="flex items-center gap-3">
              <span className="text-white text-xs font-bold">Energy:</span>
              {mapElements.map((element) => {
                const color = ELEMENT_COLORS[element];
                const charge = enemyCharges[element];
                
                return (
                  <div key={element} className="flex items-center gap-1">
                    <div style={{ color }}>
                      {getElementIcon(element, "w-3 h-3")}
                    </div>
                    <div className="w-20 bg-slate-700 rounded-full h-3 overflow-hidden border border-slate-600">
                      <div 
                        className={`h-full transition-all duration-300 ${charge >= 80 ? 'animate-pulse' : ''}`}
                        style={{ width: `${charge}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="text-white text-xs font-bold w-8">{charge}%</span>
                  </div>
                );
              })}
              {Object.values(enemyCharges).some((v) => v >= 80) && (
                <span className="text-yellow-400 text-xs font-bold animate-pulse">⚠️ Attack Ready!</span>
              )}
            </div>
          </div>
        </div>

        {/* Left Side Panel - Element Controls */}
        <div className="absolute left-2 top-20 w-56 pointer-events-auto bg-slate-900/95 border-2 border-slate-700 rounded-lg p-2">
          <div className="space-y-3">
            {/* Admin Mode Indicator */}
            {isAdminMode && (
              <div className="text-center p-2 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg border-2 border-yellow-400 animate-pulse">
                <h3 className="text-sm font-bold text-white">⚡ ADMIN MODE ⚡</h3>
                <span className="text-xs text-yellow-100">Unlimited Energy</span>
              </div>
            )}

            {/* Your Role */}
            <div className="text-center p-2 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className={`text-sm font-bold ${myTeam === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                {myTeam.toUpperCase()} Team
              </h3>
              <div className="flex items-center justify-center gap-1 mt-1">
                {myRole === 'striker' ? <Swords className="w-4 h-4 text-red-400" /> : <ShieldIcon className="w-4 h-4 text-blue-400" />}
                <span className="text-xs text-white capitalize font-bold">{myRole}</span>
              </div>
            </div>

            {/* Element Energy */}
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
              <h4 className="text-white font-bold mb-2 text-xs flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" />
                Element Energy:
              </h4>
              <div className="space-y-2">
                {mapElements.map((element) => {
                  const color = ELEMENT_COLORS[element];
                  
                  return (
                    <div key={element} className="space-y-1">
                      <div className="flex items-center gap-1">
                        <div style={{ color }}>
                          {getElementIcon(element, "w-4 h-4")}
                        </div>
                        <span className="text-white text-xs font-bold capitalize flex-1">{element}</span>
                        <span className="text-white text-xs font-bold">{gameState.myCharges[element] || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden border border-slate-600">
                        <div 
                          className="h-full transition-all duration-300"
                          style={{ width: `${gameState.myCharges[element] || 0}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mode Selection */}
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
              <h4 className="text-white font-bold mb-2 text-xs">Action Mode:</h4>
              <div className="space-y-2">
                <Button
                  onClick={() => setActionMode('attack')}
                  className={`w-full h-9 text-xs font-bold flex items-center justify-center gap-1 ${
                    actionMode === 'attack' 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  <Swords className="w-4 h-4" />
                  Attack Mode
                </Button>
                <Button
                  onClick={() => setActionMode('barrier')}
                  className={`w-full h-9 text-xs font-bold flex items-center justify-center gap-1 ${
                    actionMode === 'barrier' 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  <ShieldIcon className="w-4 h-4" />
                  Barrier Mode
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
              <h4 className="text-white font-bold mb-2 text-xs">Use Element:</h4>
              <div className="space-y-2">
                {mapElements.map((element) => {
                  const hexColor = ELEMENT_COLORS[element];
                  const isReady = (gameState.myCharges[element] || 0) >= 100;
                  
                  return (
                    <Button
                      key={element}
                      onClick={() => gameState.useElement(element, actionMode)}
                      disabled={!isReady}
                      style={{ 
                        backgroundColor: isReady ? hexColor : undefined,
                        color: isReady ? 'white' : undefined
                      }}
                      className={`w-full h-9 font-bold capitalize text-xs ${
                        isReady ? 'hover:opacity-90' : 'bg-slate-700 text-slate-500'
                      }`}
                    >
                      <div style={{ display: 'inline-block', marginRight: '4px' }}>
                        {getElementIcon(element, "w-4 h-4")}
                      </div>
                      {actionMode === 'attack' ? 'Attack' : 'Protect'}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Center - Text Input & Words */}
        <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="bg-slate-900/95 rounded-lg p-3 border-2 border-slate-700 shadow-xl max-w-xl">
            {/* Input Area */}
            <form onSubmit={handleSubmit} className="mb-2">
              <Input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type words here..."
                className="w-full text-center text-base bg-slate-800 text-white border-2 border-blue-500 h-10 font-bold"
                autoFocus
              />
            </form>
            
            {/* Words display */}
            <div>
              <h3 className="text-white font-bold mb-1 text-xs text-center">Available Words:</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {gameState.words.slice(0, 6).map((word, idx) => {
                  const wordColor = ELEMENT_COLORS[word.element] || '#888888';
                  
                  return (
                    <div 
                      key={idx}
                      style={{ backgroundColor: wordColor }}
                      className={`px-3 py-1 rounded-md text-xs font-bold text-white flex items-center gap-1 ${
                        word.isCharge ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse' : 'shadow-md'
                      }`}
                    >
                      {getElementIcon(word.element)}
                      <span className="uppercase">{word.word}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom - My Team Status Compact */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-auto bg-slate-900/90 border-t-2 border-blue-500 p-2">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <h3 className={`text-sm font-bold ${myTeam === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
              Your Team ({myTeam.toUpperCase()})
            </h3>
            <div className="flex items-center gap-2 flex-1">
              <Heart className="w-4 h-4 text-red-400" />
              <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-600 max-w-xs">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${gameState.myTeamState.hp}%` }}
                />
              </div>
              <span className="text-white text-xs font-bold w-16">{gameState.myTeamState.hp}/100</span>
            </div>
            {gameState.myTeamState.barrier && (
              <>
                <ShieldIcon className="w-4 h-4" style={{ 
                  color: ELEMENT_COLORS[gameState.myTeamState.barrier.element] || '#888888'
                }} />
                <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-600 max-w-xs">
                  <div 
                    className="h-full transition-all duration-300"
                    style={{ 
                      width: `${gameState.myTeamState.barrier.strength}%`,
                      backgroundColor: ELEMENT_COLORS[gameState.myTeamState.barrier.element] || '#888888'
                    }}
                  />
                </div>
                <span className="text-white text-xs font-bold w-20 capitalize">{gameState.myTeamState.barrier.element} {gameState.myTeamState.barrier.strength}/100</span>
              </>
            )}
          </div>
        </div>

        {/* Admin Control Panel */}
        {isAdminMode && (
          <AdminControlPanel 
            socket={socket}
            roomId={roomId}
            myTeam={myTeam}
            selectedMap={selectedMap}
            enemyPlayers={enemyPlayers.map(p => ({
              id: p.id,
              nickname: p.nickname,
              team: p.team!,
              role: p.role!
            }))}
          />
        )}

        {/* Leave Match Button for all players */}
        <LeaveMatchButton 
          socket={socket}
          roomId={roomId}
        />
      </div>
    </div>
  );
}
