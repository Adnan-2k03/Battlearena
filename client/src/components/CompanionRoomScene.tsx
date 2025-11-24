import { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Sparkles, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from './ui/button';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { getPersonality } from '@/lib/data/laptop-personalities';
import { LAPTOPS } from '@/lib/data/laptops';

type Activity = 'idle' | 'reading' | 'sleeping' | 'hiding' | 'playing' | 'jumping';

interface CompanionRoomSceneProps {
  laptopId: string;
  onBack: () => void;
}

function AnimatedLaptop({ laptopId, activity }: { laptopId: string; activity: Activity }) {
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

    // Main body positioning
    const t = timeRef.current;
    
    if (activity === 'sleeping') {
      groupRef.current.position.set(0, -0.6, 0);
      groupRef.current.rotation.z = Math.PI / 3.5;
      if (bodyRef.current) bodyRef.current.rotation.z = 0.1;
    } else if (activity === 'hiding') {
      groupRef.current.position.set(-2.2, 0.3, 0);
      groupRef.current.rotation.z = -0.5;
    } else if (activity === 'reading') {
      groupRef.current.position.set(1.2, 0, 0);
      groupRef.current.rotation.z = -0.4;
      if (bodyRef.current) bodyRef.current.rotation.z = 0.2;
    } else if (activity === 'playing') {
      groupRef.current.position.set(0, 0.1 + Math.sin(t * 2) * 0.08, 0);
      groupRef.current.rotation.z = Math.sin(t * 1.5) * 0.15;
    } else if (activity === 'jumping') {
      const jumpHeight = Math.max(0, Math.sin(t * 2.5) * 1.2);
      groupRef.current.position.y = jumpHeight;
      groupRef.current.rotation.z = Math.sin(t * 3) * 0.1;
    } else {
      groupRef.current.position.set(0, 0, 0);
      groupRef.current.rotation.z = 0;
    }

    // Arm animations
    if (leftArmRef.current) {
      if (activity === 'reading') {
        leftArmRef.current.rotation.z = -0.8;
      } else if (activity === 'playing') {
        leftArmRef.current.rotation.z = Math.sin(t * 2.5) * 0.6 - 0.3;
      } else if (activity === 'jumping') {
        leftArmRef.current.rotation.z = Math.sin(t * 3) * 0.8 - 0.5;
      } else if (activity === 'sleeping') {
        leftArmRef.current.rotation.z = -0.3;
      } else {
        leftArmRef.current.rotation.z = 0;
      }
    }

    if (rightArmRef.current) {
      if (activity === 'reading') {
        rightArmRef.current.rotation.z = 0.8;
      } else if (activity === 'playing') {
        rightArmRef.current.rotation.z = Math.sin(t * 2.5 + Math.PI) * 0.6 + 0.3;
      } else if (activity === 'jumping') {
        rightArmRef.current.rotation.z = Math.sin(t * 3 + Math.PI) * 0.8 + 0.5;
      } else if (activity === 'sleeping') {
        rightArmRef.current.rotation.z = 0.3;
      } else {
        rightArmRef.current.rotation.z = 0;
      }
    }

    // Leg animations
    if (leftLegRef.current) {
      if (activity === 'playing') {
        leftLegRef.current.position.y = Math.sin(t * 2.5) * 0.1 - 0.85;
      } else if (activity === 'jumping') {
        leftLegRef.current.position.y = Math.sin(t * 3) * 0.15 - 0.85;
      } else if (activity === 'sleeping') {
        leftLegRef.current.position.y = -0.7;
      } else {
        leftLegRef.current.position.y = -0.85;
      }
    }

    if (rightLegRef.current) {
      if (activity === 'playing') {
        rightLegRef.current.position.y = Math.sin(t * 2.5 + Math.PI) * 0.1 - 0.85;
      } else if (activity === 'jumping') {
        rightLegRef.current.position.y = Math.sin(t * 3 + Math.PI) * 0.15 - 0.85;
      } else if (activity === 'sleeping') {
        rightLegRef.current.position.y = -0.7;
      } else {
        rightLegRef.current.position.y = -0.85;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Screen/Body */}
      <mesh ref={bodyRef} position={[0, 0, 0]}>
        <boxGeometry args={[1.2, 0.8, 0.1]} />
        <meshPhongMaterial 
          color={color} 
          shininess={100}
          emissive={activity === 'playing' ? color : '#000000'}
          emissiveIntensity={activity === 'playing' ? 0.3 : 0}
        />
      </mesh>

      {/* Screen glow when active */}
      {activity === 'playing' && (
        <pointLight position={[0, 0, 0.5]} intensity={0.8} color={color} />
      )}

      {/* Keyboard */}
      <mesh position={[0, -0.5, 0.3]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[1.2, 0.1, 0.8]} />
        <meshPhongMaterial color={color} shininess={80} />
      </mesh>

      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.5, -0.85, 0.3]}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.06, 0.35, 16]} />
          <meshPhongMaterial color={color} shininess={60} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.5, -0.85, 0.3]}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.06, 0.35, 16]} />
          <meshPhongMaterial color={color} shininess={60} />
        </mesh>
      </group>

      {/* Left Arm */}
      <group ref={leftArmRef} position={[-0.65, 0.1, 0.15]}>
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[0.12, 0.5, 0.1]} />
          <meshPhongMaterial color={color} shininess={70} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.45, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshPhongMaterial 
            color={color} 
            shininess={80}
            emissive={activity === 'playing' ? '#ffaa00' : '#000000'}
            emissiveIntensity={activity === 'playing' ? 0.4 : 0}
          />
        </mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArmRef} position={[0.65, 0.1, 0.15]}>
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[0.12, 0.5, 0.1]} />
          <meshPhongMaterial color={color} shininess={70} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.45, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshPhongMaterial 
            color={color} 
            shininess={80}
            emissive={activity === 'playing' ? '#ffaa00' : '#000000'}
            emissiveIntensity={activity === 'playing' ? 0.4 : 0}
          />
        </mesh>
      </group>

      {/* Face area */}
      <mesh position={[0, 0.2, 0.08]}>
        <boxGeometry args={[0.6, 0.35, 0.08]} />
        <meshPhongMaterial color="#1f1f1f" shininess={30} />
      </mesh>

      {/* Eyes - white part */}
      <mesh position={[-0.15, 0.28, 0.12]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshPhongMaterial color="#ffffff" shininess={60} />
      </mesh>
      <mesh position={[0.15, 0.28, 0.12]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshPhongMaterial color="#ffffff" shininess={60} />
      </mesh>

      {/* Eyes - pupils with expression */}
      {activity === 'sleeping' && (
        <>
          <mesh position={[-0.15, 0.2, 0.14]}>
            <boxGeometry args={[0.03, 0.02, 0.04]} />
            <meshPhongMaterial color="#000000" />
          </mesh>
          <mesh position={[0.15, 0.2, 0.14]}>
            <boxGeometry args={[0.03, 0.02, 0.04]} />
            <meshPhongMaterial color="#000000" />
          </mesh>
        </>
      )}
      {activity !== 'sleeping' && (
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
      {/* Floor */}
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial 
          color="#c8b896" 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Back Wall - with gradient */}
      <mesh position={[0, 1, -5]} receiveShadow>
        <boxGeometry args={[12, 4, 0.5]} />
        <meshStandardMaterial 
          color="#e8dcc8" 
          roughness={0.7}
        />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-6, 1, 0]} receiveShadow>
        <boxGeometry args={[0.5, 4, 10]} />
        <meshStandardMaterial 
          color="#f0e6d2"
          roughness={0.7}
        />
      </mesh>

      {/* Library Shelf */}
      <group position={[1.5, 0, -4.2]}>
        {/* Shelf back */}
        <mesh position={[0, 0.8, -0.15]} receiveShadow>
          <boxGeometry args={[2.2, 0.1, 0.3]} />
          <meshStandardMaterial color="#8b5a3c" roughness={0.6} />
        </mesh>
        {/* Shelf middle */}
        <mesh position={[0, 0.4, -0.15]} receiveShadow>
          <boxGeometry args={[2.2, 0.1, 0.3]} />
          <meshStandardMaterial color="#8b5a3c" roughness={0.6} />
        </mesh>
        {/* Shelf bottom */}
        <mesh position={[0, 0, -0.15]} receiveShadow>
          <boxGeometry args={[2.2, 0.1, 0.3]} />
          <meshStandardMaterial color="#8b5a3c" roughness={0.6} />
        </mesh>

        {/* Books */}
        {[
          { pos: [-0.6, 0.5, 0], color: '#c41e3a' },
          { pos: [-0.2, 0.5, 0], color: '#0051ba' },
          { pos: [0.2, 0.5, 0], color: '#ffd700' },
          { pos: [0.6, 0.5, 0], color: '#27ae60' },
          { pos: [-0.5, 0.1, 0], color: '#e74c3c' },
          { pos: [0.1, 0.1, 0], color: '#3498db' },
          { pos: [0.5, 0.1, 0], color: '#f39c12' },
        ].map((book, i) => (
          <mesh key={i} position={book.pos as [number, number, number]} castShadow>
            <boxGeometry args={[0.35, 0.55, 0.2]} />
            <meshPhongMaterial color={book.color} shininess={40} />
          </mesh>
        ))}
      </group>

      {/* Sofa */}
      <group position={[-2, -0.5, 1.5]}>
        {/* Sofa seat */}
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[2.8, 0.8, 1.2]} />
          <meshStandardMaterial 
            color="#6b4423" 
            roughness={0.8}
          />
        </mesh>
        {/* Sofa back */}
        <mesh position={[0, 0.65, -0.65]} receiveShadow castShadow>
          <boxGeometry args={[2.8, 0.9, 0.25]} />
          <meshStandardMaterial color="#6b4423" roughness={0.8} />
        </mesh>
        {/* Sofa arm left */}
        <mesh position={[-1.45, 0.3, 0]} castShadow>
          <boxGeometry args={[0.3, 0.8, 1.2]} />
          <meshStandardMaterial color="#6b4423" roughness={0.8} />
        </mesh>
        {/* Sofa arm right */}
        <mesh position={[1.45, 0.3, 0]} castShadow>
          <boxGeometry args={[0.3, 0.8, 1.2]} />
          <meshStandardMaterial color="#6b4423" roughness={0.8} />
        </mesh>
      </group>

      {/* Coffee Table */}
      <group position={[2.2, -0.8, 0.8]}>
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[1.2, 0.1, 0.8]} />
          <meshStandardMaterial color="#8b5a3c" roughness={0.6} />
        </mesh>
        {/* Table legs */}
        {[
          [-0.5, -0.2, -0.3],
          [0.5, -0.2, -0.3],
          [-0.5, -0.2, 0.3],
          [0.5, -0.2, 0.3],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.3, 12]} />
            <meshStandardMaterial color="#8b5a3c" roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Desk Lamp */}
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

      {/* Decorative Plant */}
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

      {/* Lighting */}
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

function RoomScene({ laptopId, activity }: { laptopId: string; activity: Activity }) {
  return (
    <Canvas shadows camera={{ position: [3, 1.8, 5], fov: 50 }}>
      <PerspectiveCamera makeDefault />
      <OrbitControls 
        enableZoom={true}
        enablePan={true}
        minDistance={3}
        maxDistance={12}
        autoRotate={false}
      />
      <Room />
      <AnimatedLaptop laptopId={laptopId} activity={activity} />
      {activity === 'playing' && <Sparkles count={30} scale={3} size={3} speed={0.5} />}
    </Canvas>
  );
}

const ACTIVITIES: { name: Activity; label: string; description: string; icon: string }[] = [
  { name: 'idle', label: '😊', description: 'Relax', icon: '🧘' },
  { name: 'reading', label: '📚', description: 'Read', icon: '📖' },
  { name: 'sleeping', label: '💤', description: 'Charge', icon: '⚡' },
  { name: 'hiding', label: '👀', description: 'Hide', icon: '🙈' },
  { name: 'playing', label: '🎮', description: 'Game', icon: '🕹️' },
  { name: 'jumping', label: '🎉', description: 'Jump', icon: '🦘' },
];

export function CompanionRoomScene({ laptopId, onBack }: CompanionRoomSceneProps) {
  const [activity, setActivity] = useState<Activity>('idle');
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem('companion_voice_enabled') === 'true';
  });

  const laptop = LAPTOPS.find(l => l.id === laptopId);
  const personality = getPersonality(laptopId);

  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    switch(personality.personality) {
      case 'friendly':
        utterance.pitch = 1.1;
        utterance.rate = 1.0;
        break;
      case 'energetic':
        utterance.pitch = 1.3;
        utterance.rate = 1.2;
        break;
      case 'cool':
        utterance.pitch = 0.9;
        utterance.rate = 0.95;
        break;
      case 'elegant':
        utterance.pitch = 1.15;
        utterance.rate = 0.9;
        break;
      case 'fierce':
        utterance.pitch = 0.85;
        utterance.rate = 1.1;
        break;
      case 'mysterious':
        utterance.pitch = 0.95;
        utterance.rate = 0.85;
        break;
      case 'royal':
        utterance.pitch = 1.0;
        utterance.rate = 0.9;
        break;
      case 'cosmic':
        utterance.pitch = 0.95;
        utterance.rate = 0.95;
        break;
      default:
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
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

  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    localStorage.setItem('companion_voice_enabled', String(newState));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/90 border-b border-slate-700 p-4 flex items-center justify-between z-10">
        <Button
          onClick={onBack}
          variant="outline"
          className="border-slate-600 hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
        
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          💻 {laptop?.name}'s Room
        </h1>
        
        <Button
          onClick={toggleVoice}
          variant="ghost"
          className={voiceEnabled ? "text-green-400 hover:text-green-300" : "text-slate-400 hover:text-white"}
        >
          {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>
      </div>

      {/* 3D Scene */}
      <div className="flex-1 w-full relative">
        <RoomScene laptopId={laptopId} activity={activity} />
      </div>

      {/* Activity Controls */}
      <div className="bg-slate-900/90 border-t border-slate-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 text-center">
            <p className="text-slate-300 font-semibold">What should {laptop?.name} do?</p>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {ACTIVITIES.map((act) => (
              <button
                key={act.name}
                onClick={() => handleActivityClick(act.name)}
                className={`relative p-4 rounded-lg font-semibold text-center transition-all transform hover:scale-105 ${
                  activity === act.name
                    ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white scale-105 shadow-lg shadow-purple-500/50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <div className="text-3xl mb-2">{act.label}</div>
                <div className="text-xs uppercase tracking-wider">{act.description}</div>
                {activity === act.name && (
                  <div className="absolute inset-0 rounded-lg border-2 border-white/30 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
