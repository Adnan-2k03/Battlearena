import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Socket } from 'socket.io-client';
import { useGameState, Team, Element } from '@/hooks/useGameState';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Heart, Shield as ShieldIcon, Flame, Droplet, Leaf, Swords } from 'lucide-react';

interface ElementalArena3DProps {
  socket: Socket | null;
  roomId: string;
  myTeam: 'blue' | 'red';
  myRole: 'striker' | 'guardian';
}

// Terrain component
function Terrain() {
  let grassTexture: THREE.Texture | null = null;
  try {
    grassTexture = useTexture('/textures/grass.png');
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(10, 10);
  } catch (e) {
    console.log('Grass texture not loaded, using default color');
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial map={grassTexture || undefined} color={grassTexture ? undefined : '#2d5016'} />
    </mesh>
  );
}

// Keyboard 3D Model
interface Keyboard3DProps {
  position: [number, number, number];
  team: Team;
  playerId?: string;
  nickname?: string;
  role?: string;
  lastKeyPressed?: number | null;
  isMe?: boolean;
}

function Keyboard3D({ position, team, playerId, nickname, role, lastKeyPressed, isMe }: Keyboard3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [keyStates, setKeyStates] = useState<Set<number>>(new Set());
  
  const teamColor = team === 'blue' ? '#3b82f6' : '#ef4444';
  const highlightColor = isMe ? '#fbbf24' : teamColor;

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
          color={highlightColor}
          emissive={highlightColor}
          emissiveIntensity={isMe ? 0.3 : 0.1}
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
  
  useFrame(({ clock }) => {
    if (meshRef.current && visible) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.5;
      meshRef.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 2) * 0.05);
    }
  });

  if (!visible || !element) return null;

  const getBarrierColor = () => {
    switch (element) {
      case 'fire':
        return '#ef4444';
      case 'water':
        return '#3b82f6';
      case 'leaf':
        return '#22c55e';
      default:
        return '#888888';
    }
  };

  const opacity = strength ? strength / 100 : 1;

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshStandardMaterial 
          color={getBarrierColor()}
          transparent
          opacity={opacity * 0.3}
          emissive={getBarrierColor()}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Inner glow */}
      <mesh scale={0.9}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshBasicMaterial 
          color={getBarrierColor()}
          transparent
          opacity={opacity * 0.2}
        />
      </mesh>
      
      {/* Particles effect based on element */}
      {element === 'fire' && (
        <pointLight color="#ef4444" intensity={3} distance={10} />
      )}
      {element === 'water' && (
        <pointLight color="#3b82f6" intensity={3} distance={10} />
      )}
      {element === 'leaf' && (
        <pointLight color="#22c55e" intensity={3} distance={10} />
      )}
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
  const progressRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  
  const startPos: [number, number, number] = fromTeam === 'blue' 
    ? [0, 2, -10] 
    : [0, 2, 10];
  const endPos: [number, number, number] = fromTeam === 'blue' 
    ? [0, 2, 10] 
    : [0, 2, -10];

  useFrame(() => {
    const elapsed = (Date.now() - startTimeRef.current) / 1500; // 1.5 second animation
    progressRef.current = Math.min(elapsed, 1);
    
    if (meshRef.current && progressRef.current < 1) {
      const t = progressRef.current;
      meshRef.current.position.x = startPos[0] + (endPos[0] - startPos[0]) * t;
      meshRef.current.position.y = startPos[1] + (endPos[1] - startPos[1]) * t + Math.sin(t * Math.PI) * 2;
      meshRef.current.position.z = startPos[2] + (endPos[2] - startPos[2]) * t;
      meshRef.current.rotation.x += 0.1;
      meshRef.current.rotation.y += 0.15;
    }
  });

  const getColor = () => {
    switch (element) {
      case 'fire': return '#ef4444';
      case 'water': return '#3b82f6';
      case 'leaf': return '#22c55e';
    }
  };

  return (
    <group>
      <mesh ref={meshRef} position={startPos}>
        <sphereGeometry args={[isCritical ? 1 : 0.6, 16, 16]} />
        <meshStandardMaterial 
          color={getColor()}
          emissive={getColor()}
          emissiveIntensity={isCritical ? 2 : 1}
        />
      </mesh>
      <pointLight 
        position={meshRef.current?.position || startPos} 
        color={getColor()} 
        intensity={isCritical ? 4 : 2} 
        distance={isCritical ? 8 : 5} 
      />
    </group>
  );
}

// Main Scene
function Scene({ gameState }: { gameState: ReturnType<typeof useGameState> }) {
  const { players, blueTeam, redTeam, attackEvents, myTeam } = gameState;
  
  // Get player positions
  const playerPositions: Map<string, [number, number, number]> = new Map();
  const playersArray = Array.from(players.values());
  const bluePlayers = playersArray.filter(p => p.team === 'blue');
  const redPlayers = playersArray.filter(p => p.team === 'red');

  // Position blue team keyboards
  bluePlayers.forEach((player, idx) => {
    playerPositions.set(player.id, [idx === 0 ? -5 : 5, 0, -10]);
  });

  // Position red team keyboards
  redPlayers.forEach((player, idx) => {
    playerPositions.set(player.id, [idx === 0 ? -5 : 5, 0, 10]);
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <directionalLight position={[-10, 20, -10]} intensity={0.5} />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#ffffff" />
      
      {/* Environment */}
      <Environment preset="sunset" />
      
      {/* Terrain */}
      <Terrain />
      
      {/* Player Keyboards */}
      {Array.from(players.values()).map((player, idx) => {
        const pos = playerPositions.get(player.id);
        if (!pos) return null;
        
        // First human player in the map is "me"
        const isFirstHuman = idx === 0 && !player.id.startsWith('bot-');
        
        return (
          <Keyboard3D
            key={player.id}
            position={pos}
            team={player.team || 'blue'}
            playerId={player.id}
            nickname={player.nickname}
            role={player.role || undefined}
            lastKeyPressed={player.lastKeyPressed}
            isMe={isFirstHuman}
          />
        );
      })}
      
      {/* Barriers */}
      <BarrierSphere
        team="blue"
        position={[0, 3, -10]}
        element={blueTeam.barrier?.element}
        strength={blueTeam.barrier?.strength}
        visible={!!blueTeam.barrier}
      />
      <BarrierSphere
        team="red"
        position={[0, 3, 10]}
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
      <PerspectiveCamera makeDefault position={[0, 15, 0]} fov={60} />
      <OrbitControls 
        enablePan={false} 
        minDistance={10} 
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />
    </>
  );
}

// Main Component
export function ElementalArena3D({ socket, roomId, myTeam, myRole }: ElementalArena3DProps) {
  const gameState = useGameState(socket, roomId, myTeam, myRole);
  const [inputValue, setInputValue] = useState('');
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

  const getElementIcon = (element: Element) => {
    switch (element) {
      case 'fire': return <Flame className="w-4 h-4" />;
      case 'water': return <Droplet className="w-4 h-4" />;
      case 'leaf': return <Leaf className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Canvas */}
      <Canvas shadows>
        <Suspense fallback={null}>
          <Scene gameState={gameState} />
        </Suspense>
      </Canvas>

      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Enemy Team Status - Top */}
        <div className="pointer-events-auto bg-slate-900/80 border-b-2 border-slate-700 p-3">
          <div className="max-w-4xl mx-auto">
            <h3 className={`text-base font-bold mb-1 ${gameState.enemyTeam === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
              Enemy Team ({gameState.enemyTeam.toUpperCase()})
            </h3>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" />
              <span className="text-white text-sm">HP: {gameState.enemyTeamState.hp}/100</span>
              <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${gameState.enemyTeamState.hp}%` }}
                />
              </div>
            </div>
            {gameState.enemyTeamState.barrier && (
              <div className="mt-2 flex items-center gap-2 text-sm text-white">
                <ShieldIcon className="w-4 h-4" />
                <span className="capitalize">{gameState.enemyTeamState.barrier.element} Barrier: {gameState.enemyTeamState.barrier.strength}/100</span>
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Center */}
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type words..."
              className="w-64 bg-slate-900/90 text-white border-slate-700"
              autoFocus
            />
          </form>
          
          {/* Words display */}
          <div className="mt-2 flex flex-wrap gap-2 justify-center">
            {gameState.words.slice(0, 6).map((word, idx) => (
              <div 
                key={idx}
                className={`px-3 py-1 rounded text-sm font-bold ${
                  word.isCharge ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white'
                }`}
              >
                {getElementIcon(word.element)}
                <span className="ml-1">{word.word}</span>
              </div>
            ))}
          </div>
        </div>

        {/* My Team Status - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-auto bg-slate-900/80 border-t-2 border-slate-700 p-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-base font-bold ${myTeam === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                Your Team ({myTeam.toUpperCase()})
              </h3>
              <div className="flex items-center gap-2">
                {myRole === 'striker' ? <Swords className="w-4 h-4 text-red-400" /> : <ShieldIcon className="w-4 h-4 text-blue-400" />}
                <span className="text-sm text-white capitalize">{myRole}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-red-400" />
              <span className="text-white text-sm">HP: {gameState.myTeamState.hp}/100</span>
              <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${gameState.myTeamState.hp}%` }}
                />
              </div>
            </div>
            
            {/* Element Charges */}
            <div className="grid grid-cols-3 gap-2">
              {(['fire', 'water', 'leaf'] as Element[]).map((element) => (
                <div key={element} className="flex items-center gap-1">
                  {getElementIcon(element)}
                  <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        element === 'fire' ? 'bg-orange-500' :
                        element === 'water' ? 'bg-blue-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${gameState.myCharges[element]}%` }}
                    />
                  </div>
                  <span className="text-xs text-white">{gameState.myCharges[element]}%</span>
                  {gameState.myCharges[element] >= 100 && (
                    <Button
                      size="sm"
                      onClick={() => gameState.useElement(element, 'attack')}
                      className="ml-1 h-6 px-2 text-xs"
                    >
                      Attack
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
