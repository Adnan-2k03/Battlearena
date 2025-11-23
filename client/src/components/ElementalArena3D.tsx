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
  const color = getBarrierColor();

  return (
    <group position={position}>
      {/* Main Barrier Sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshStandardMaterial 
          color={color}
          transparent
          opacity={opacity * 0.3}
          emissive={color}
          emissiveIntensity={0.5}
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
      <pointLight color={color} intensity={4} distance={15} />
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
export function ElementalArena3D({ socket, roomId, myTeam, myRole }: ElementalArena3DProps) {
  const gameState = useGameState(socket, roomId, myTeam, myRole);
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

  const getElementIcon = (element: Element) => {
    switch (element) {
      case 'fire': return <Flame className="w-4 h-4" />;
      case 'water': return <Droplet className="w-4 h-4" />;
      case 'leaf': return <Leaf className="w-4 h-4" />;
    }
  };

  // Calculate enemy team's element charges (average across all enemy players)
  const enemyCharges = { fire: 0, water: 0, leaf: 0 };
  const enemyPlayers = Array.from(gameState.players.values()).filter(p => p.team === gameState.enemyTeam);
  if (enemyPlayers.length > 0) {
    enemyPlayers.forEach(p => {
      if (p.charges) {
        enemyCharges.fire += p.charges.fire || 0;
        enemyCharges.water += p.charges.water || 0;
        enemyCharges.leaf += p.charges.leaf || 0;
      }
    });
    enemyCharges.fire = Math.round(enemyCharges.fire / enemyPlayers.length);
    enemyCharges.water = Math.round(enemyCharges.water / enemyPlayers.length);
    enemyCharges.leaf = Math.round(enemyCharges.leaf / enemyPlayers.length);
  }

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
                    color: gameState.enemyTeamState.barrier.element === 'fire' ? '#ef4444' : 
                           gameState.enemyTeamState.barrier.element === 'water' ? '#3b82f6' : '#22c55e' 
                  }} />
                  <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-600 max-w-xs">
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${gameState.enemyTeamState.barrier.strength}%`,
                        backgroundColor: gameState.enemyTeamState.barrier.element === 'fire' ? '#ef4444' : 
                                       gameState.enemyTeamState.barrier.element === 'water' ? '#3b82f6' : '#22c55e'
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
              {(['fire', 'water', 'leaf'] as Element[]).map((element) => {
                const Icon = element === 'fire' ? Flame : element === 'water' ? Droplet : Leaf;
                const color = element === 'fire' ? '#ef4444' : element === 'water' ? '#3b82f6' : '#22c55e';
                const charge = enemyCharges[element];
                
                return (
                  <div key={element} className="flex items-center gap-1">
                    <Icon className="w-3 h-3" style={{ color }} />
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
        <div className="absolute left-2 top-20 w-56 pointer-events-auto bg-slate-900/95 border-2 border-slate-700 rounded-lg p-2 overflow-y-auto max-h-96">
          <div className="space-y-3">
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
                {(['fire', 'water', 'leaf'] as Element[]).map((element) => {
                  const Icon = element === 'fire' ? Flame : element === 'water' ? Droplet : Leaf;
                  const color = element === 'fire' ? '#ef4444' : element === 'water' ? '#3b82f6' : '#22c55e';
                  
                  return (
                    <div key={element} className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Icon className="w-4 h-4" style={{ color }} />
                        <span className="text-white text-xs font-bold capitalize flex-1">{element}</span>
                        <span className="text-white text-xs font-bold">{gameState.myCharges[element]}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden border border-slate-600">
                        <div 
                          className="h-full transition-all duration-300"
                          style={{ width: `${gameState.myCharges[element]}%`, backgroundColor: color }}
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
                {(['fire', 'water', 'leaf'] as Element[]).map((element) => {
                  const Icon = element === 'fire' ? Flame : element === 'water' ? Droplet : Leaf;
                  const color = element === 'fire' ? 'bg-red-600' : element === 'water' ? 'bg-blue-600' : 'bg-green-600';
                  const isReady = gameState.myCharges[element] >= 100;
                  
                  return (
                    <Button
                      key={element}
                      onClick={() => gameState.useElement(element, actionMode)}
                      disabled={!isReady}
                      className={`w-full h-9 font-bold capitalize text-xs ${
                        isReady ? `${color} hover:opacity-90 text-white` : 'bg-slate-700 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-1" />
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
                  const getElementBgColor = () => {
                    switch (word.element) {
                      case 'fire': return 'bg-red-600';
                      case 'water': return 'bg-blue-600';
                      case 'leaf': return 'bg-green-600';
                    }
                  };
                  
                  return (
                    <div 
                      key={idx}
                      className={`px-3 py-1 rounded-md text-xs font-bold text-white flex items-center gap-1 ${getElementBgColor()} ${
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
                  color: gameState.myTeamState.barrier.element === 'fire' ? '#ef4444' : 
                         gameState.myTeamState.barrier.element === 'water' ? '#3b82f6' : '#22c55e' 
                }} />
                <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-600 max-w-xs">
                  <div 
                    className="h-full transition-all duration-300"
                    style={{ 
                      width: `${gameState.myTeamState.barrier.strength}%`,
                      backgroundColor: gameState.myTeamState.barrier.element === 'fire' ? '#ef4444' : 
                                     gameState.myTeamState.barrier.element === 'water' ? '#3b82f6' : '#22c55e'
                    }}
                  />
                </div>
                <span className="text-white text-xs font-bold w-20 capitalize">{gameState.myTeamState.barrier.element} {gameState.myTeamState.barrier.strength}/100</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
