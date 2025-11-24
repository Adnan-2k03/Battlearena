import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Sparkles, KeyboardControls, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from './ui/button';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { getPersonality } from '@/lib/data/laptop-personalities';
import { LAPTOPS } from '@/lib/data/laptops';

type Activity = 'idle' | 'reading' | 'sleeping' | 'hiding' | 'playing' | 'jumping';
type Controls = 'forward' | 'back' | 'left' | 'right';

interface CompanionRoomSceneProps {
  laptopId: string;
  onBack: () => void;
}

function AnimatedLaptop({ 
  laptopId, 
  activity, 
  position,
}: { 
  laptopId: string; 
  activity: Activity;
  position: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  const laptop = LAPTOPS.find(l => l.id === laptopId);
  const color = laptop?.color || '#6b7280';

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    // Update position
    groupRef.current.position.copy(new THREE.Vector3(...position));

    // Activity-specific animations
    if (activity === 'sleeping') {
      groupRef.current.rotation.set(0, 0, Math.PI / 2.2);
      groupRef.current.position.y = position[1] - 0.8;
      if (bodyRef.current) bodyRef.current.position.y = 0.2;
      if (leftArmRef.current) leftArmRef.current.rotation.z = -1.5;
      if (rightArmRef.current) rightArmRef.current.rotation.z = 1.5;
    } else if (activity === 'hiding') {
      groupRef.current.rotation.set(0, -Math.PI / 6, 0);
      groupRef.current.scale.set(0.8, 0.7, 0.8);
      if (bodyRef.current) bodyRef.current.rotation.z = 0.3;
      if (leftArmRef.current) leftArmRef.current.rotation.z = -1.2;
      if (rightArmRef.current) rightArmRef.current.rotation.z = 1.2;
    } else if (activity === 'reading') {
      groupRef.current.rotation.set(-0.4, 0, 0.2);
      groupRef.current.scale.set(1, 1, 1);
      if (bodyRef.current) bodyRef.current.rotation.x = 0.3;
      if (leftArmRef.current) leftArmRef.current.rotation.z = -0.9;
      if (rightArmRef.current) rightArmRef.current.rotation.z = 0.9;
      if (leftLegRef.current) leftLegRef.current.position.y = -0.95;
      if (rightLegRef.current) rightLegRef.current.position.y = -0.95;
    } else if (activity === 'playing') {
      groupRef.current.rotation.set(
        Math.sin(t * 2) * 0.1,
        Math.sin(t * 1.5) * 0.15,
        0
      );
      groupRef.current.scale.set(1, 1, 1);
      const bounce = Math.sin(t * 2.5) * 0.15;
      groupRef.current.position.y = position[1] + bounce;
      if (leftArmRef.current) leftArmRef.current.rotation.z = Math.sin(t * 3) * 1.2 - 0.3;
      if (rightArmRef.current) rightArmRef.current.rotation.z = Math.sin(t * 3 + Math.PI) * 1.2 + 0.3;
      if (leftLegRef.current) leftLegRef.current.position.y = Math.sin(t * 2.5) * 0.1 - 0.85;
      if (rightLegRef.current) rightLegRef.current.position.y = Math.sin(t * 2.5 + Math.PI) * 0.1 - 0.85;
    } else if (activity === 'jumping') {
      groupRef.current.rotation.set(0, 0, Math.sin(t * 3) * 0.1);
      groupRef.current.scale.set(1, 1, 1);
      const jumpH = Math.max(0, Math.sin(t * 2.5) * 1.5);
      groupRef.current.position.y = position[1] + jumpH;
      if (leftArmRef.current) leftArmRef.current.rotation.z = Math.sin(t * 3) * 1.4 - 0.8;
      if (rightArmRef.current) rightArmRef.current.rotation.z = Math.sin(t * 3 + Math.PI) * 1.4 + 0.8;
      if (leftLegRef.current) leftLegRef.current.position.y = -0.5 + jumpH * 0.5;
      if (rightLegRef.current) rightLegRef.current.position.y = -0.5 + jumpH * 0.5;
    } else {
      groupRef.current.rotation.set(0, Math.sin(t * 0.8) * 0.08, 0);
      groupRef.current.scale.set(1, 1, 1);
      if (bodyRef.current) bodyRef.current.position.y = Math.sin(t * 1.2) * 0.05;
      if (leftArmRef.current) leftArmRef.current.rotation.z = Math.sin(t * 1.5) * 0.3;
      if (rightArmRef.current) rightArmRef.current.rotation.z = Math.sin(t * 1.5 + Math.PI) * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={bodyRef} position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.2, 0.8, 0.1]} />
        <meshPhongMaterial 
          color={color} 
          shininess={100}
          emissive={activity === 'playing' ? color : '#000000'}
          emissiveIntensity={activity === 'playing' ? 0.4 : 0}
        />
      </mesh>

      {activity === 'playing' && <pointLight position={[0, 0, 0.5]} intensity={1} color={color} />}

      <mesh position={[0, -0.5, 0.3]} rotation={[0.2, 0, 0]} castShadow>
        <boxGeometry args={[1.2, 0.1, 0.8]} />
        <meshPhongMaterial color={color} shininess={80} />
      </mesh>

      <group ref={leftLegRef} position={[-0.5, -0.85, 0.3]} castShadow>
        <mesh>
          <cylinderGeometry args={[0.07, 0.06, 0.35, 16]} />
          <meshPhongMaterial color={color} shininess={60} />
        </mesh>
      </group>

      <group ref={rightLegRef} position={[0.5, -0.85, 0.3]} castShadow>
        <mesh>
          <cylinderGeometry args={[0.07, 0.06, 0.35, 16]} />
          <meshPhongMaterial color={color} shininess={60} />
        </mesh>
      </group>

      <group ref={leftArmRef} position={[-0.65, 0.1, 0.15]} castShadow>
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[0.12, 0.5, 0.1]} />
          <meshPhongMaterial color={color} shininess={70} />
        </mesh>
        <mesh position={[0, -0.45, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshPhongMaterial 
            color={color} 
            shininess={80}
            emissive={activity === 'playing' ? '#ffaa00' : '#000000'}
            emissiveIntensity={activity === 'playing' ? 0.5 : 0}
          />
        </mesh>
      </group>

      <group ref={rightArmRef} position={[0.65, 0.1, 0.15]} castShadow>
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[0.12, 0.5, 0.1]} />
          <meshPhongMaterial color={color} shininess={70} />
        </mesh>
        <mesh position={[0, -0.45, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshPhongMaterial 
            color={color} 
            shininess={80}
            emissive={activity === 'playing' ? '#ffaa00' : '#000000'}
            emissiveIntensity={activity === 'playing' ? 0.5 : 0}
          />
        </mesh>
      </group>

      <mesh position={[0, 0.2, 0.08]} castShadow>
        <boxGeometry args={[0.6, 0.35, 0.08]} />
        <meshPhongMaterial color="#1f1f1f" shininess={30} />
      </mesh>

      <mesh position={[-0.15, 0.28, 0.12]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshPhongMaterial color="#ffffff" shininess={60} />
      </mesh>
      <mesh position={[0.15, 0.28, 0.12]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshPhongMaterial color="#ffffff" shininess={60} />
      </mesh>

      {activity === 'sleeping' ? (
        <>
          <mesh position={[-0.15, 0.2, 0.14]}>
            <boxGeometry args={[0.04, 0.01, 0.04]} />
            <meshPhongMaterial color="#000000" />
          </mesh>
          <mesh position={[0.15, 0.2, 0.14]}>
            <boxGeometry args={[0.04, 0.01, 0.04]} />
            <meshPhongMaterial color="#000000" />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[-0.15, 0.25, 0.14]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshPhongMaterial color="#000000" />
          </mesh>
          <mesh position={[0.15, 0.25, 0.14]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshPhongMaterial color="#000000" />
          </mesh>
        </>
      )}
    </group>
  );
}

function Room() {
  return (
    <>
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#c8b896" roughness={0.8} metalness={0.1} />
      </mesh>

      <mesh position={[0, 1, -5]} receiveShadow>
        <boxGeometry args={[12, 4, 0.5]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.7} />
      </mesh>

      <mesh position={[-6, 1, 0]} receiveShadow>
        <boxGeometry args={[0.5, 4, 10]} />
        <meshStandardMaterial color="#f0e6d2" roughness={0.7} />
      </mesh>

      <group position={[1.5, 0, -4.2]}>
        {[0.8, 0.4, 0].map((y) => (
          <mesh key={y} position={[0, y, -0.15]} receiveShadow>
            <boxGeometry args={[2.2, 0.1, 0.3]} />
            <meshStandardMaterial color="#8b5a3c" roughness={0.6} />
          </mesh>
        ))}
        {[
          { pos: [-0.6, 0.5, 0], color: '#c41e3a' },
          { pos: [-0.2, 0.5, 0], color: '#0051ba' },
          { pos: [0.2, 0.5, 0], color: '#ffd700' },
          { pos: [0.6, 0.5, 0], color: '#27ae60' },
          { pos: [-0.5, 0.1, 0], color: '#e74c3c' },
          { pos: [0.1, 0.1, 0], color: '#3498db' },
        ].map((book, i) => (
          <mesh key={i} position={book.pos as [number, number, number]} castShadow>
            <boxGeometry args={[0.35, 0.55, 0.2]} />
            <meshPhongMaterial color={book.color} shininess={40} />
          </mesh>
        ))}
      </group>

      <group position={[-2, -0.5, 1.5]}>
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[2.8, 0.8, 1.2]} />
          <meshStandardMaterial color="#6b4423" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.65, -0.65]} receiveShadow castShadow>
          <boxGeometry args={[2.8, 0.9, 0.25]} />
          <meshStandardMaterial color="#6b4423" roughness={0.8} />
        </mesh>
        {[-1.45, 1.45].map((x) => (
          <mesh key={x} position={[x, 0.3, 0]} castShadow>
            <boxGeometry args={[0.3, 0.8, 1.2]} />
            <meshStandardMaterial color="#6b4423" roughness={0.8} />
          </mesh>
        ))}
      </group>

      <group position={[2.2, -0.8, 0.8]}>
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[1.2, 0.1, 0.8]} />
          <meshStandardMaterial color="#8b5a3c" roughness={0.6} />
        </mesh>
        {[[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].map((pos, i) => (
          <mesh key={i} position={[pos[0], pos[1], 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.3, 12]} />
            <meshStandardMaterial color="#8b5a3c" roughness={0.6} />
          </mesh>
        ))}
      </group>

      <group position={[3.5, -0.8, 0.3]}>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 12]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow>
          <coneGeometry args={[0.28, 0.35, 16]} />
          <meshStandardMaterial color="#fffacd" roughness={0.3} />
        </mesh>
        <pointLight position={[0, 0.5, 0]} intensity={1.2} color="#ffff99" castShadow />
      </group>

      <group position={[-4.5, -0.8, -3]}>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.3, 0.4, 12]} />
          <meshStandardMaterial color="#8b7355" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.6, 0]} castShadow>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#27ae60" roughness={0.6} />
        </mesh>
      </group>

      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[5, 8, 5]} 
        intensity={1.2} 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-3, 2, 0]} intensity={0.6} color="#fff" />
    </>
  );
}

function CameraController({ laptopPos }: { laptopPos: [number, number, number] }) {
  const { camera } = useThree();

  useFrame(() => {
    const targetX = laptopPos[0] + 3;
    const targetZ = laptopPos[2] + 5;
    camera.position.lerp(new THREE.Vector3(targetX, 1.8, targetZ), 0.1);
  });

  return null;
}

function RoomSceneContent({ 
  laptopId, 
  activity,
  onPositionChange,
}: { 
  laptopId: string; 
  activity: Activity;
  onPositionChange: (pos: [number, number, number]) => void;
}) {
  const [subscribe, getState] = useKeyboardControls<Controls>();
  const posRef = useRef<[number, number, number]>([0, 0, 0]);

  useFrame((state, delta) => {
    const controls = getState();
    const speed = 0.08;
    
    if (controls.forward) posRef.current[2] -= speed;
    if (controls.back) posRef.current[2] += speed;
    if (controls.left) posRef.current[0] -= speed;
    if (controls.right) posRef.current[0] += speed;

    posRef.current[0] = Math.max(-4, Math.min(4, posRef.current[0]));
    posRef.current[2] = Math.max(-4, Math.min(4, posRef.current[2]));

    onPositionChange([...posRef.current]);
  });

  return (
    <>
      <Room />
      <AnimatedLaptop laptopId={laptopId} activity={activity} position={posRef.current} />
      {activity === 'playing' && <Sparkles count={30} scale={3} size={3} speed={0.5} />}
    </>
  );
}

function RoomScene({ laptopId, activity }: { laptopId: string; activity: Activity }) {
  const [laptopPos, setLaptopPos] = useState<[number, number, number]>([0, 0, 0]);

  const keyMap = [
    { name: 'forward' as Controls, keys: ['ArrowUp', 'KeyW'] },
    { name: 'back' as Controls, keys: ['ArrowDown', 'KeyS'] },
    { name: 'left' as Controls, keys: ['ArrowLeft', 'KeyA'] },
    { name: 'right' as Controls, keys: ['ArrowRight', 'KeyD'] },
  ];

  return (
    <Canvas shadows camera={{ position: [3, 1.8, 5], fov: 50 }}>
      <KeyboardControls map={keyMap}>
        <RoomSceneContent 
          laptopId={laptopId} 
          activity={activity}
          onPositionChange={setLaptopPos}
        />
        <CameraController laptopPos={laptopPos} />
      </KeyboardControls>
      <OrbitControls enableZoom={true} enablePan={false} minDistance={3} maxDistance={12} />
    </Canvas>
  );
}

function VirtualJoystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      setIsDragging(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !joystickRef.current) return;
      e.preventDefault();

      const rect = joystickRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left - rect.width / 2;
      const y = touch.clientY - rect.top - rect.height / 2;
      
      const distance = Math.sqrt(x * x + y * y);
      const maxDistance = rect.width / 2 - 20;
      
      const angle = Math.atan2(y, x);
      const limitedDistance = Math.min(distance, maxDistance);
      
      const knobX = Math.cos(angle) * limitedDistance;
      const knobY = Math.sin(angle) * limitedDistance;

      if (knobRef.current) {
        knobRef.current.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
      }

      onMove(knobX / maxDistance, knobY / maxDistance);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      if (knobRef.current) {
        knobRef.current.style.transform = 'translate(-50%, -50%)';
      }
      onMove(0, 0);
    };

    if (joystickRef.current) {
      joystickRef.current.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, onMove]);

  return (
    <div
      ref={joystickRef}
      className="fixed bottom-20 left-4 w-24 h-24 bg-slate-800/70 border-2 border-slate-600 rounded-full flex items-center justify-center"
    >
      <div
        ref={knobRef}
        className="absolute w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full transition-transform"
        style={{ transform: 'translate(-50%, -50%)' }}
      />
    </div>
  );
}

const ACTIVITIES: { name: Activity; label: string; description: string }[] = [
  { name: 'idle', label: '😊', description: 'Relax' },
  { name: 'reading', label: '📚', description: 'Read' },
  { name: 'sleeping', label: '💤', description: 'Charge' },
  { name: 'hiding', label: '👀', description: 'Hide' },
  { name: 'playing', label: '🎮', description: 'Game' },
  { name: 'jumping', label: '🎉', description: 'Jump' },
];

export function CompanionRoomScene({ laptopId, onBack }: CompanionRoomSceneProps) {
  const [activity, setActivity] = useState<Activity>('idle');
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem('companion_voice_enabled') === 'true';
  });

  const laptop = LAPTOPS.find(l => l.id === laptopId);
  const personality = getPersonality(laptopId);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    switch(personality.personality) {
      case 'friendly': utterance.pitch = 1.1; utterance.rate = 1.0; break;
      case 'energetic': utterance.pitch = 1.3; utterance.rate = 1.2; break;
      case 'cool': utterance.pitch = 0.9; utterance.rate = 0.95; break;
      case 'elegant': utterance.pitch = 1.15; utterance.rate = 0.9; break;
      case 'fierce': utterance.pitch = 0.85; utterance.rate = 1.1; break;
      case 'mysterious': utterance.pitch = 0.95; utterance.rate = 0.85; break;
      case 'royal': utterance.pitch = 1.0; utterance.rate = 0.9; break;
      case 'cosmic': utterance.pitch = 0.95; utterance.rate = 0.95; break;
      default: utterance.pitch = 1.0; utterance.rate = 1.0;
    }
    window.speechSynthesis.speak(utterance);
  };

  const handleActivityClick = (newActivity: Activity) => {
    setActivity(newActivity);
    const messages: Record<Activity, string> = {
      idle: 'Time to relax!',
      reading: 'Let me read some books',
      sleeping: 'Charging my battery now...',
      hiding: 'Peek-a-boo!',
      playing: 'Game time!',
      jumping: 'Wheeeee!',
    };
    speakText(messages[newActivity]);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col relative">
      <div className="flex-1 w-full relative">
        <RoomScene laptopId={laptopId} activity={activity} />
      </div>

      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-slate-900/90 to-transparent p-4 flex items-center justify-between z-20">
        <Button
          onClick={onBack}
          variant="outline"
          className="border-slate-600 hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          💻 {laptop?.name}'s Room
        </h1>
        
        <Button
          onClick={() => {
            const newState = !voiceEnabled;
            setVoiceEnabled(newState);
            localStorage.setItem('companion_voice_enabled', String(newState));
          }}
          variant="ghost"
          className={voiceEnabled ? "text-green-400" : "text-slate-400"}
        >
          {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/95 to-transparent p-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-300 text-sm mb-3">What should {laptop?.name} do?</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {ACTIVITIES.map((act) => (
              <button
                key={act.name}
                onClick={() => handleActivityClick(act.name)}
                className={`p-3 rounded-lg font-semibold text-center transition-all transform hover:scale-105 text-sm ${
                  activity === act.name
                    ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white scale-105 shadow-lg shadow-purple-500/50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <div className="text-2xl">{act.label}</div>
                <div className="text-xs uppercase">{act.description}</div>
              </button>
            ))}
          </div>
          <p className="text-slate-400 text-xs mt-2">Use WASD/Arrow Keys to move or tap joystick on mobile</p>
        </div>
      </div>

      {isMobile && (
        <VirtualJoystick 
          onMove={() => {}}
        />
      )}
    </div>
  );
}
