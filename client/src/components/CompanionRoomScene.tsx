import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
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

function LaptopWithLimbs({ laptopId, activity }: { laptopId: string; activity: Activity }) {
  const groupRef = useRef<THREE.Group>(null);
  const laptop = LAPTOPS.find(l => l.id === laptopId);
  const color = laptop?.color || '#6b7280';
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;

    // Position based on activity
    if (activity === 'sleeping') {
      groupRef.current.position.y = -0.5;
      groupRef.current.rotation.z = Math.PI / 4;
    } else if (activity === 'hiding') {
      groupRef.current.position.x = -2;
      groupRef.current.position.y = 0.5;
    } else if (activity === 'reading') {
      groupRef.current.position.set(1.5, 0, 0);
      groupRef.current.rotation.z = -0.3;
    } else if (activity === 'jumping') {
      groupRef.current.position.y = Math.sin(timeRef.current * 3) * 0.8;
    } else {
      groupRef.current.position.set(0, 0, 0);
      groupRef.current.rotation.z = 0;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body - Laptop Screen */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.2, 0.8, 0.1]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Keyboard Base */}
      <mesh position={[0, -0.5, 0.3]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[1.2, 0.1, 0.8]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Left Leg */}
      <mesh position={[-0.6, -0.7, 0.4]}>
        <cylinderGeometry args={[0.06, 0.06, 0.4, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Right Leg */}
      <mesh position={[0.6, -0.7, 0.4]}>
        <cylinderGeometry args={[0.06, 0.06, 0.4, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Left Arm */}
      <group position={[-0.7, 0, 0.2]} rotation={[0, 0, activity === 'reading' ? -0.5 : activity === 'jumping' ? Math.sin(timeRef.current * 4) * 0.5 : 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.15, 0.5, 0.1]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, -0.35, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      {/* Right Arm */}
      <group position={[0.7, 0, 0.2]} rotation={[0, 0, activity === 'reading' ? 0.5 : activity === 'jumping' ? Math.sin(timeRef.current * 4 + Math.PI) * 0.5 : 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.15, 0.5, 0.1]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, -0.35, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      {/* Simple face */}
      <mesh position={[0, 0.2, 0.06]}>
        <boxGeometry args={[0.5, 0.3, 0.05]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.12, 0.25, 0.1]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.12, 0.25, 0.1]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function RoomEnvironment() {
  return (
    <>
      {/* Floor */}
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#d4a574" />
      </mesh>

      {/* Wall 1 */}
      <mesh position={[0, 1, -4]}>
        <boxGeometry args={[8, 4, 0.1]} />
        <meshStandardMaterial color="#e8dcc8" />
      </mesh>

      {/* Wall 2 */}
      <mesh position={[-4, 1, 0]}>
        <boxGeometry args={[0.1, 4, 8]} />
        <meshStandardMaterial color="#f0e6d2" />
      </mesh>

      {/* Library Shelf */}
      <mesh position={[1.5, 0.5, -3.5]}>
        <boxGeometry args={[2, 2, 0.3]} />
        <meshStandardMaterial color="#8b5a3c" />
      </mesh>

      {/* Books on shelf */}
      {[0, 0.4, -0.4].map((offset, i) => (
        <mesh key={i} position={[1.5 + offset, 1, -3.3]}>
          <boxGeometry args={[0.3, 0.6, 0.2]} />
          <meshStandardMaterial color={['#c41e3a', '#0051ba', '#ffd700'][i % 3]} />
        </mesh>
      ))}

      {/* Sofa */}
      <group position={[-2, -0.5, 1]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.5, 0.8, 1]} />
          <meshStandardMaterial color="#6b4423" />
        </mesh>
        {/* Sofa back */}
        <mesh position={[0, 0.6, -0.6]}>
          <boxGeometry args={[2.5, 0.8, 0.2]} />
          <meshStandardMaterial color="#6b4423" />
        </mesh>
      </group>

      {/* Table */}
      <mesh position={[2, -0.8, 1]}>
        <boxGeometry args={[1.2, 0.1, 0.8]} />
        <meshStandardMaterial color="#8b5a3c" />
      </mesh>
      {[0.5, -0.5].map((offset, i) => (
        <mesh key={i} position={[2 + offset, -1.1, 1]}>
          <cylinderGeometry args={[0.08, 0.08, 0.35]} />
          <meshStandardMaterial color="#8b5a3c" />
        </mesh>
      ))}

      {/* Lamp */}
      <group position={[2.5, 0, 0.5]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.5]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <coneGeometry args={[0.25, 0.3, 16]} />
          <meshStandardMaterial color="#fffacd" emissive="#ffff00" emissiveIntensity={0.5} />
        </mesh>
        <pointLight position={[0, 0.35, 0]} intensity={0.6} color="#ffff99" />
      </group>
    </>
  );
}

function RoomScene({ laptopId, activity }: { laptopId: string; activity: Activity }) {
  return (
    <Canvas shadows>
      <PerspectiveCamera makeDefault position={[3, 1.5, 5]} />
      <OrbitControls enableZoom={true} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <RoomEnvironment />
      <LaptopWithLimbs laptopId={laptopId} activity={activity} />
    </Canvas>
  );
}

const ACTIVITIES: { name: Activity; label: string; description: string }[] = [
  { name: 'idle', label: '🧘', description: 'Idle' },
  { name: 'reading', label: '📚', description: 'Reading' },
  { name: 'sleeping', label: '😴', description: 'Charging' },
  { name: 'hiding', label: '🙈', description: 'Hide & Seek' },
  { name: 'playing', label: '🎮', description: 'Gaming' },
  { name: 'jumping', label: '🦘', description: 'Jumping' },
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
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleActivityClick = (newActivity: Activity) => {
    setActivity(newActivity);
    const messages: Record<Activity, string> = {
      idle: 'Just chilling!',
      reading: 'Time to read some books!',
      sleeping: 'Charging my battery...',
      hiding: 'Peek-a-boo!',
      playing: 'Let\'s play!',
      jumping: 'Weeee!',
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
      <div className="bg-slate-900/80 border-b border-slate-700 p-4 flex items-center justify-between">
        <Button
          onClick={onBack}
          variant="outline"
          className="border-slate-600"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-2xl font-bold text-white">
          💻 {laptop?.name}'s Room
        </h1>
        
        <Button
          onClick={toggleVoice}
          variant="ghost"
          className={voiceEnabled ? "text-green-400" : "text-slate-400"}
        >
          {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>
      </div>

      {/* 3D Room */}
      <div className="flex-1 w-full">
        <RoomScene laptopId={laptopId} activity={activity} />
      </div>

      {/* Activity Controls */}
      <div className="bg-slate-900/80 border-t border-slate-700 p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-slate-300 text-sm mb-4">What should {laptop?.name} do?</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {ACTIVITIES.map((act) => (
              <button
                key={act.name}
                onClick={() => handleActivityClick(act.name)}
                className={`p-4 rounded-lg font-semibold text-center transition-all ${
                  activity === act.name
                    ? 'bg-blue-600 text-white scale-105'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <div className="text-2xl mb-1">{act.label}</div>
                <div className="text-xs">{act.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
