import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, MapControls, Sparkles, KeyboardControls, useKeyboardControls } from '@react-three/drei';
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

const ACTIVITY_POSITIONS: Record<Activity, { pos: [number, number, number]; rot: [number, number, number] }> = {
  idle: { pos: [0, 0, 0], rot: [0, 0, 0] },
  reading: { pos: [0.2, 0.2, -5], rot: [-0.5, 0.1, 0.15] },
  sleeping: { pos: [11.3, -0.1, -1.5], rot: [0, 0, 0] },
  hiding: { pos: [-3.5, 0.2, 3.5], rot: [0, -Math.PI / 4, -0.3] },
  playing: { pos: [0, 0, 1], rot: [0, 0, 0] },
  jumping: { pos: [0, 0, 0], rot: [0, 0, 0] },
};

function AnimatedLaptop({ 
  laptopId, 
  activity, 
  userPos,
}: { 
  laptopId: string; 
  activity: Activity;
  userPos: [number, number, number];
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

    const target = ACTIVITY_POSITIONS[activity];
    const targetPos = new THREE.Vector3(userPos[0], userPos[1], userPos[2]);
    
    if (!['idle', 'playing', 'jumping'].includes(activity)) {
      targetPos.x = target.pos[0];
      targetPos.y = target.pos[1];
      targetPos.z = target.pos[2];
    }

    groupRef.current.position.lerp(targetPos, 0.05);

    if (activity === 'sleeping') {
      groupRef.current.rotation.z = target.rot[2];
      if (bodyRef.current) bodyRef.current.position.y = 0.2;
      if (leftArmRef.current) leftArmRef.current.rotation.z = -1.6;
      if (rightArmRef.current) rightArmRef.current.rotation.z = 1.6;
      if (leftLegRef.current) leftLegRef.current.position.y = -0.7;
      if (rightLegRef.current) rightLegRef.current.position.y = -0.7;
    } else if (activity === 'hiding') {
      groupRef.current.rotation.y = target.rot[1];
      groupRef.current.rotation.z = target.rot[2];
      groupRef.current.scale.set(0.75, 0.65, 0.75);
      if (bodyRef.current) bodyRef.current.rotation.z = 0.3;
      if (leftArmRef.current) leftArmRef.current.rotation.z = -1.3;
      if (rightArmRef.current) rightArmRef.current.rotation.z = 1.3;
    } else if (activity === 'reading') {
      groupRef.current.rotation.x = target.rot[0];
      groupRef.current.rotation.y = target.rot[1];
      groupRef.current.rotation.z = target.rot[2];
      groupRef.current.scale.set(1, 1, 1);
      if (bodyRef.current) bodyRef.current.rotation.x = 0.4;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.z = -0.3;
        leftArmRef.current.rotation.x = 0.6;
        leftArmRef.current.rotation.y = 0.4;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.z = 0.3;
        rightArmRef.current.rotation.x = 0.6;
        rightArmRef.current.rotation.y = -0.4;
      }
      if (leftLegRef.current) {
        leftLegRef.current.position.y = -0.4;
        leftLegRef.current.rotation.x = 0.5;
      }
      if (rightLegRef.current) {
        rightLegRef.current.position.y = -0.4;
        rightLegRef.current.rotation.x = 0.5;
      }
    } else if (activity === 'playing') {
      groupRef.current.rotation.set(
        Math.sin(t * 2) * 0.12,
        Math.sin(t * 1.5) * 0.2,
        0
      );
      groupRef.current.scale.set(1, 1, 1);
      const bounce = Math.sin(t * 2.5) * 0.18;
      groupRef.current.position.y = userPos[1] + bounce;
      if (leftArmRef.current) leftArmRef.current.rotation.z = Math.sin(t * 3) * 1.3 - 0.4;
      if (rightArmRef.current) rightArmRef.current.rotation.z = Math.sin(t * 3 + Math.PI) * 1.3 + 0.4;
      if (leftLegRef.current) leftLegRef.current.position.y = Math.sin(t * 2.5) * 0.12 - 0.85;
      if (rightLegRef.current) rightLegRef.current.position.y = Math.sin(t * 2.5 + Math.PI) * 0.12 - 0.85;
    } else if (activity === 'jumping') {
      groupRef.current.rotation.set(0, 0, Math.sin(t * 3) * 0.12);
      groupRef.current.scale.set(1, 1, 1);
      const jumpH = Math.max(0, Math.sin(t * 2.5) * 1.8);
      groupRef.current.position.y = userPos[1] + jumpH;
      if (leftArmRef.current) leftArmRef.current.rotation.z = Math.sin(t * 3) * 1.5 - 1;
      if (rightArmRef.current) rightArmRef.current.rotation.z = Math.sin(t * 3 + Math.PI) * 1.5 + 1;
      if (leftLegRef.current) leftLegRef.current.position.y = -0.85 - jumpH * 0.3;
      if (rightLegRef.current) rightLegRef.current.position.y = -0.85 - jumpH * 0.3;
    } else {
      groupRef.current.rotation.set(0, Math.sin(t * 0.8) * 0.1, 0);
      groupRef.current.scale.set(1, 1, 1);
      if (bodyRef.current) bodyRef.current.position.y = Math.sin(t * 1.2) * 0.06;
      if (leftArmRef.current) leftArmRef.current.rotation.z = Math.sin(t * 1.5) * 0.35;
      if (rightArmRef.current) rightArmRef.current.rotation.z = Math.sin(t * 1.5 + Math.PI) * 0.35;
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
          emissiveIntensity={activity === 'playing' ? 0.5 : 0}
        />
      </mesh>

      {activity === 'playing' && <pointLight position={[0, 0, 0.5]} intensity={1.2} color={color} />}

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
            emissiveIntensity={activity === 'playing' ? 0.6 : 0}
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
            emissiveIntensity={activity === 'playing' ? 0.6 : 0}
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
      {/* Floor - polished wood - LARGER */}
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial 
          color="#8b6f47" 
          roughness={0.6}
          metalness={0.05}
        />
      </mesh>

      {/* Floor Trim - hardwood baseboard */}
      <mesh position={[0, -1.15, -8]} receiveShadow castShadow>
        <boxGeometry args={[24, 0.15, 0.15]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.6} />
      </mesh>
      <mesh position={[-12, -1.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.15, 0.15, 24]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.6} />
      </mesh>
      <mesh position={[12, -1.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.15, 0.15, 24]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.6} />
      </mesh>

      {/* Corner trim at floor-wall junctions */}
      <mesh position={[-12, -1.08, -8]} receiveShadow castShadow>
        <boxGeometry args={[0.25, 0.3, 0.25]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.65} />
      </mesh>
      <mesh position={[12, -1.08, -8]} receiveShadow castShadow>
        <boxGeometry args={[0.25, 0.3, 0.25]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.65} />
      </mesh>
      <mesh position={[-12, -1.08, 8]} receiveShadow castShadow>
        <boxGeometry args={[0.25, 0.3, 0.25]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.65} />
      </mesh>
      <mesh position={[12, -1.08, 8]} receiveShadow castShadow>
        <boxGeometry args={[0.25, 0.3, 0.25]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.65} />
      </mesh>

      {/* Wall gradient - warmer tones */}
      <mesh position={[0, 1.5, -8]} receiveShadow>
        <boxGeometry args={[24, 3.5, 0.5]} />
        <meshStandardMaterial 
          color="#daa55b" 
          roughness={0.7}
        />
      </mesh>

      {/* Left wall - warmer accent */}
      <mesh position={[-12, 1.5, 0]} receiveShadow>
        <boxGeometry args={[0.5, 3.5, 24]} />
        <meshStandardMaterial 
          color="#d4a574"
          roughness={0.7}
        />
      </mesh>

      {/* Right wall - ambient lighting surface */}
      <mesh position={[12, 1.5, 0]} receiveShadow>
        <boxGeometry args={[0.5, 3.5, 24]} />
        <meshStandardMaterial 
          color="#c99a6e"
          roughness={0.7}
        />
      </mesh>

      {/* Premium Reading Corner - BOOKSHELF LEFT SIDE */}
      <group position={[-3, 0, -5.5]}>
        {/* Bookshelf Frame - vertical wood supports */}
        {[-1.3, 1.3].map((x) => (
          <mesh key={`frame-${x}`} position={[x, 0.35, -0.15]} castShadow>
            <boxGeometry args={[0.12, 0.95, 0.45]} />
            <meshStandardMaterial color="#1a1410" roughness={0.5} metalness={0.25} />
          </mesh>
        ))}

        {/* Bookshelf backing - mahogany wood */}
        <mesh position={[0, 0.35, -0.42]} castShadow receiveShadow>
          <boxGeometry args={[2.56, 0.95, 0.12]} />
          <meshStandardMaterial color="#2a1f15" roughness={0.6} metalness={0.12} />
        </mesh>

        {/* Shelves - polished mahogany */}
        {[0.85, 0.3, -0.25].map((y) => (
          <mesh key={y} position={[0, y, 0]} receiveShadow castShadow>
            <boxGeometry args={[2.48, 0.14, 0.35]} />
            <meshStandardMaterial 
              color="#6d5a45" 
              roughness={0.3}
              metalness={0.25}
            />
          </mesh>
        ))}

        {/* Books - premium 3D books */}
        {[
          { pos: [-0.95, 0.62, 0.05], color: '#b71c1c', w: 0.28 },
          { pos: [-0.65, 0.62, 0.02], color: '#1565c0', w: 0.32 },
          { pos: [-0.3, 0.62, 0.04], color: '#e65100', w: 0.3 },
          { pos: [0.1, 0.62, 0.02], color: '#2e7d32', w: 0.31 },
          { pos: [0.5, 0.62, 0.05], color: '#6a1b9a', w: 0.3 },
          { pos: [0.85, 0.62, 0.01], color: '#c62828', w: 0.29 },
          { pos: [-0.8, 0.12, 0.03], color: '#8b0000', w: 0.35 },
          { pos: [-0.35, 0.12, 0.04], color: '#00205b', w: 0.33 },
          { pos: [0.15, 0.12, 0.02], color: '#bf360c', w: 0.34 },
          { pos: [0.65, 0.12, 0.05], color: '#1b5e20', w: 0.32 },
        ].map((book, i) => (
          <mesh key={i} position={book.pos as [number, number, number]} castShadow>
            <boxGeometry args={[book.w, 0.65, 0.28]} />
            <meshPhongMaterial color={book.color} shininess={80} />
          </mesh>
        ))}
      </group>

      {/* Premium Reading Chair - RIGHT SIDE */}
      <group position={[0, -0.5, -5]}>
        {/* Front left leg - walnut wood */}
        <mesh position={[-0.42, -0.36, 0.42]} castShadow>
          <boxGeometry args={[0.14, 0.45, 0.14]} />
          <meshStandardMaterial color="#1a1410" roughness={0.6} metalness={0.12} />
        </mesh>
        {/* Front right leg */}
        <mesh position={[0.42, -0.36, 0.42]} castShadow>
          <boxGeometry args={[0.14, 0.45, 0.14]} />
          <meshStandardMaterial color="#1a1410" roughness={0.6} metalness={0.12} />
        </mesh>
        {/* Back left leg */}
        <mesh position={[-0.42, -0.36, -0.42]} castShadow>
          <boxGeometry args={[0.14, 0.45, 0.14]} />
          <meshStandardMaterial color="#1a1410" roughness={0.6} metalness={0.12} />
        </mesh>
        {/* Back right leg */}
        <mesh position={[0.42, -0.36, -0.42]} castShadow>
          <boxGeometry args={[0.14, 0.45, 0.14]} />
          <meshStandardMaterial color="#1a1410" roughness={0.6} metalness={0.12} />
        </mesh>

        {/* Seat cushion - premium linen fabric */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[1, 0.4, 0.95]} />
          <meshStandardMaterial color="#b8a89a" roughness={0.75} metalness={0.01} />
        </mesh>
        
        {/* Back cushion - angled */}
        <mesh position={[0, 0.85, -0.42]} castShadow rotation={[0.4, 0, 0]}>
          <boxGeometry args={[1, 0.7, 0.32]} />
          <meshStandardMaterial color="#a89880" roughness={0.78} metalness={0.01} />
        </mesh>

        {/* Left armrest */}
        <mesh position={[-0.58, 0.38, 0]} castShadow>
          <boxGeometry args={[0.2, 0.6, 0.9]} />
          <meshStandardMaterial color="#7a6855" roughness={0.7} metalness={0.1} />
        </mesh>

        {/* Right armrest */}
        <mesh position={[0.58, 0.38, 0]} castShadow>
          <boxGeometry args={[0.2, 0.6, 0.9]} />
          <meshStandardMaterial color="#7a6855" roughness={0.7} metalness={0.1} />
        </mesh>
      </group>

      {/* Charging Station - Large Test Tube Cylinder at End of Wall */}
      <group position={[11.3, 0.1, -1.5]}>
        {/* Test tube cylinder - main body - LARGE */}
        <mesh castShadow>
          <cylinderGeometry args={[0.8, 0.8, 1.8, 32]} />
          <meshStandardMaterial 
            color="#e8f4f8" 
            roughness={0.15}
            metalness={0.1}
            transparent={true}
            opacity={0.7}
          />
        </mesh>
        {/* Test tube glass rim - top edge */}
        <mesh position={[0, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.82, 0.82, 0.08, 32]} />
          <meshStandardMaterial 
            color="#7fb3d5" 
            roughness={0.2}
            metalness={0.2}
          />
        </mesh>
        {/* Charging liquid glow inside */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.75, 0.75, 1.7, 32]} />
          <meshStandardMaterial 
            color="#22ff22" 
            emissive="#22ff22"
            emissiveIntensity={0.5}
            transparent={true}
            opacity={0.35}
          />
        </mesh>
        {/* Charging glow light - brighter */}
        <pointLight position={[0, 0.3, 0]} intensity={1.8} color="#22ff22" />
        {/* Stand base - larger */}
        <mesh position={[0, -1.0, 0]} castShadow>
          <cylinderGeometry args={[1.0, 1.0, 0.2, 32]} />
          <meshStandardMaterial color="#222" roughness={0.4} metalness={0.2} />
        </mesh>
      </group>

      {/* Premium Sofa - Luxury Design */}
      <group position={[-9, -0.5, 3]}>
        {/* Main seat cushion */}
        <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
          <boxGeometry args={[3.4, 0.95, 1.6]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.75} metalness={0.02} />
        </mesh>
        {/* Back cushion */}
        <mesh position={[0, 0.85, -0.85]} receiveShadow castShadow>
          <boxGeometry args={[3.4, 0.9, 0.4]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.78} metalness={0.02} />
        </mesh>
        {/* Left armrest */}
        <mesh position={[-1.8, 0.4, 0]} castShadow>
          <boxGeometry args={[0.45, 0.9, 1.6]} />
          <meshStandardMaterial color="#1a1410" roughness={0.65} metalness={0.1} />
        </mesh>
        {/* Right armrest */}
        <mesh position={[1.8, 0.4, 0]} castShadow>
          <boxGeometry args={[0.45, 0.9, 1.6]} />
          <meshStandardMaterial color="#1a1410" roughness={0.65} metalness={0.1} />
        </mesh>
        {/* Legs */}
        {[[-1.5, -0.85], [1.5, -0.85], [-1.5, 0.85], [1.5, 0.85]].map((pos, i) => (
          <mesh key={i} position={[pos[0], pos[1], 0]} castShadow>
            <boxGeometry args={[0.15, 0.3, 0.15]} />
            <meshStandardMaterial color="#1a1410" roughness={0.6} metalness={0.12} />
          </mesh>
        ))}
      </group>

      {/* Premium Coffee Table - Glass & Walnut */}
      <group position={[1, -0.8, 2]}>
        {/* Glass top surface */}
        <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
          <boxGeometry args={[1.8, 0.08, 1.2]} />
          <meshStandardMaterial 
            color="#f0f8ff" 
            roughness={0.1}
            metalness={0.2}
            transparent={true}
            opacity={0.85}
          />
        </mesh>
        {/* Wood frame under glass */}
        <mesh position={[0, 0.02, 0]} receiveShadow castShadow>
          <boxGeometry args={[1.75, 0.04, 1.15]} />
          <meshStandardMaterial color="#3a2f24" roughness={0.5} metalness={0.15} />
        </mesh>
        {/* Premium walnut legs */}
        {[[-0.75, -0.4], [0.75, -0.4], [-0.75, 0.45], [0.75, 0.45]].map((pos, i) => (
          <mesh key={i} position={[pos[0], pos[1], 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.45, 16]} />
            <meshStandardMaterial 
              color="#1a1410" 
              roughness={0.6}
              metalness={0.12}
            />
          </mesh>
        ))}
      </group>

      {/* Premium Designer Floor Lamp */}
      <group position={[6, -0.8, 1]}>
        {/* Base */}
        <mesh position={[0, -0.3, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.15, 16]} />
          <meshStandardMaterial color="#0d0a08" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Pole - brushed metal */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 1.1, 16]} />
          <meshStandardMaterial color="#1a1410" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Lamp shade - cone */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <coneGeometry args={[0.45, 0.5, 32]} />
          <meshStandardMaterial 
            color="#fef9e7" 
            roughness={0.2}
            emissive="#ffe8b3"
            emissiveIntensity={0.6}
          />
        </mesh>
        {/* Bright warm glow */}
        <pointLight position={[0, 1.15, 0]} intensity={2.2} color="#ffd580" castShadow />
      </group>

      {/* Premium Decorative Plant */}
      <group position={[-6, -0.8, -4]}>
        {/* Ceramic pot */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.38, 0.55, 16]} />
          <meshStandardMaterial 
            color="#a0826d" 
            roughness={0.75}
            metalness={0.05}
          />
        </mesh>
        {/* Pot rim */}
        <mesh position={[0, 0.28, 0]} castShadow>
          <cylinderGeometry args={[0.33, 0.33, 0.08, 16]} />
          <meshStandardMaterial color="#8b6f4e" roughness={0.7} metalness={0.08} />
        </mesh>
        {/* Soil */}
        <mesh position={[0, 0.32, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.06, 16]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
        </mesh>
        {/* Plant foliage - full bushy shape */}
        <mesh position={[0, 0.85, 0]} castShadow>
          <sphereGeometry args={[0.6, 24, 24]} />
          <meshStandardMaterial 
            color="#1b4d0e"
            roughness={0.65}
            emissive="#0d3606"
            emissiveIntensity={0.2}
          />
        </mesh>
        {/* Secondary leaves for depth */}
        <mesh position={[-0.35, 0.7, 0.25]} castShadow>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshStandardMaterial 
            color="#2d6b1f"
            roughness={0.68}
            emissive="#1a3f0d"
            emissiveIntensity={0.15}
          />
        </mesh>
        <mesh position={[0.35, 0.75, -0.2]} castShadow>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial 
            color="#235d15"
            roughness={0.67}
            emissive="#123508"
            emissiveIntensity={0.15}
          />
        </mesh>
      </group>

      {/* Window - ambient light source */}
      <mesh position={[-11.5, 1, -6]} castShadow>
        <boxGeometry args={[0.4, 1.5, 2]} />
        <meshStandardMaterial 
          color="#87ceeb" 
          emissive="#87ceeb"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Premium Lighting Setup */}
      <ambientLight intensity={0.65} color="#f5e6d3" />
      <directionalLight 
        position={[7, 12, 9]} 
        intensity={1.5} 
        castShadow
        color="#ffebd0"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-4, 2.8, 2.5]} intensity={1} color="#ffedd5" />
      <pointLight position={[5, 2, -5]} intensity={0.8} color="#fff8dc" />
      <pointLight position={[0, 0.5, 0]} intensity={0.3} color="#f5e6d3" />
    </>
  );
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

    posRef.current[0] = Math.max(-5, Math.min(5, posRef.current[0]));
    posRef.current[2] = Math.max(-5, Math.min(5, posRef.current[2]));

    onPositionChange([...posRef.current]);
  });

  return (
    <>
      <Room />
      <AnimatedLaptop laptopId={laptopId} activity={activity} userPos={posRef.current} />
      {activity === 'playing' && <Sparkles count={40} scale={4} size={4} speed={0.6} />}
    </>
  );
}

function RoomScene({ laptopId, activity }: { laptopId: string; activity: Activity }) {
  const [laptopPos, setLaptopPos] = useState<[number, number, number]>([0, 0, 0]);
  const mapControlsRef = useRef<any>(null);

  const keyMap = [
    { name: 'forward' as Controls, keys: ['ArrowUp', 'KeyW'] },
    { name: 'back' as Controls, keys: ['ArrowDown', 'KeyS'] },
    { name: 'left' as Controls, keys: ['ArrowLeft', 'KeyA'] },
    { name: 'right' as Controls, keys: ['ArrowRight', 'KeyD'] },
  ];

  useEffect(() => {
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let pitch = 0; // Track pitch angle to prevent gimbal lock

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !mapControlsRef.current) return;

      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      const rotateSpeed = 0.008;
      const camera = mapControlsRef.current.object;
      const target = mapControlsRef.current.target;
      const distance = camera.position.distanceTo(target);

      // Rotate horizontally (around world Y axis)
      const horizontalQuaternion = new THREE.Quaternion();
      horizontalQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -deltaX * rotateSpeed);
      
      const cameraOffset = new THREE.Vector3().subVectors(camera.position, target);
      cameraOffset.applyQuaternion(horizontalQuaternion);
      camera.position.copy(target).add(cameraOffset);

      // Rotate vertically with gimbal lock prevention
      pitch -= deltaY * rotateSpeed;
      pitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, pitch)); // Limit pitch to ±81 degrees

      const verticalQuaternion = new THREE.Quaternion();
      const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), cameraOffset).normalize();
      verticalQuaternion.setFromAxisAngle(right, pitch + (deltaY * rotateSpeed + deltaY * rotateSpeed));

      const newOffset = cameraOffset.clone();
      const verticalRotQuat = new THREE.Quaternion();
      verticalRotQuat.setFromAxisAngle(right, -deltaY * rotateSpeed);
      newOffset.applyQuaternion(verticalRotQuat);
      
      // Check if new position is valid (not too close to straight up/down)
      const testCam = target.clone().add(newOffset);
      const lookDir = new THREE.Vector3().subVectors(target, testCam).normalize();
      const upDot = Math.abs(lookDir.dot(new THREE.Vector3(0, 1, 0)));
      
      if (upDot < 0.98) { // Allow rotation unless nearly vertical
        camera.position.copy(testCam);
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mapControlsRef.current) return;
      
      const panSpeed = 0.3;
      const camera = mapControlsRef.current.object;
      const target = mapControlsRef.current.target;
      
      // Get camera direction vectors
      const forward = new THREE.Vector3().subVectors(target, camera).normalize();
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();
      
      if (e.key === 'q' || e.key === 'Q') {
        // Pan left
        const offset = right.multiplyScalar(-panSpeed);
        camera.position.add(offset);
        target.add(offset);
      } else if (e.key === 'e' || e.key === 'E') {
        // Pan right
        const offset = right.multiplyScalar(panSpeed);
        camera.position.add(offset);
        target.add(offset);
      } else if (e.key === 'r' || e.key === 'R') {
        // Pan up
        const offset = up.multiplyScalar(panSpeed);
        camera.position.add(offset);
        target.add(offset);
      } else if (e.key === 'f' || e.key === 'F') {
        // Pan down
        const offset = up.multiplyScalar(-panSpeed);
        camera.position.add(offset);
        target.add(offset);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <Canvas shadows camera={{ position: [5, 2.5, 8], fov: 45 }}>
      <KeyboardControls map={keyMap}>
        <RoomSceneContent 
          laptopId={laptopId} 
          activity={activity}
          onPositionChange={setLaptopPos}
        />
      </KeyboardControls>
      <MapControls ref={mapControlsRef} enableZoom={true} enablePan={false} enableRotate={false} zoomSpeed={0.5} minDistance={0.5} maxDistance={80} autoRotate={false} />
    </Canvas>
  );
}

function VirtualJoystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleTouchStart = () => {
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
      reading: 'Going to read some books!',
      sleeping: 'Heading to charge station...',
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
