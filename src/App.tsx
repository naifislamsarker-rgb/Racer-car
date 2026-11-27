import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, RoundedBox, Stars, Float } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Play, RotateCcw, Gauge, ShieldAlert, Settings, 
  ChevronRight, ChevronLeft, Home, Users, Car as CarIcon, Map, 
  Clock, Heart, Zap, Shield, Target, User, Lock, Mail, LogOut, Globe, RefreshCw, Edit2, Upload, Camera,
  CloudRain, Cloud, Sun, Volume2, VolumeX
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { sound } from './audio';
import { SpeedLines } from './components/SpeedLines';

// --- Constants & Types ---
const LANE_WIDTH = 3;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];

export const AVATAR_PRESETS = [
  { id: 'neon_red', label: 'Crimson Fury', fallbackChar: '🏎️', style: 'bg-gradient-to-br from-red-600 to-rose-950 text-white' },
  { id: 'neon_blue', label: 'Volt Blue', fallbackChar: '⚡', style: 'bg-gradient-to-br from-blue-600 to-indigo-950 text-white' },
  { id: 'neon_green', label: 'Hyper Green', fallbackChar: '🟢', style: 'bg-gradient-to-br from-emerald-500 to-teal-950 text-white' },
  { id: 'carbon', label: 'Carbon Black', fallbackChar: '🏁', style: 'bg-gradient-to-br from-zinc-700 to-zinc-950 text-white' },
  { id: 'gold_cup', label: 'Champion Gold', fallbackChar: '🏆', style: 'bg-gradient-to-br from-amber-400 to-amber-950 text-white' },
];

export function RacerAvatar({ photoURL, className = "w-10 h-10" }: { photoURL?: string | null; className?: string }) {
  if (!photoURL) {
    return (
      <div className={`${className} bg-red-600/20 text-red-500 border border-red-500/20 rounded-xl flex items-center justify-center shrink-0`}>
        <User className="w-1/2 h-1/2" />
      </div>
    );
  }

  if (photoURL.startsWith('preset:')) {
    const presetId = photoURL.replace('preset:', '');
    const preset = AVATAR_PRESETS.find(p => p.id === presetId) || AVATAR_PRESETS[0];
    return (
      <div className={`${className} ${preset.style} border border-white/10 rounded-xl flex items-center justify-center text-lg shadow-inner select-none shrink-0`}>
        <span className="text-xl">{preset.fallbackChar}</span>
      </div>
    );
  }

  // Custom Base64 image
  return (
    <img 
      src={photoURL} 
      alt="Driver Avatar" 
      className={`${className} object-cover rounded-xl border border-white/10 shrink-0`} 
      referrerPolicy="no-referrer"
    />
  );
}

export function NeonClockSystem({ size = 52 }: { size?: number }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    let animId: number;
    const updateTime = () => {
      setTime(new Date());
      animId = requestAnimationFrame(updateTime);
    };
    animId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animId);
  }, []);

  const ms = time.getMilliseconds();
  const sec = time.getSeconds() + ms / 1000;
  const min = time.getMinutes() + sec / 60;
  const hr = (time.getHours() % 12) + min / 60;

  const secDeg = sec * 6; // 360 / 60 = 6
  const minDeg = min * 6; // 360 / 60 = 6
  const hrDeg = hr * 30; // 360 / 12 = 30

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      {/* Outer Rotating Gear/Dash Indicator Systems */}
      <svg className="absolute inset-0 w-full h-full transform animate-[spin_100s_linear_infinite]" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" stroke="rgba(239, 68, 68, 0.45)" strokeWidth="1.5" strokeDasharray="3 4" fill="none" />
      </svg>
      <svg className="absolute inset-0 w-full h-full transform animate-[spin_40s_linear_infinite_reverse]" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" stroke="rgba(251, 113, 133, 0.3)" strokeWidth="1" strokeDasharray="8 6" fill="none" />
      </svg>

      {/* Actual Clock Core with pointer hands */}
      <svg className="w-[84%] h-[84%] drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]" viewBox="0 0 100 100">
        {/* Background gradient */}
        <defs>
          <radialGradient id="clockBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#27272a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#09090b" stopOpacity="0.9" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#clockBg)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

        {/* Hour Markers (12 ticks around clock) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 50 + 38 * Math.sin(angle);
          const y1 = 50 - 38 * Math.cos(angle);
          const x2 = 50 + 43 * Math.sin(angle);
          const y2 = 50 - 43 * Math.cos(angle);
          return (
            <line 
              key={i} 
              x1={x1} 
              y1={y1} 
              x2={x2} 
              y2={y2} 
              stroke={i % 3 === 0 ? "#ef4444" : "rgba(255,255,255,0.4)"} 
              strokeWidth={i % 3 === 0 ? "1.5" : "0.75"} 
            />
          );
        })}

        {/* Clock Hands with custom rotation angle */}
        {/* Hour Hand */}
        <line 
          x1="50" 
          y1="50" 
          x2="50" 
          y2="25" 
          stroke="#ef4444" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          transform={`rotate(${hrDeg}, 50, 50)`} 
        />
        {/* Minute Hand */}
        <line 
          x1="50" 
          y1="50" 
          x2="50" 
          y2="17" 
          stroke="#f4f4f5" 
          strokeWidth="2" 
          strokeLinecap="round" 
          transform={`rotate(${minDeg}, 50, 50)`} 
        />
        {/* Second Hand (Silky Sweep) */}
        <line 
          x1="50" 
          y1="55" 
          x2="50" 
          y2="11" 
          stroke="#fb7185" 
          strokeWidth="1.2" 
          strokeLinecap="round" 
          transform={`rotate(${secDeg}, 50, 50)`} 
        />

        {/* Center Pin Indicator */}
        <circle cx="50" cy="50" r="4.5" fill="#09090b" stroke="#fb7185" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type GameMode = 'ENDLESS' | 'TIME_TRIAL' | 'SURVIVAL' | 'LEVELS';
type GameState = 'MENU' | 'CONFIG' | 'START' | 'PLAYING' | 'GAMEOVER' | 'VICTORY' | 'PAUSED';
type TrackType = 'NEON' | 'DESERT' | 'ARCTIC';
type CarType = 'SPEEDER' | 'BALANCED' | 'AGILE' | 'FORMULA';

interface CarStats {
  speed: number;
  acceleration: number;
  handling: number;
  color: string;
  label: string;
  description: string;
  modelType: 'GT3' | 'F1';
}

const CARS: Record<CarType, CarStats> = {
  SPEEDER: {
    speed: 1.2,
    acceleration: 1.5,
    handling: 0.8,
    color: '#ef4444',
    label: 'Red Speeder',
    description: 'Built for pure velocity. Hard to steer at high speeds.',
    modelType: 'GT3'
  },
  BALANCED: {
    speed: 1.0,
    acceleration: 1.0,
    handling: 1.0,
    color: '#3b82f6',
    label: 'Blue Striker',
    description: 'Perfect balance of speed and control.',
    modelType: 'GT3'
  },
  AGILE: {
    speed: 0.8,
    acceleration: 0.8,
    handling: 1.5,
    color: '#10b981',
    label: 'Green Ghost',
    description: 'Incredible handling. Weaves through traffic with ease.',
    modelType: 'GT3'
  },
  FORMULA: {
    speed: 1.4,
    acceleration: 1.8,
    handling: 1.2,
    color: '#dc2626',
    label: 'Pro Formula',
    description: 'The ultimate racing machine. Extreme speed and downforce.',
    modelType: 'F1'
  }
};

const TRACKS: Record<TrackType, { color: string; emissive: string; label: string; bg: string; preset: any; sky: string }> = {
  NEON: { color: '#18181b', emissive: '#ef4444', label: 'Neon City', bg: '#09090b', preset: 'night', sky: '#000' },
  DESERT: { color: '#1a1a1a', emissive: '#f59e0b', label: 'Dusty Dunes', bg: '#c2b280', preset: 'sunset', sky: '#87ceeb' },
  ARCTIC: { color: '#1a1a1a', emissive: '#38bdf8', label: 'Frozen Pass', bg: '#e0f2fe', preset: 'dawn', sky: '#e0f2fe' }
};

const DIFFICULTY_SETTINGS = {
  EASY: { initialSpeed: 0.3, speedIncrement: 0.0005, spawnInterval: 1500, label: 'Rookie' },
  MEDIUM: { initialSpeed: 0.5, speedIncrement: 0.001, spawnInterval: 1000, label: 'Pro' },
  HARD: { initialSpeed: 0.8, speedIncrement: 0.002, spawnInterval: 700, label: 'Legend' }
};

const GAME_LEVELS = Array.from({ length: 10 }).map((_, i) => ({
  id: i + 1,
  target: (i + 1) * 500,
  label: `Level ${String(i + 1).padStart(2, '0')}`
}));

interface ObstacleData {
  id: number;
  lane: number;
  z: number;
  color: string;
}

interface PlayerState {
  lane: number;
  score: number;
  lives: number;
  distance: number;
  car: CarType;
  isDead: boolean;
}

// --- 3D Components ---

function PlayerCar({ lane, carType, isPlayer2 = false, isInvincible = false, isBoosting = false, isBraking = false, weather = 'CLEAR' }: { lane: number; carType: CarType; isPlayer2?: boolean; isInvincible?: boolean; isBoosting?: boolean; isBraking?: boolean; weather?: 'CLEAR' | 'RAIN' | 'FOG' }) {
  const meshRef = useRef<THREE.Group>(null);
  const targetX = LANES[lane] + (isPlayer2 ? 0.5 : -0.5);
  const car = CARS[carType];

  const [particles, setParticles] = useState<{
    id: number;
    pos: [number, number, number];
    velocity: [number, number, number];
    size: number;
    color: string;
    opacity: number;
    life: number;
    maxLife: number;
  }[]>([]);
  const nextId = useRef(0);

  useFrame((state, delta) => {
    if (meshRef.current) {
      let finalHandling = car.handling;
      if (weather === 'RAIN') {
        finalHandling = car.handling * 0.40; // 40% traction
      } else if (weather === 'FOG') {
        finalHandling = car.handling * 0.75; // 75% traction
      }

      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.15 * finalHandling);
      
      // Dynamic slippage / drift yaw animation during rain or foggy conditions
      if (weather === 'RAIN' && Math.abs(meshRef.current.position.x - targetX) > 0.05) {
        meshRef.current.rotation.z = THREE.MathUtils.lerp(
          meshRef.current.rotation.z, 
          (meshRef.current.position.x - targetX) * 0.85 + (Math.sin(state.clock.elapsedTime * 30) * 0.04), 
          0.12
        );
      } else {
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, (meshRef.current.position.x - targetX) * 0.5, 0.1);
      }
      
      if (isInvincible) {
        meshRef.current.visible = Math.sin(state.clock.elapsedTime * 20) > 0;
      } else {
        meshRef.current.visible = true;
      }
    }

    // Update existing particles
    setParticles(prev => {
      return prev
        .map(p => {
          const nextLife = p.life - delta;
          const pct = Math.max(0, nextLife / p.maxLife);
          return {
            ...p,
            life: nextLife,
            opacity: pct,
            pos: [
              p.pos[0] + p.velocity[0],
              p.pos[1] + p.velocity[1],
              p.pos[2] + p.velocity[2]
            ] as [number, number, number]
          };
        })
        .filter(p => p.life > 0);
    });

    // Spawn new nitrous/boost sparks
    if (isBoosting) {
      const exhaustPositions: [number, number, number][] = car.modelType === 'F1' 
        ? [[0, 0.05, 1.9]] 
        : [[-0.65, -0.15, 2.0], [0.65, -0.15, 2.0]];

      const spawnCount = Math.random() < 0.8 ? 2 : 1;
      const newPList = [];
      
      for (let s = 0; s < spawnCount; s++) {
        const offsetSource = exhaustPositions[Math.floor(Math.random() * exhaustPositions.length)];
        const id = nextId.current++;
        const vx = (Math.random() - 0.5) * 0.12;
        const vy = (Math.random() - 0.2) * 0.08;
        const vz = 0.45 + Math.random() * 0.45; // Shoot backward
        
        // Vibrant hot colors for combustion / speed effect
        const colors = ['#00f0ff', '#3b82f6', '#ff0077', '#ffffff', '#e0f2fe'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const maxLife = 0.2 + Math.random() * 0.35;

        newPList.push({
          id,
          pos: [
            offsetSource[0] + (Math.random() - 0.5) * 0.15,
            offsetSource[1] + (Math.random() - 0.5) * 0.1,
            offsetSource[2] + (Math.random() - 0.5) * 0.1
          ] as [number, number, number],
          velocity: [vx, vy, vz] as [number, number, number],
          size: 0.08 + Math.random() * 0.22,
          color: randomColor,
          opacity: 1,
          life: maxLife,
          maxLife
        });
      }
      setParticles(prev => [...prev, ...newPList].slice(-55));
    }
  });

  if (car.modelType === 'F1') {
    return (
      <group ref={meshRef} position={[0, 0.4, 5]}>
        {/* Dynamic Flying Nitrous Boost Particles */}
        {particles.map(p => (
          <mesh key={p.id} position={p.pos}>
            <sphereGeometry args={[p.size, 6, 6]} />
            <meshBasicMaterial color={p.color} transparent opacity={p.opacity} />
          </mesh>
        ))}

        {/* Floating Exhaust Plasma thrust cone */}
        {isBoosting && (
          <mesh position={[0, 0, 2.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.35, 1.8 + Math.sin(Date.now() * 0.1) * 0.2, 8]} />
            <meshBasicMaterial color="#00f0ff" transparent opacity={0.45 + Math.sin(Date.now() * 0.05) * 0.15} />
          </mesh>
        )}

        {/* F1 Main Chassis */}
        <RoundedBox args={[0.8, 0.4, 3.8]} radius={0.1} smoothness={2} position={[0, 0.1, 0]}>
          <meshStandardMaterial color={car.color} roughness={0.1} metalness={0.9} />
        </RoundedBox>
        <mesh position={[0, 0.05, -2.2]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.6, 0.2, 1]} />
          <meshStandardMaterial color={car.color} />
        </mesh>
        <mesh position={[0, 0.4, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.05, 16, 32, Math.PI]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0, 0.3, 0.2]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#222" roughness={0} />
        </mesh>
        <group position={[0, 0, -2.5]}>
          <mesh position={[0, 0, 0]}><boxGeometry args={[2.8, 0.05, 0.6]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[1.35, 0.15, 0]}><boxGeometry args={[0.1, 0.3, 0.6]} /><meshStandardMaterial color={car.color} /></mesh>
          <mesh position={[-1.35, 0.15, 0]}><boxGeometry args={[0.1, 0.3, 0.6]} /><meshStandardMaterial color={car.color} /></mesh>
        </group>
        <group position={[0, 0.7, 1.8]}>
          <mesh position={[1.1, -0.3, 0]}><boxGeometry args={[0.05, 0.8, 0.8]} /><meshStandardMaterial color={car.color} /></mesh>
          <mesh position={[-1.1, -0.3, 0]}><boxGeometry args={[0.05, 0.8, 0.8]} /><meshStandardMaterial color={car.color} /></mesh>
          <mesh position={[0, 0, 0]} rotation={[0.2, 0, 0]}><boxGeometry args={[2.2, 0.05, 0.5]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0, -0.2, 0]} rotation={[0.1, 0, 0]}><boxGeometry args={[2.2, 0.05, 0.4]} /><meshStandardMaterial color="#111" /></mesh>
        </group>
        <mesh position={[0.6, 0.1, 0.2]} rotation={[0, -0.1, 0]}><boxGeometry args={[0.5, 0.4, 1.8]} /><meshStandardMaterial color={car.color} /></mesh>
        <mesh position={[-0.6, 0.1, 0.2]} rotation={[0, 0.1, 0]}><boxGeometry args={[0.5, 0.4, 1.8]} /><meshStandardMaterial color={car.color} /></mesh>
        {[
          { pos: [-1.1, 0, -1.4], size: [0.45, 0.4] },
          { pos: [1.1, 0, -1.4], size: [0.45, 0.4] },
          { pos: [-1.2, 0.1, 1.4], size: [0.55, 0.5] },
          { pos: [1.2, 0.1, 1.4], size: [0.55, 0.5] }
        ].map((wheel, i) => (
          <group key={i} position={wheel.pos as [number, number, number]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[wheel.size[0], wheel.size[0], wheel.size[1], 24]} />
              <meshStandardMaterial color="#111" roughness={0.9} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]} position={[wheel.pos[0] > 0 ? 0.21 : -0.21, 0, 0]}>
              <torusGeometry args={[wheel.size[0] - 0.05, 0.02, 8, 24]} />
              <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.6, 0.6]} rotation={[-0.2, 0, 0]}><boxGeometry args={[0.3, 0.2, 0.6]} /><meshStandardMaterial color="#111" /></mesh>
      </group>
    );
  }

  // GT3 Style Model (Default)
  return (
    <group ref={meshRef} position={[0, 0.5, 5]}>
      {/* Dynamic Flying Nitrous Boost Particles */}
      {particles.map(p => (
        <mesh key={p.id} position={p.pos}>
          <sphereGeometry args={[p.size, 6, 6]} />
          <meshBasicMaterial color={p.color} transparent opacity={p.opacity} />
        </mesh>
      ))}

      {/* Floating Exhaust Plasma dual thrust cones */}
      {isBoosting && (
        <>
          <mesh position={[-0.65, -0.15, 2.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.28, 1.5 + Math.sin(Date.now() * 0.1) * 0.2, 8]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.4 + Math.sin(Date.now() * 0.05) * 0.15} />
          </mesh>
          <mesh position={[0.65, -0.15, 2.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.28, 1.5 + Math.sin(Date.now() * 0.1) * 0.2, 8]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.4 + Math.sin(Date.now() * 0.05) * 0.15} />
          </mesh>
        </>
      )}

      <RoundedBox args={[1.8, 0.5, 4]} radius={0.1} smoothness={2}>
        <meshStandardMaterial color={car.color} roughness={0.2} metalness={0.8} />
      </RoundedBox>
      <mesh position={[0, 0.26, 0]}>
        <boxGeometry args={[0.4, 0.01, 4.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <RoundedBox args={[1.4, 0.5, 1.8]} radius={0.2} smoothness={2} position={[0, 0.4, 0.2]}>
        <meshStandardMaterial color="#111" roughness={0.1} transparent opacity={0.9} />
      </RoundedBox>
      <group position={[0, 0.6, 1.7]}>
        <mesh position={[0.6, -0.2, 0]}><boxGeometry args={[0.05, 0.4, 0.1]} /><meshStandardMaterial color="#111" /></mesh>
        <mesh position={[-0.6, -0.2, 0]}><boxGeometry args={[0.05, 0.4, 0.1]} /><meshStandardMaterial color="#111" /></mesh>
        <mesh position={[0, 0, 0]} rotation={[0.1, 0, 0]}><boxGeometry args={[2.2, 0.05, 0.6]} /><meshStandardMaterial color="#111" metalness={0.9} /></mesh>
      </group>
      <mesh position={[0, -0.15, -1.9]}><boxGeometry args={[2, 0.1, 0.4]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[1, 0.3, -0.2]}><boxGeometry args={[0.2, 0.15, 0.1]} /><meshStandardMaterial color={car.color} /></mesh>
      <mesh position={[-1, 0.3, -0.2]}><boxGeometry args={[0.2, 0.15, 0.1]} /><meshStandardMaterial color={car.color} /></mesh>
      <mesh position={[0.91, 0.1, 0.5]} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[0.8, 0.4, 0.01]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[-0.91, 0.1, 0.5]} rotation={[0, -Math.PI / 2, 0]}><boxGeometry args={[0.8, 0.4, 0.01]} /><meshStandardMaterial color="#ffffff" /></mesh>
      {[[-0.9, -0.2, -1.2], [0.9, -0.2, -1.2], [-0.9, -0.2, 1.2], [0.9, -0.2, 1.2]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.3, 16]} />
          <meshStandardMaterial color="#111" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0.6, 0.1, -2.01]}><boxGeometry args={[0.4, 0.15, 0.05]} /><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={3} /></mesh>
      <mesh position={[-0.6, 0.1, -2.01]}><boxGeometry args={[0.4, 0.15, 0.05]} /><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={3} /></mesh>
      <mesh position={[0.7, 0.1, 2.01]}><boxGeometry args={[0.4, 0.1, 0.05]} /><meshStandardMaterial color="#f00" emissive="#f00" emissiveIntensity={isBraking ? 10 : 2} /></mesh>
      <mesh position={[-0.7, 0.1, 2.01]}><boxGeometry args={[0.4, 0.1, 0.05]} /><meshStandardMaterial color="#f00" emissive="#f00" emissiveIntensity={isBraking ? 10 : 2} /></mesh>
    </group>
  );
}

function Obstacle({ data }: { data: ObstacleData }) {
  return (
    <group position={[LANES[data.lane], 0, data.z]}>
      {/* SUV / Sedan Body */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.9, 0.8, 3.8]} />
        <meshStandardMaterial color={data.color} roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.9, 0.2]} castShadow>
        <boxGeometry args={[1.5, 0.6, 2]} />
        <meshStandardMaterial color="#111" roughness={0} />
      </mesh>
      {/* Wheels */}
      {[[-0.95, 0.2, -1.2], [0.95, 0.2, -1.2], [-0.95, 0.2, 1.2], [0.95, 0.2, 1.2]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.3, 12]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      {/* Lights */}
      <mesh position={[0.7, 0.6, -1.91]}><boxGeometry args={[0.4, 0.2, 0.05]} /><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} /></mesh>
      <mesh position={[-0.7, 0.6, -1.91]}><boxGeometry args={[0.4, 0.2, 0.05]} /><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} /></mesh>
      <mesh position={[0.7, 0.5, 1.91]}><boxGeometry args={[0.4, 0.15, 0.05]} /><meshStandardMaterial color="#f00" emissive="#f00" emissiveIntensity={1} /></mesh>
      <mesh position={[-0.7, 0.5, 1.91]}><boxGeometry args={[0.4, 0.15, 0.05]} /><meshStandardMaterial color="#f00" emissive="#f00" emissiveIntensity={1} /></mesh>
    </group>
  );
}

function RainEffect({ speed }: { speed: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 400;
  
  // Create static buffer attributes for positions
  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;       // x
      pos[i * 3 + 1] = Math.random() * 25 + 1;        // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 70;    // z: distributed along the track ahead & behind
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position;
    if (!posAttr) return;

    for (let i = 0; i < count; i++) {
      let y = posAttr.getY(i);
      let z = posAttr.getZ(i);
      let x = posAttr.getX(i);

      // Rain falls down rapidly and moves backward relative to speed
      y -= 25 * delta;
      z += speed * 45 * delta; // move backwards representing car speed

      // If falls below ground or too far back, recycle to the front/top
      if (y < 0) {
        y = Math.random() * 25 + 15;
        x = (Math.random() - 0.5) * 40;
      }
      if (z > 40) {
        z = -40 - Math.random() * 30;
        x = (Math.random() - 0.5) * 40;
      }

      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#bae6fd"
        size={0.12}
        transparent
        opacity={0.65}
        sizeAttenuation={true}
      />
    </points>
  );
}

function Road({ speed, trackType }: { speed: number; trackType: TrackType }) {
  const markingsRef = useRef<THREE.Group>(null);
  const terrainRef = useRef<THREE.Group>(null);
  const propsRef = useRef<THREE.Group>(null);
  const track = TRACKS[trackType];
  
  useFrame((state, delta) => {
    if (markingsRef.current) {
      markingsRef.current.position.z = (markingsRef.current.position.z + speed * 2) % 5;
    }
    if (terrainRef.current) {
      terrainRef.current.position.z = (terrainRef.current.position.z + speed * 2) % 20;
    }
    if (propsRef.current) {
      propsRef.current.position.z = (propsRef.current.position.z + speed * 2) % 80;
    }
  });

  return (
    <group>
      {/* Realistic Asphalt Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -20]} receiveShadow>
        <planeGeometry args={[12, 200]} />
        <meshStandardMaterial color="#111" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Ground / Shoulders */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -20]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={trackType === 'DESERT' ? '#8b7355' : trackType === 'ARCTIC' ? '#e0f2fe' : '#050505'} roughness={1} />
      </mesh>

      {/* River (Alongside the road) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, -0.04, -20]}>
        <planeGeometry args={[30, 200]} />
        <meshStandardMaterial color="#0e7490" transparent opacity={0.6} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Road Markings */}
      <group ref={markingsRef}>
        {/* Center Line */}
        {Array.from({ length: 40 }).map((_, i) => (
          <mesh key={`center-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -i * 5 + 20]}>
            <planeGeometry args={[0.15, 2.5]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
        ))}
        {/* Side Lines */}
        {[-5.8, 5.8].map((x) => (
          <mesh key={`side-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, -20]}>
            <planeGeometry args={[0.2, 200]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
          </mesh>
        ))}
      </group>

      {/* Environment Props (Lamps, Houses, Bridges) */}
      <group ref={propsRef}>
        {Array.from({ length: 5 }).map((_, i) => (
          <group key={i} position={[0, 0, -i * 40]}>
            {/* Roadside Lamps */}
            {[-6.5, 6.5].map((x, j) => (
              <group key={`lamp-${j}`} position={[x, 0, 0]}>
                <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.05, 0.1, 5]} /><meshStandardMaterial color="#333" /></mesh>
                <mesh position={[x > 0 ? -0.5 : 0.5, 5, 0]} rotation={[0, 0, x > 0 ? Math.PI / 2 : -Math.PI / 2]}>
                  <cylinderGeometry args={[0.05, 0.05, 1]} />
                  <meshStandardMaterial color="#333" />
                </mesh>
                <mesh position={[x > 0 ? -1 : 1, 4.8, 0]}>
                  <boxGeometry args={[0.4, 0.2, 0.4]} />
                  <meshStandardMaterial color="#fff" emissive="#ffaa00" emissiveIntensity={5} />
                </mesh>
              </group>
            ))}

            {/* Houses / Buildings */}
            <group position={[-15, 0, 10]}>
              <RoundedBox args={[6, 8, 6]} radius={0.1} position={[0, 4, 0]}>
                <meshStandardMaterial color="#444" />
              </RoundedBox>
              <mesh position={[0, 9, 0]} rotation={[0, Math.PI / 4, 0]}>
                <coneGeometry args={[6, 4, 4]} />
                <meshStandardMaterial color="#800" />
              </mesh>
              <mesh position={[0, 5, 3.01]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={2} /></mesh>
            </group>

            {/* Bridge */}
            {i % 2 === 0 && (
              <group position={[0, 0, -20]}>
                <mesh position={[-7, 4, 0]}><boxGeometry args={[1, 10, 2]} /><meshStandardMaterial color="#222" /></mesh>
                <mesh position={[7, 4, 0]}><boxGeometry args={[1, 10, 2]} /><meshStandardMaterial color="#222" /></mesh>
                <mesh position={[0, 9, 0]}><boxGeometry args={[16, 1, 6]} /><meshStandardMaterial color="#222" /></mesh>
                <mesh position={[0, 10, 3]}><boxGeometry args={[16, 1, 0.2]} /><meshStandardMaterial color="#444" /></mesh>
                <mesh position={[0, 10, -3]}><boxGeometry args={[16, 1, 0.2]} /><meshStandardMaterial color="#444" /></mesh>
              </group>
            )}
          </group>
        ))}
      </group>

      {/* Realistic Environment / Terrain */}
      <group ref={terrainRef}>
        {Array.from({ length: 10 }).map((_, i) => (
          <group key={i} position={[0, 0, -i * 20]}>
            <mesh position={[-40, 2, 0]} rotation={[0, 0.5, 0]}>
              <coneGeometry args={[20, 30, 4]} />
              <meshStandardMaterial color={trackType === 'DESERT' ? '#8b4513' : '#222'} roughness={1} />
            </mesh>
            <mesh position={[40, 2, 5]} rotation={[0, -0.3, 0]}>
              <coneGeometry args={[25, 40, 4]} />
              <meshStandardMaterial color={trackType === 'DESERT' ? '#a0522d' : '#222'} roughness={1} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Guard Rails */}
      <mesh position={[-6.2, 0.4, -20]}>
        <boxGeometry args={[0.2, 0.8, 200]} />
        <meshStandardMaterial color="#555" metalness={0.8} />
      </mesh>
      <mesh position={[6.2, 0.4, -20]}>
        <boxGeometry args={[0.2, 0.8, 200]} />
        <meshStandardMaterial color="#555" metalness={0.8} />
      </mesh>
    </group>
  );
}

// --- Main App Component ---

export default function App() {
  // Game State
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [playerCount, setPlayerCount] = useState<1 | 2>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [gameMode, setGameMode] = useState<GameMode>('ENDLESS');
  const [selectedTrack, setSelectedTrack] = useState<TrackType>('NEON');
  const [selectedCar, setSelectedCar] = useState<CarType>('BALANCED');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  
  // Gameplay State
  const [players, setPlayers] = useState<PlayerState[]>([
    { lane: 1, score: 0, lives: 3, distance: 0, car: 'BALANCED', isDead: false }
  ]);
  const [obstacles, setObstacles] = useState<ObstacleData[]>([]);
  const [speed, setSpeed] = useState(0.5);
  const [isAccelerating, setIsAccelerating] = useState(false);
  const [isBraking, setIsBraking] = useState(false);

  const isAcceleratingRef = useRef(false);
  const isBrakingRef = useRef(false);

  useEffect(() => {
    isAcceleratingRef.current = isAccelerating;
  }, [isAccelerating]);

  useEffect(() => {
    isBrakingRef.current = isBraking;
  }, [isBraking]);

  const [highScore, setHighScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isInvincible, setIsInvincible] = useState(false);
  const [raceTime, setRaceTime] = useState(0);
  
  // Audio state
  const [isSoundMuted, setIsSoundMuted] = useState(sound.getMuteStatus());
  const lastLaneRef = useRef<number>(1);
  const lastMilestoneRef = useRef<number>(0);

  // Dynamic Weather System
  const [weather, setWeather] = useState<'CLEAR' | 'RAIN' | 'FOG'>('CLEAR');
  const [weatherAlert, setWeatherAlert] = useState<string | null>(null);

  // Lane Change Sound Effect (Skids in Rain / Fog)
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      if (players[0]) lastLaneRef.current = players[0].lane;
      return;
    }
    const currentLane = players[0]?.lane;
    if (currentLane !== undefined && currentLane !== lastLaneRef.current) {
      if (weather === 'RAIN' || weather === 'FOG') {
        sound.playSkidSound();
      }
      lastLaneRef.current = currentLane;
    }
  }, [players, weather, gameState]);

  // Turn off engine roar when not playing
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      sound.setAccelerating(false, 0);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'PLAYING') {
      setWeather('CLEAR');
      setWeatherAlert(null);
      return;
    }

    // Weather loop: CLEAR -> RAIN -> CLEAR -> FOG
    const weatherCycle: ('CLEAR' | 'RAIN' | 'FOG')[] = ['CLEAR', 'RAIN', 'CLEAR', 'FOG'];
    let currentIdx = 0;

    const interval = setInterval(() => {
      currentIdx = (currentIdx + 1) % weatherCycle.length;
      const nextWeather = weatherCycle[currentIdx];
      setWeather(nextWeather);

      if (nextWeather === 'RAIN') {
        setWeatherAlert('🌧️ WEATHER ALERT: HEAVY RAIN INBOUND. TRACTION DRASTICALLY REDUCED!');
        setTimeout(() => setWeatherAlert(null), 5500);
      } else if (nextWeather === 'FOG') {
        setWeatherAlert('🌫️ WEATHER ALERT: DENSE FOG ROLL-IN. OBSTACLE VISIBILITY CRITICAL!');
        setTimeout(() => setWeatherAlert(null), 5500);
      } else {
        setWeatherAlert('☀️ WEATHER UPDATE: STORM CLEARED. DISENGAGING WEATHER HAZARDS!');
        setTimeout(() => setWeatherAlert(null), 5500);
      }
    }, 22000); // Trigger weather transition every 22 seconds

    return () => {
      clearInterval(interval);
    };
  }, [gameState]);
  
  // Firebase Auth states
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [driverName, setDriverName] = useState('');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [userPhotoURL, setUserPhotoURL] = useState<string>('');
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const scoreRef = useRef(0);
  const speedRef = useRef(0.5);
  const lastSpawnTime = useRef(0);
  const gameLoopRef = useRef<number>(null);
  const startTimeRef = useRef(0);

  // Fetch Leaderboard
  const fetchLeaderboard = async () => {
    const scoresCol = collection(db, 'scores');
    const q = query(scoresCol, orderBy('score', 'desc'), limit(5));
    try {
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeaderboard(list);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'scores');
    }
  };

  // Auth State Listener
  useEffect(() => {
    const restoreGuest = () => {
      const guestUid = localStorage.getItem('red-racer-3d-guest-uid') || 'guest_' + Math.floor(100000 + Math.random() * 900000);
      const guestName = localStorage.getItem('red-racer-3d-guest-name') || 'Guest Racer';
      const guestPhoto = localStorage.getItem('red-racer-3d-guest-photo') || 'preset:neon_red';
      
      const guestUser = {
        uid: guestUid,
        displayName: guestName,
        email: 'guest@racer.local',
        photoURL: guestPhoto,
        emailVerified: false,
        isAnonymous: true,
        metadata: {},
        providerData: [],
        delete: async () => {},
        getIdToken: async () => '',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
        phoneNumber: null,
      } as unknown as FirebaseUser;
      
      setCurrentUser(guestUser);
      setDriverName(guestName);
      setNewName(guestName);
      setUserPhotoURL(guestPhoto);
      
      const localHS = localStorage.getItem('red-racer-3d-highscore');
      if (localHS) setHighScore(parseInt(localHS, 10));
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Force mock offline guest if somehow user anonymous is not preferred
        const isGuestFlag = localStorage.getItem('red-racer-3d-is-guest') === 'true';
        if (isGuestFlag) {
          restoreGuest();
          setAuthLoading(false);
          return;
        }

        setCurrentUser(user);
        const initialName = user.displayName || (user.isAnonymous ? 'Guest_' + user.uid.substring(0, 4) : 'Unknown Racer');
        setDriverName(initialName);
        setNewName(initialName);
        
        // Try getting levels progress from local storage
        const savedLevel = localStorage.getItem('red-racer-3d-unlocked-level');
        if (savedLevel) setUnlockedLevel(parseInt(savedLevel, 10));

        // Fetch users doc with full error tolerance
        const docRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.highScore) {
              setHighScore(data.highScore);
            }
            if (data.photoURL) {
              setUserPhotoURL(data.photoURL);
            } else {
              setUserPhotoURL('');
            }
          } else {
            // Bootstrap
            try {
              await setDoc(docRef, {
                uid: user.uid,
                displayName: initialName,
                highScore: 0,
                photoURL: '',
                createdAt: serverTimestamp()
              });
              await setDoc(doc(db, 'users', user.uid, 'private', 'info'), {
                email: user.email || ''
              });
            } catch (err) {
              console.warn('Silent read-only fallback due to bootstrap limit/auth rules:', err);
            }
            setUserPhotoURL('');
          }
        } catch (err) {
          console.warn('Running in safe offline/guest sandbox mode:', err);
          const localHS = localStorage.getItem('red-racer-3d-highscore');
          if (localHS) setHighScore(parseInt(localHS, 10));
        }

        try {
          await fetchLeaderboard();
        } catch (lbErr) {
          console.warn('Leaderboard hidden/offline:', lbErr);
        }
      } else {
        // If there is no firebase user, check if we have an active offline guest mode flag
        const isGuestFlag = localStorage.getItem('red-racer-3d-is-guest') === 'true';
        if (isGuestFlag) {
          restoreGuest();
        } else {
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const savedLevel = localStorage.getItem('red-racer-3d-unlocked-level');
    if (savedLevel) setUnlockedLevel(parseInt(savedLevel, 10));
  }, []);

  // Handle Authentication
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      if (authMode === 'REGISTER') {
        if (!driverName.trim()) {
          throw new Error('Please enter a Driver Name');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: driverName });
        
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', user.uid);
        const privateRef = doc(db, 'users', user.uid, 'private', 'info');
        
        batch.set(userRef, {
          uid: user.uid,
          displayName: driverName,
          highScore: 0,
          photoURL: '',
          createdAt: serverTimestamp()
        });
        
        batch.set(privateRef, {
          email: email
        });
        
        await batch.commit();
        setNewName(driverName);
        setUserPhotoURL('');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Google Sign In Helper
  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const batch = writeBatch(db);
        batch.set(docRef, {
          uid: user.uid,
          displayName: user.displayName || 'Anonymous Racer',
          highScore: 0,
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp()
        });
        batch.set(doc(db, 'users', user.uid, 'private', 'info'), {
          email: user.email || ''
        });
        await batch.commit();
        setUserPhotoURL(user.photoURL || '');
      } else {
        const data = docSnap.data();
        setUserPhotoURL(data.photoURL || '');
      }
      setDriverName(user.displayName || 'Anonymous Racer');
      setNewName(user.displayName || 'Anonymous Racer');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Google Authentication failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Guest Play Handler — supports anonymous auth flow, or offline guest mock fallback
  const handleGuestPlay = async () => {
    setAuthError('');
    setAuthSubmitting(true);
    localStorage.setItem('red-racer-3d-is-guest', 'true');
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      const guestUid = user.uid;
      const guestName = localStorage.getItem('red-racer-3d-guest-name') || 'Guest_' + guestUid.substring(0, 4);
      const guestPhoto = localStorage.getItem('red-racer-3d-guest-photo') || 'preset:neon_red';
      
      localStorage.setItem('red-racer-3d-guest-uid', guestUid);
      localStorage.setItem('red-racer-3d-guest-name', guestName);
      localStorage.setItem('red-racer-3d-guest-photo', guestPhoto);
      
      setCurrentUser(user);
      setDriverName(guestName);
      setNewName(guestName);
      setUserPhotoURL(guestPhoto);
    } catch (err: any) {
      console.warn('Firebase Anonymous Auth failed or is disabled. Falling back to offline guest session:', err);
      // Fallback: local guest mock user
      const guestUid = localStorage.getItem('red-racer-3d-guest-uid') || 'guest_' + Math.floor(100000 + Math.random() * 900000);
      const guestName = localStorage.getItem('red-racer-3d-guest-name') || 'Guest Racer';
      const guestPhoto = localStorage.getItem('red-racer-3d-guest-photo') || 'preset:neon_red';
      
      localStorage.setItem('red-racer-3d-guest-uid', guestUid);
      localStorage.setItem('red-racer-3d-guest-name', guestName);
      localStorage.setItem('red-racer-3d-guest-photo', guestPhoto);

      const guestUser = {
        uid: guestUid,
        displayName: guestName,
        email: 'guest@racer.local',
        photoURL: guestPhoto,
        emailVerified: false,
        isAnonymous: true,
        metadata: {},
        providerData: [],
        delete: async () => {},
        getIdToken: async () => '',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
        phoneNumber: null,
      } as unknown as FirebaseUser;
      
      setCurrentUser(guestUser);
      setDriverName(guestName);
      setNewName(guestName);
      setUserPhotoURL(guestPhoto);
      
      // Load offline highscore if any exists
      const localHS = localStorage.getItem('red-racer-3d-highscore');
      if (localHS) setHighScore(parseInt(localHS, 10));
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Update profile name
  const handleUpdateName = async () => {
    if (!newName.trim() || !currentUser) return;
    try {
      const isMockGuest = currentUser.uid.startsWith('guest_') || currentUser.isAnonymous;
      if (!isMockGuest) {
        await updateProfile(currentUser, { displayName: newName });
        await setDoc(doc(db, 'users', currentUser.uid), {
          displayName: newName
        }, { merge: true });
        fetchLeaderboard();
      } else {
        localStorage.setItem('red-racer-3d-guest-name', newName);
      }
      setDriverName(newName);
      setEditingName(false);
    } catch (err) {
      console.error(err);
    }
  };

  const [avatarError, setAvatarError] = useState('');

  // Handle Preset Avatar Selection
  const handleSelectPreset = async (presetId: string) => {
    if (!currentUser) return;
    const val = `preset:${presetId}`;
    setAvatarError('');
    try {
      const isMockGuest = currentUser.uid.startsWith('guest_') || currentUser.isAnonymous;
      if (!isMockGuest) {
        setAvatarUploading(true);
        await updateProfile(currentUser, { photoURL: val });
        await setDoc(doc(db, 'users', currentUser.uid), {
          photoURL: val
        }, { merge: true });
        fetchLeaderboard();
      } else {
        localStorage.setItem('red-racer-3d-guest-photo', val);
      }
      setUserPhotoURL(val);
    } catch (err: any) {
      console.error(err);
      setAvatarError(err.message || 'Failed to update preset avatar');
    } finally {
      if (avatarUploading) setAvatarUploading(false);
    }
  };

  // Handle Custom Image Base64 Upload
  const handleCustomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setAvatarError('');

    // Check size limit: image should be compressed/reasonable, say <= 500KB
    if (file.size > 500 * 1024) {
      setAvatarError("Avatar image too large! Maximum limit is 500KB. Try a smaller/compressed image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      if (!base64String) return;

      try {
        setAvatarUploading(true);
        const isMockGuest = currentUser.uid.startsWith('guest_') || currentUser.isAnonymous;
        if (!isMockGuest) {
          await updateProfile(currentUser, { photoURL: base64String });
          await setDoc(doc(db, 'users', currentUser.uid), {
            photoURL: base64String
          }, { merge: true });
          fetchLeaderboard();
        } else {
          localStorage.setItem('red-racer-3d-guest-photo', base64String);
        }
        setUserPhotoURL(base64String);
      } catch (err: any) {
        console.error(err);
        setAvatarError(err.message || 'Failed to upload custom avatar');
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      localStorage.removeItem('red-racer-3d-is-guest');
      localStorage.removeItem('red-racer-3d-guest-uid');
      localStorage.removeItem('red-racer-3d-guest-name');
      localStorage.removeItem('red-racer-3d-guest-photo');
      await signOut(auth);
      setCurrentUser(null);
      setGameState('MENU');
    } catch (err) {
      console.error(err);
    }
  };

  const startGame = (levelOverride?: number) => {
    const levelToStart = levelOverride || selectedLevel;
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const car = CARS[selectedCar];
    
    const initialPlayers: PlayerState[] = Array.from({ length: playerCount }).map((_, i) => ({
      lane: i === 0 ? 1 : 2,
      score: 0,
      lives: gameMode === 'SURVIVAL' ? 3 : 1,
      distance: 0,
      car: selectedCar,
      isDead: false
    }));

    if (levelOverride) setSelectedLevel(levelOverride);

    setWeather('CLEAR');
    setWeatherAlert(null);
    setPlayers(initialPlayers);
    setGameState('PLAYING');
    setObstacles([]);
    setSpeed(settings.initialSpeed * car.speed);
    speedRef.current = settings.initialSpeed * car.speed;
    scoreRef.current = 0;
    lastMilestoneRef.current = 0;
    lastSpawnTime.current = Date.now();
    startTimeRef.current = Date.now();
    setRaceTime(0);
    setIsInvincible(false);
    
    // Play warm engine starter/booster sound
    sound.playBoosterSound();
  };

  const victory = useCallback(async () => {
    setGameState('VICTORY');
    const finalTime = (Date.now() - startTimeRef.current) / 1000;
    setRaceTime(finalTime);

    if (gameMode === 'LEVELS' && selectedLevel === unlockedLevel && unlockedLevel < 10) {
      const nextLevel = unlockedLevel + 1;
      setUnlockedLevel(nextLevel);
      localStorage.setItem('red-racer-3d-unlocked-level', nextLevel.toString());
    }

    const currentScore = Math.floor(scoreRef.current / 10);
    if (currentScore > highScore && currentUser) {
      setHighScore(currentScore);
      localStorage.setItem('red-racer-3d-highscore', currentScore.toString());
      
      const isMockGuest = currentUser.uid.startsWith('guest_') || currentUser.isAnonymous;
      if (!isMockGuest) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            highScore: currentScore
          }, { merge: true });

          const scoreId = `${currentUser.uid}_${Date.now()}`;
          await setDoc(doc(db, 'scores', scoreId), {
            uid: currentUser.uid,
            displayName: driverName || 'Anonymous Driver',
            score: currentScore,
            level: selectedLevel,
            mode: gameMode,
            photoURL: userPhotoURL || '',
            timestamp: serverTimestamp()
          });
          fetchLeaderboard();
        } catch (err) {
          console.warn('Could not save high score to server:', err);
        }
      }
    }
  }, [gameMode, selectedLevel, unlockedLevel, highScore, currentUser, driverName, userPhotoURL]);

  const gameOver = useCallback(async () => {
    setGameState('GAMEOVER');
    const currentScore = Math.floor(scoreRef.current / 10);
    if (currentScore > highScore && currentUser) {
      setHighScore(currentScore);
      localStorage.setItem('red-racer-3d-highscore', currentScore.toString());
      
      const isMockGuest = currentUser.uid.startsWith('guest_') || currentUser.isAnonymous;
      if (!isMockGuest) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            highScore: currentScore
          }, { merge: true });

          const scoreId = `${currentUser.uid}_${Date.now()}`;
          await setDoc(doc(db, 'scores', scoreId), {
            uid: currentUser.uid,
            displayName: driverName || 'Anonymous Driver',
            score: currentScore,
            level: selectedLevel,
            mode: gameMode,
            photoURL: userPhotoURL || '',
            timestamp: serverTimestamp()
          });
          fetchLeaderboard();
        } catch (err) {
          console.warn('Could not save gameover high score to server:', err);
        }
      }
    }
  }, [highScore, currentUser, driverName, selectedLevel, gameMode, userPhotoURL]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameState === 'PLAYING') {
          setGameState('PAUSED');
          setIsAccelerating(false);
          setIsBraking(false);
        } else if (gameState === 'PAUSED') {
          setGameState('PLAYING');
        }
        return;
      }

      if (gameState !== 'PLAYING') return;

      // Player 1: Arrows
      if (e.key === 'ArrowLeft') {
        setPlayers(prev => prev.map((p, i) => i === 0 ? { ...p, lane: Math.max(0, p.lane - 1) } : p));
      }
      if (e.key === 'ArrowRight') {
        setPlayers(prev => prev.map((p, i) => i === 0 ? { ...p, lane: Math.min(2, p.lane + 1) } : p));
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setIsAccelerating(true);
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setIsBraking(true);
      }

      // Player 2: WASD
      if (playerCount === 2) {
        if (e.key === 'a' || e.key === 'A') {
          setPlayers(prev => prev.map((p, i) => i === 1 ? { ...p, lane: Math.max(0, p.lane - 1) } : p));
        }
        if (e.key === 'd' || e.key === 'D') {
          setPlayers(prev => prev.map((p, i) => i === 1 ? { ...p, lane: Math.min(2, p.lane + 1) } : p));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setIsAccelerating(false);
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setIsBraking(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, playerCount]);

  // Game Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const settings = DIFFICULTY_SETTINGS[difficulty];
    const car = CARS[selectedCar];
    
    const update = () => {
      const now = Date.now();

      // Update score and speed
      scoreRef.current += 1;
      const currentScore = Math.floor(scoreRef.current / 10);
      
      if (gameMode === 'TIME_TRIAL' && currentScore >= 1000) {
        victory();
        return;
      }

      if (gameMode === 'LEVELS' && currentScore >= GAME_LEVELS[selectedLevel - 1].target) {
        victory();
        return;
      }

      let targetSpeed = speedRef.current;
      if (isAcceleratingRef.current) {
        // Active speed boost / acceleration ("spired" system)
        targetSpeed = Math.min(3.2, targetSpeed + 0.03 * car.acceleration);
      } else if (isBrakingRef.current) {
        // Active brake system ("brak" system)
        targetSpeed = Math.max(0.12, targetSpeed - 0.05);
      } else {
        // Natural speed progression or return to standard difficulty cruising speed
        const cruiseSpeed = settings.initialSpeed * car.speed + 0.8;
        if (targetSpeed < cruiseSpeed) {
          targetSpeed = Math.min(cruiseSpeed, targetSpeed + settings.speedIncrement * car.acceleration);
        } else if (targetSpeed > cruiseSpeed) {
          // Slow decay back down to cruising speed
          targetSpeed = Math.max(cruiseSpeed, targetSpeed - 0.015);
        }
      }
      speedRef.current = targetSpeed;
      setSpeed(targetSpeed);

      // Synthesize dynamic engine roar pitch and volume
      const engineSpeedRatio = Math.min(1.0, (targetSpeed - 0.12) / 3.08);
      sound.setAccelerating(isAcceleratingRef.current, engineSpeedRatio);

      // Milestone / checkpoint coin pings
      if (currentScore > 0 && currentScore % 100 === 0 && currentScore !== lastMilestoneRef.current) {
        sound.playCoinSound();
        lastMilestoneRef.current = currentScore;
      }

      // Spawn obstacles
      if (now - lastSpawnTime.current > settings.spawnInterval / speedRef.current) {
        const newObs: ObstacleData = {
          id: now,
          lane: Math.floor(Math.random() * 3),
          z: -60,
          color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 4)]
        };
        setObstacles(prev => [...prev, newObs]);
        lastSpawnTime.current = now;
      }

      // Move and collide
      setObstacles(prev => {
        const next = prev
          .map(obs => ({ ...obs, z: obs.z + speedRef.current * 2 }))
          .filter(obs => obs.z < 15);

        // Check collisions for each player
        setPlayers(currentPlayers => {
          let allDead = true;
          const updatedPlayers = currentPlayers.map(p => {
            if (p.isDead) return p;

            const collision = next.find(obs => 
              obs.lane === p.lane && 
              obs.z > 2 && 
              obs.z < 8
            );

            if (collision && !isInvincible) {
              sound.playCollisionSound();
              const newLives = p.lives - 1;
              if (newLives <= 0) {
                return { ...p, lives: 0, isDead: true };
              }
              
              // Trigger invincibility
              setIsInvincible(true);
              setTimeout(() => setIsInvincible(false), 1500);
              
              return { ...p, lives: newLives };
            }
            
            allDead = false;
            return { ...p, score: currentScore };
          });

          if (allDead) gameOver();
          return updatedPlayers;
        });

        return next;
      });

      gameLoopRef.current = requestAnimationFrame(update);
    };

    gameLoopRef.current = requestAnimationFrame(update);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, gameOver, difficulty, selectedCar, gameMode]);

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden font-sans text-white">
      {/* Weather Alert Overlay banner */}
      <AnimatePresence>
        {weatherAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/95 border-2 border-amber-500/50 hover:border-amber-500 text-amber-200 font-display font-medium text-center px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.25)] backdrop-blur-md pointer-events-auto flex items-center justify-center gap-3 w-[90%] max-w-lg"
          >
            <div className="flex-1 text-xs md:text-sm uppercase font-extrabold tracking-wide">
              {weatherAlert}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UI Overlay: HUD */}
      <div className="absolute top-0 left-0 w-full p-8 z-10 pointer-events-none flex justify-between items-start">
        <div className="pointer-events-auto flex flex-col gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tighter text-red-500 italic">RACER CAR</h1>
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest mt-1">
              <Map size={12} />
              <span>{TRACKS[selectedTrack].label}</span>
              <span className="mx-1 opacity-30">|</span>
              <Settings size={12} />
              <span>{DIFFICULTY_SETTINGS[difficulty].label}</span>
              <span className="mx-1 opacity-30">|</span>
              <button 
                onClick={() => {
                  const muted = sound.toggleMute();
                  setIsSoundMuted(muted);
                }}
                className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 active:bg-white/15 border border-white/5 hover:border-white/20 hover:text-white transition-all cursor-pointer rounded-full"
                title={isSoundMuted ? "Unmute Sound" : "Mute Sound"}
              >
                {isSoundMuted ? <VolumeX size={11} className="text-rose-500" /> : <Volume2 size={11} className="text-emerald-400" />}
                <span className={isSoundMuted ? "text-rose-500 font-bold" : "text-emerald-400 font-bold"}>
                  {isSoundMuted ? "MUTED" : "SOUND ON"}
                </span>
              </button>
            </div>
          </div>
          
          {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
            <div className="flex items-center gap-2 mt-1 pointer-events-auto">
              <button 
                onClick={() => setGameState(gameState === 'PLAYING' ? 'PAUSED' : 'PLAYING')}
                className="flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-zinc-800/80 text-white text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/10 transition-all cursor-pointer shadow-md select-none"
                title={gameState === 'PLAYING' ? "Pause Game [Esc]" : "Resume Game [Esc]"}
              >
                {gameState === 'PLAYING' ? (
                  <>
                    <span className="w-2.5 h-2.5 flex gap-0.5 justify-center items-center">
                      <span className="w-0.5 h-2.5 bg-zinc-300" />
                      <span className="w-0.5 h-2.5 bg-zinc-300" />
                    </span>
                    <span>PAUSE GAME</span>
                  </>
                ) : (
                  <>
                    <Play size={10} className="text-emerald-400 fill-emerald-400 animate-pulse" />
                    <span className="text-emerald-400">RESUME GAME</span>
                  </>
                )}
              </button>
              <button 
                onClick={() => {
                  sound.setAccelerating(false, 0);
                  setGameState('MENU');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-red-650/40 text-white text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/10 transition-all cursor-pointer shadow-md"
              >
                <Home size={12} />
                <span>Quit to Menu</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-8 pointer-events-auto">
          {gameMode === 'LEVELS' && (
            <div className="text-right">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Target</p>
              <div className="text-4xl font-display font-bold text-emerald-500">
                {GAME_LEVELS[selectedLevel - 1].target}m
              </div>
            </div>
          )}
          {players.map((p, i) => (
            <div key={i} className={`text-right tabular-nums ${p.isDead ? 'opacity-30 grayscale' : ''}`}>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
                Player {i + 1} {p.isDead && '(WRECKED)'}
              </p>
              <div className="text-4xl font-display font-bold">
                {Math.floor(scoreRef.current / 10)}
              </div>
              {gameMode === 'SURVIVAL' && (
                <div className="flex justify-end gap-1 mt-1">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Heart 
                      key={j} 
                      size={12} 
                      className={j < p.lives ? 'text-red-500 fill-red-500' : 'text-zinc-800'} 
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* High Speed Motion Blur & Speedlines Effects */}
      <SpeedLines speed={speed} isActive={gameState === 'PLAYING'} />

      {/* 3D Scene */}
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <PerspectiveCamera makeDefault position={[0, 5, 12]} fov={50} />
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        
        <ambientLight intensity={weather === 'RAIN' ? 0.2 : weather === 'FOG' ? 0.25 : (selectedTrack === 'DESERT' ? 0.8 : 0.4)} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={weather === 'RAIN' ? 0.4 : weather === 'FOG' ? 0.3 : (selectedTrack === 'DESERT' ? 1.5 : 0.5)} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-10, 5, -10]} intensity={weather === 'RAIN' ? 0.2 : 0.5} color={TRACKS[selectedTrack].emissive} />
        
        {selectedTrack === 'NEON' ? (
          <Stars radius={100} depth={50} count={weather === 'FOG' ? 400 : 5000} factor={4} saturation={0} fade speed={1} />
        ) : (
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[100, 32, 32]} />
            <meshBasicMaterial color={weather === 'RAIN' ? '#1c2541' : weather === 'FOG' ? '#4a5568' : TRACKS[selectedTrack].sky} side={THREE.BackSide} />
          </mesh>
        )}
        
        <Suspense fallback={null}>
          <Road speed={gameState === 'PLAYING' ? speed : 0.1} trackType={selectedTrack} />
          {weather === 'RAIN' && <RainEffect speed={gameState === 'PLAYING' ? speed : 0.02} />}
          {players.map((p, i) => (
            !p.isDead && (
              <PlayerCar 
                key={i} 
                lane={p.lane} 
                carType={selectedCar} 
                isPlayer2={i === 1} 
                isInvincible={isInvincible} 
                isBoosting={!i ? isAccelerating : false} 
                isBraking={!i ? isBraking : false} 
                weather={weather}
              />
            )
          ))}
          {obstacles.map(obs => (
            <Obstacle key={obs.id} data={obs} />
          ))}
          <Environment preset={TRACKS[selectedTrack].preset} />
        </Suspense>

        <fog attach="fog" args={
          weather === 'FOG' 
            ? ['#4a5568', 4, 18] 
            : weather === 'RAIN' 
              ? ['#1c2541', 8, 40] 
              : [TRACKS[selectedTrack].bg, 10, 60]
        } />
      </Canvas>

      {/* Overlays */}
      <AnimatePresence>
        {/* Auth Loading Guard */}
        {authLoading && (
          <motion.div 
            initial={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-8"
          >
            <RefreshCw className="w-12 h-12 text-red-500 animate-spin mb-4" />
            <p className="text-sm font-mono text-zinc-400 tracking-widest uppercase">Initializing Racer Profile...</p>
          </motion.div>
        )}

        {/* Auth Required Form (Login / Registration System) */}
        {!authLoading && !currentUser && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-black/95 flex flex-col items-center justify-center p-8 backdrop-blur-md overflow-y-auto"
          >
            <div className="w-full max-w-md bg-zinc-900/80 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-red-600 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.3)] flex items-center justify-center mx-auto mb-4">
                  <Clock size={40} className="text-white animate-[spin_20s_linear_infinite]" />
                </div>
                <h2 className="text-3xl font-display font-bold italic tracking-tighter">RACER LINKED ACCOUNT</h2>
                <p className="text-zinc-500 font-mono text-[10px] tracking-[0.2em] mt-1">SECURE ACCESS PORTAL</p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'REGISTER' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Driver Display Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-3.5 text-zinc-500" />
                      <input 
                        type="text"
                        required
                        placeholder="e.g. SpeedDemon"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-white/5 rounded-xl font-bold focus:border-red-500 focus:outline-none text-sm transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-3.5 text-zinc-500" />
                    <input 
                      type="email"
                      required
                      placeholder="driver@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-white/5 rounded-xl font-bold focus:border-red-500 focus:outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-3.5 text-zinc-500" />
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-white/5 rounded-xl font-bold focus:border-red-500 focus:outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                {authError && (
                  <div className="p-3.5 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl space-y-2">
                    <p className="font-bold flex items-center gap-1.5 text-red-400">
                      <ShieldAlert size={14} />
                      {authError.includes('operation-not-allowed') 
                        ? 'Email/Password Sign-In Disabled' 
                        : 'Authentication Error'}
                    </p>
                    {authError.includes('operation-not-allowed') ? (
                      <div className="text-[11px] leading-relaxed font-normal text-zinc-400 text-left space-y-1.5 p-1">
                        <p>To enable email registration:</p>
                        <ol className="list-decimal pl-4 space-y-1 text-zinc-300">
                          <li>Open your <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-red-400 hover:underline">Firebase Console</a>.</li>
                          <li>Go to <strong>Authentication</strong> &gt; <strong>Sign-in method</strong>.</li>
                          <li>Click <strong>Add new provider</strong> and enable <strong>Email/Password</strong>.</li>
                        </ol>
                        <p className="mt-1.5 text-emerald-400 font-medium font-mono text-[9px] uppercase tracking-wider">💡 Or sign in with Google below to skip setup!</p>
                      </div>
                    ) : (
                      <p className="text-[11px] leading-relaxed text-zinc-400">{authError}</p>
                    )}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 font-bold rounded-xl transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 text-sm text-white disabled:opacity-50 cursor-pointer"
                >
                  {authSubmitting ? (
                    <RefreshCw className="animate-spin w-4 h-4" />
                  ) : authMode === 'LOGIN' ? (
                    'SIGN IN RACER'
                  ) : (
                    'REGISTER NEW DRIVER'
                  )}
                </button>
              </form>

              {/* Alternative Auth Provider */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative px-3 bg-zinc-900/90 text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none">
                  Or Continue With
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button 
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={authSubmitting}
                  className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-900 text-white font-semibold rounded-xl border border-white/10 hover:border-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2.5 text-sm cursor-pointer shadow-lg group"
                >
                  <Globe size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
                  <span>Sign In with Google (Instant Access)</span>
                </button>

                <button 
                  type="button"
                  onClick={handleGuestPlay}
                  disabled={authSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-red-950/40 to-zinc-900/60 hover:from-red-900/40 hover:to-zinc-850/80 border border-red-500/25 hover:border-red-500/50 text-red-100 font-bold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <Play size={16} className="text-red-500 animate-pulse" />
                  <span>PLAY AS GUEST (SKIP ACCOUNT)</span>
                </button>
              </div>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => {
                    setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
                    setAuthError('');
                  }}
                  className="text-xs text-zinc-400 hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
                >
                  {authMode === 'LOGIN' ? "Need a driver profile? Create account" : "Back to sign in portal"}
                </button>
              </div>

              {/* Instructions Panel */}
              <div className="mt-8 pt-6 border-t border-white/5 text-[10px] text-zinc-500 text-center leading-relaxed">
                💡 <strong>Admin Note:</strong> Please ensure <strong>Email/Password</strong> authentication provider is enabled under project Oval Repeater in the Firebase Console before attempt.
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Menu Dashboard (Visible when auth complete) */}
        {!authLoading && currentUser && gameState === 'MENU' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-sm overflow-y-auto"
          >
            {/* Top Bar for Profile Controls */}
            <motion.div 
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-4xl flex flex-wrap justify-between items-center gap-4 mb-8"
            >
              <div className="flex items-center gap-3 bg-zinc-900/60 border border-white/5 p-3 rounded-2xl hover:border-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)] transition-all duration-300">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAvatarModalOpen(true)}
                  className="relative group cursor-pointer"
                  title="Modify Driver Profile Avatar"
                >
                  <RacerAvatar photoURL={userPhotoURL} className="w-12 h-12" />
                  <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera size={14} className="animate-pulse" />
                  </div>
                </motion.div>
                <div>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)} 
                        className="bg-zinc-950 border border-white/10 px-2 py-0.5 rounded text-xs focus:outline-none"
                      />
                      <button onClick={handleUpdateName} className="text-emerald-500 text-[10px] font-mono hover:underline">SAVE</button>
                      <button onClick={() => setEditingName(false)} className="text-zinc-500 text-[10px] font-mono hover:underline">CANCEL</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm tracking-tight">{driverName}</p>
                      <button onClick={() => setEditingName(true)} className="p-1 hover:text-red-500 text-zinc-500 transition-colors">
                        <Edit2 size={12} />
                      </button>
                    </div>
                  )}
                  <p className="text-[9px] font-mono text-zinc-500">{currentUser.email}</p>
                </div>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.03, x: 2 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/60 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 text-xs font-semibold rounded-2xl border border-white/5 hover:border-red-900/40 transition-all cursor-pointer shadow-md"
              >
                <LogOut size={14} />
                Sign Out
              </motion.button>
            </motion.div>

            <motion.div 
              animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="text-center mb-8"
            >
              <div className="w-24 h-24 bg-zinc-900 border border-red-500/30 rounded-3xl shadow-[0_0_60px_rgba(239,68,68,0.4)] flex items-center justify-center mx-auto mb-4 relative hover:scale-[1.05] hover:shadow-[0_0_80px_rgba(239,68,68,0.6)] transition-all overflow-hidden group">
                <div className="absolute inset-0 bg-red-600/10 group-hover:bg-red-600/25 transition-colors pointer-events-none" />
                <NeonClockSystem size={72} />
              </div>
              <h2 className="text-5xl font-display font-bold italic tracking-tighter">RACER CAR</h2>
              <p className="text-zinc-500 font-mono text-xs tracking-[0.4em] mt-1">ULTIMATE NEON EDITION</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
              {/* Play Menu Side */}
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setGameState('CONFIG')}
                  className="group w-full py-6 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-2xl shadow-red-900/40"
                >
                  <Play size={24} fill="currentColor" />
                  START GAME
                </button>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 text-center flex flex-col justify-center">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">My High Score</p>
                    <p className="text-2xl font-display font-bold text-red-500">{highScore}</p>
                  </div>
                  <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 text-center flex flex-col justify-center">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-xs font-mono font-bold text-emerald-400 flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      ONLINE PROFILE
                    </p>
                  </div>
                </div>
              </div>

              {/* Leaderboard View Side (Dynamic syncing) */}
              <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                      <Trophy size={14} className="text-amber-500" />
                      Global High Scores
                    </h3>
                    <button 
                      onClick={fetchLeaderboard} 
                      className="p-1 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors"
                      title="Reload Leaderboard"
                    >
                      <RefreshCw size={12} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {leaderboard.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic py-2 text-center">No scores yet. Be the first!</p>
                    ) : (
                      leaderboard.map((item, index) => (
                        <div key={item.id || index} className="flex justify-between items-center bg-zinc-950/40 border border-white/5 p-1.5 pr-3 rounded-xl text-xs">
                          <span className="flex items-center gap-2">
                            <span className={`w-5 h-5 font-bold font-mono rounded-lg flex items-center justify-center text-[10px] ${
                              index === 0 ? 'bg-amber-500/20 text-amber-400' :
                              index === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                              index === 2 ? 'bg-amber-700/20 text-amber-600' :
                              'bg-zinc-800/20 text-zinc-500'
                            }`}>
                              #{index + 1}
                            </span>
                            <RacerAvatar photoURL={item.photoURL} className="w-6 h-6 rounded-lg" />
                            <span className="font-semibold text-zinc-200 truncate max-w-[120px]">{item.displayName}</span>
                          </span>
                          <span className="font-mono text-red-400 font-bold">{item.score}m</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <p className="text-[9px] text-zinc-500 text-center mt-3 tracking-wider uppercase font-mono">Cross-platform rankings powered by Firestore</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Driver Avatar Select & Upload Modal */}
        {avatarModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative text-white"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-display font-bold italic tracking-tight">MODIFY DRIVER AVATAR</h3>
                  <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">Select Preset or Upload Custom Image</p>
                </div>
                <button 
                  onClick={() => {
                    setAvatarModalOpen(false);
                    setAvatarError('');
                  }}
                  className="p-1 px-3 bg-zinc-950 border border-white/5 font-mono text-[10px] text-zinc-500 hover:text-white rounded-lg hover:border-red-500/40 transition-colors cursor-pointer"
                >
                  ESC
                </button>
              </div>

              {/* Current Avatar State */}
              <div className="flex items-center gap-4 bg-zinc-950/60 p-4 rounded-2xl border border-white/5 mb-6">
                <RacerAvatar photoURL={userPhotoURL} className="w-16 h-16" />
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Active Persona</p>
                  <p className="text-sm font-bold text-zinc-100">{driverName}</p>
                  <p className="text-[10px] font-mono text-zinc-400 mt-0.5">{userPhotoURL ? (userPhotoURL.startsWith('preset:') ? 'Pre-loaded Neon Driver Model' : 'Custom Base64 Signature') : 'Default Driver Uniform'}</p>
                </div>
              </div>

              {/* Error indicator */}
              {avatarError && (
                <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-400 text-xs rounded-xl text-center font-semibold text-[11px] leading-relaxed">
                  ⚠️ {avatarError}
                </div>
              )}

              {/* Preset Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Neon Engine Presets</label>
                <div className="grid grid-cols-5 gap-2.5">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      disabled={avatarUploading}
                      className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center text-2xl transition-all cursor-pointer ${preset.style} ${
                        userPhotoURL === `preset:${preset.id}` 
                          ? 'ring-2 ring-red-500 scale-[1.05] border-white/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                          : 'border border-white/5 hover:scale-[1.03] opacity-80 hover:opacity-100'
                      }`}
                      title={preset.label}
                    >
                      <span>{preset.fallbackChar}</span>
                      {userPhotoURL === `preset:${preset.id}` && (
                        <span className="absolute -bottom-1 bg-red-500 text-[8px] font-mono font-bold tracking-tighter px-1 rounded uppercase">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload custom option */}
              <div className="mt-6 pt-5 border-t border-white/5 space-y-3">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Upload Custom Race Decal</label>
                <div className="relative">
                  <input 
                    type="file" 
                    id="avatar-file-upload" 
                    accept="image/*"
                    onChange={handleCustomImageUpload}
                    disabled={avatarUploading}
                    className="hidden"
                  />
                  <label 
                    htmlFor="avatar-file-upload"
                    className="w-full py-4 bg-zinc-950 hover:bg-zinc-900 border border-white/5 hover:border-red-500/20 text-zinc-400 hover:text-white rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all text-xs group"
                  >
                    {avatarUploading ? (
                      <RefreshCw className="animate-spin w-5 h-5 text-red-500" />
                    ) : (
                      <Upload size={18} className="text-zinc-500 group-hover:text-red-500 transition-colors" />
                    )}
                    <span className="font-semibold">{avatarUploading ? 'Uploading & Rendering Image...' : 'Inject Custom PNG / JPG Decal'}</span>
                    <span className="text-[9px] text-zinc-500 font-mono">Compressed image, maximum size 500KB</span>
                  </label>
                </div>
              </div>

              {/* Close helper */}
              <button
                onClick={() => {
                  setAvatarModalOpen(false);
                  setAvatarError('');
                }}
                className="w-full mt-6 py-3 bg-zinc-950 hover:bg-zinc-900 border border-white/5 text-zinc-400 font-semibold rounded-2xl hover:text-white transition-all text-sm cursor-pointer"
              >
                Apply Changes
              </button>
            </motion.div>
          </motion.div>
        )}

        {gameState === 'CONFIG' && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }}
            className="absolute inset-0 z-20 bg-black/95 flex flex-col p-12 overflow-y-auto"
          >
            <div className="max-w-4xl mx-auto w-full">
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-4xl font-display font-bold italic">RACE CONFIGURATION</h2>
                <button onClick={() => setGameState('MENU')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Home size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Left Column: Players & Mode */}
                <div className="space-y-8">
                  <section>
                    <label className="text-zinc-500 text-xs font-mono uppercase tracking-[0.3em] block mb-4">Number of Players</label>
                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2].map(n => (
                        <button 
                          key={n} onClick={() => setPlayerCount(n as 1 | 2)}
                          className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-2 ${playerCount === n ? 'bg-red-600 border-red-400' : 'bg-zinc-900 border-white/5 hover:border-white/10'}`}
                        >
                          <Users size={24} />
                          <span className="font-bold">{n} PLAYER{n > 1 ? 'S' : ''}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <label className="text-zinc-500 text-xs font-mono uppercase tracking-[0.3em] block mb-4">Game Mode</label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'ENDLESS', label: 'Endless', icon: Zap, desc: 'Race until you crash.' },
                        { id: 'LEVELS', label: 'Campaign', icon: Target, desc: 'Complete 10 challenging levels.' },
                        { id: 'SURVIVAL', label: 'Survival', icon: Shield, desc: '3 Lives. How far can you go?' },
                        { id: 'TIME_TRIAL', label: 'Time Trial', icon: Clock, desc: 'Reach 1000m as fast as possible.' }
                      ].map(m => (
                        <button 
                          key={m.id} onClick={() => setGameMode(m.id as GameMode)}
                          className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${gameMode === m.id ? 'bg-zinc-800 border-white/20' : 'bg-zinc-900 border-white/5'}`}
                        >
                          <div className={`p-2 rounded-lg ${gameMode === m.id ? 'bg-red-600' : 'bg-zinc-800'}`}><m.icon size={20} /></div>
                          <div className="text-left">
                            <p className="font-bold">{m.label}</p>
                            <p className="text-[10px] text-zinc-500">{m.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  {gameMode === 'LEVELS' && (
                    <section>
                      <label className="text-zinc-500 text-xs font-mono uppercase tracking-[0.3em] block mb-4">Select Level</label>
                      <div className="grid grid-cols-5 gap-2">
                        {GAME_LEVELS.map(l => (
                          <button 
                            key={l.id} 
                            disabled={l.id > unlockedLevel}
                            onClick={() => setSelectedLevel(l.id)}
                            className={`py-3 rounded-xl border font-bold text-xs transition-all ${
                              selectedLevel === l.id 
                                ? 'bg-white text-black border-white' 
                                : l.id <= unlockedLevel 
                                  ? 'bg-zinc-900 text-white border-white/10 hover:border-white/20' 
                                  : 'bg-zinc-950 text-zinc-800 border-white/5 cursor-not-allowed'
                            }`}
                          >
                            {l.id}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  <section>
                    <label className="text-zinc-500 text-xs font-mono uppercase tracking-[0.3em] block mb-4">Difficulty</label>
                    <div className="flex gap-2">
                      {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map(d => (
                        <button 
                          key={d} onClick={() => setDifficulty(d)}
                          className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all ${difficulty === d ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}
                        >
                          {DIFFICULTY_SETTINGS[d].label}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Right Column: Car & Track */}
                <div className="space-y-8">
                  <section>
                    <label className="text-zinc-500 text-xs font-mono uppercase tracking-[0.3em] block mb-4">Select Your Ride</label>
                    <div className="space-y-3">
                      {(Object.keys(CARS) as CarType[]).map(c => (
                        <button 
                          key={c} onClick={() => setSelectedCar(c)}
                          className={`w-full p-4 rounded-2xl border transition-all text-left ${selectedCar === c ? 'bg-zinc-800 border-white/20' : 'bg-zinc-900 border-white/5'}`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-bold flex items-center gap-2">
                              <CarIcon size={16} style={{ color: CARS[c].color }} />
                              {CARS[c].label}
                            </p>
                            <div className="flex gap-1">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className={`w-1 h-3 rounded-full ${i < Math.floor(CARS[c].speed * 2) ? 'bg-red-500' : 'bg-zinc-800'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-[10px] text-zinc-500">{CARS[c].description}</p>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <label className="text-zinc-500 text-xs font-mono uppercase tracking-[0.3em] block mb-4">Select Track</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(Object.keys(TRACKS) as TrackType[]).map(t => (
                        <button 
                          key={t} onClick={() => setSelectedTrack(t)}
                          className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selectedTrack === t ? 'bg-zinc-800 border-white/20' : 'bg-zinc-900 border-white/5'}`}
                        >
                          <div className="w-full h-12 rounded-lg" style={{ backgroundColor: TRACKS[t].color }} />
                          <span className="text-[10px] font-bold">{TRACKS[t].label}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setGameState('MENU')}
                      className="flex-1 py-6 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 text-xl border border-white/10"
                    >
                      <ChevronLeft size={24} />
                      BACK
                    </button>
                    <button 
                      onClick={() => startGame()}
                      className="flex-[2] py-6 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-all shadow-2xl shadow-red-900/40 flex items-center justify-center gap-3 text-xl"
                    >
                      <Zap size={24} />
                      LAUNCH RACE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'VICTORY' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-20 bg-emerald-950/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md"
          >
            <Trophy size={100} className="text-yellow-400 mb-6 animate-pulse" />
            <h2 className="text-6xl font-display font-bold text-white mb-4 italic tracking-tighter">MISSION COMPLETE</h2>
            <div className="bg-black/40 rounded-3xl p-8 mb-12 w-full max-w-xs border border-white/10">
              <p className="text-emerald-200 text-xs uppercase tracking-[0.3em] mb-2">Final Time</p>
              <p className="text-7xl font-display font-bold text-white mb-4">{raceTime.toFixed(2)}s</p>
              <p className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 bg-emerald-400/10 py-2 rounded-full uppercase tracking-widest">
                {gameMode === 'LEVELS' ? `Level ${selectedLevel} Cleared` : 'Target Reached: 1000m'}
              </p>
            </div>
            <div className="flex flex-col gap-4 w-full max-w-xs">
              {gameMode === 'LEVELS' && selectedLevel < 10 && (
                <button 
                  onClick={() => startGame(selectedLevel + 1)}
                  className="px-12 py-5 bg-emerald-500 text-white font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-xl"
                >
                  <ChevronRight size={20} />
                  NEXT LEVEL
                </button>
              )}
              <button 
                onClick={() => startGame()}
                className="px-12 py-5 bg-white text-emerald-900 font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-xl"
              >
                <RotateCcw size={20} />
                {gameMode === 'LEVELS' ? 'REPLAY LEVEL' : 'RACE AGAIN'}
              </button>
              <button 
                onClick={() => setGameState('MENU')}
                className="px-12 py-5 bg-black/40 hover:bg-black/60 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 border border-white/10"
              >
                <Home size={20} />
                MAIN MENU
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'GAMEOVER' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-20 bg-red-950/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md"
          >
            <ShieldAlert size={80} className="text-white mb-6 animate-bounce" />
            <h2 className="text-6xl font-display font-bold text-white mb-4 italic tracking-tighter">WRECKED</h2>
            <div className="bg-black/40 rounded-3xl p-8 mb-12 w-full max-w-xs border border-white/10">
              <p className="text-red-200 text-xs uppercase tracking-[0.3em] mb-2">Final Distance</p>
              <p className="text-7xl font-display font-bold text-white mb-4">{Math.floor(scoreRef.current / 10)}</p>
              {scoreRef.current / 10 >= highScore && (
                <p className="text-yellow-400 text-xs font-bold flex items-center justify-center gap-2 bg-yellow-400/10 py-2 rounded-full">
                  <Trophy size={14} /> NEW RECORD SET
                </p>
              )}
            </div>
            <div className="flex flex-col gap-4 w-full max-w-xs">
              <button 
                onClick={() => startGame()}
                className="px-12 py-5 bg-white text-red-900 font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-xl"
              >
                <RotateCcw size={20} />
                RETRY RACE
              </button>
              <button 
                onClick={() => setGameState('MENU')}
                className="px-12 py-5 bg-black/40 hover:bg-black/60 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 border border-white/10"
              >
                <Home size={20} />
                MAIN MENU
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'PAUSED' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-40 bg-zinc-950/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md pointer-events-auto"
          >
            <div className="flex gap-1.5 items-center justify-center text-red-500 mb-2 animate-pulse">
              <span className="w-2.5 h-6 bg-red-500 rounded-sm"></span>
              <span className="w-2.5 h-6 bg-red-500 rounded-sm"></span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-6 italic tracking-tighter uppercase">
              RACE PAUSED
            </h2>

            {/* Session Stats */}
            <div className="bg-black/60 backdrop-blur-sm rounded-3xl p-6 mb-8 w-full max-w-sm border border-white/5 flex flex-col gap-4 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1 text-center">
                    CURRENT SPEED
                  </span>
                  <span className="text-xl font-display font-black text-amber-400">
                    {(speed * 100).toFixed(0)} <span className="text-xs font-mono font-normal text-zinc-400">KM/H</span>
                  </span>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1 text-center">
                    DISTANCE RACED
                  </span>
                  <span className="text-xl font-display font-black text-cyan-400">
                    {Math.floor(scoreRef.current / 10)} <span className="text-xs font-mono font-normal text-zinc-400">M</span>
                  </span>
                </div>
              </div>

              {/* Interactive Audio/Sound Setting */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-left">
                <span className="block text-[9px] font-mono text-zinc-400 uppercase tracking-widest mb-3 text-center">
                  AUDIO & ENGINE SYNTHESIS
                </span>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-zinc-300">SYSTEM AUDIO</span>
                  <button 
                    onClick={() => {
                      const muted = sound.toggleMute();
                      setIsSoundMuted(muted);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 rounded-xl border border-white/10 hover:border-white/20 hover:text-white transition-all cursor-pointer shadow-inner w-fit"
                  >
                    {isSoundMuted ? <VolumeX size={14} className="text-rose-500" /> : <Volume2 size={14} className="text-emerald-400 animate-bounce" />}
                    <span className={`text-[10px] font-mono font-bold uppercase ${isSoundMuted ? "text-rose-500" : "text-emerald-400"}`}>
                      {isSoundMuted ? "MUTED" : "SOUND ON"}
                    </span>
                  </button>
                </div>
                <p className="text-[9px] text-zinc-500 font-mono mt-3 leading-relaxed text-center">
                  Engine roar uses real-time Web Audio API frequency modulation.
                </p>
              </div>
            </div>

            {/* Menu Buttons */}
            <div className="flex flex-col gap-3 w-full max-w-sm">
              <button 
                onClick={() => setGameState('PLAYING')}
                className="w-full py-4 bg-red-650 hover:bg-red-500 text-white font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-red-900/20 cursor-pointer"
              >
                <Play size={18} fill="currentColor" />
                RESUME SESSION
              </button>
              
              <button 
                onClick={() => startGame()}
                className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 border border-white/5 cursor-pointer"
              >
                <RotateCcw size={18} />
                RESTART RACE
              </button>

              <button 
                onClick={() => {
                  sound.setAccelerating(false, 0);
                  setGameState('MENU');
                }}
                className="w-full py-4 bg-black/40 hover:bg-zinc-900 text-zinc-400 hover:text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 border border-white/5 cursor-pointer"
              >
                <Home size={18} />
                QUIT TO MAIN MENU
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Cockpit Dashboard & Tactile On-Screen Controllers */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') ? (
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col md:flex-row items-center gap-4 bg-zinc-950/85 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.9)] select-none max-w-2xl w-[92%] transition-opacity duration-300 ${gameState === 'PAUSED' ? 'opacity-40 pointer-events-none' : ''}`}>
          {/* Steering Cluster */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-center">
            <button
              onClick={() => {
                if (gameState !== 'PLAYING') return;
                setPlayers(prev => prev.map((p, i) => i === 0 ? { ...p, lane: Math.max(0, p.lane - 1) } : p));
              }}
              className="p-4 px-6 bg-zinc-900 active:bg-red-500/20 hover:border-red-500/30 border border-white/5 rounded-2xl flex items-center justify-center gap-1 text-sm font-bold uppercase transition-all tracking-wider text-zinc-300 hover:text-white cursor-pointer group shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              title="Steer Left"
            >
              <ChevronLeft size={20} className="group-active:-translate-x-1.5 transition-transform text-red-500" />
              <span>LEFT</span>
            </button>

            <button
              onClick={() => {
                if (gameState !== 'PLAYING') return;
                setPlayers(prev => prev.map((p, i) => i === 0 ? { ...p, lane: Math.min(2, p.lane + 1) } : p));
              }}
              className="p-4 px-6 bg-zinc-900 active:bg-green-500/20 hover:border-emerald-500/30 border border-white/5 rounded-2xl flex items-center justify-center gap-1 text-sm font-bold uppercase transition-all tracking-wider text-zinc-300 hover:text-white cursor-pointer group shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              title="Steer Right"
            >
              <span>RIGHT</span>
              <ChevronRight size={20} className="group-active:translate-x-1.5 transition-transform text-emerald-500" />
            </button>
          </div>

          {/* Central System HUD Gauge */}
          <div className="flex flex-col items-center justify-center bg-black/50 px-4 py-2.5 rounded-2xl border border-white/5 min-w-[130px] shadow-inner text-center">
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              <Gauge size={11} className={isAccelerating ? 'text-emerald-400 animate-pulse' : isBraking ? 'text-rose-500' : 'text-zinc-500'} />
              <span>DRIVE SYSTEM</span>
            </div>
            <div className={`text-xl font-display font-black tracking-tight transition-colors ${isAccelerating ? 'text-emerald-400' : isBraking ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {(speed * 100).toFixed(0)} <span className="text-[10px] font-mono text-zinc-500 font-normal">KM/H</span>
            </div>
            
            {/* Speed system warning indicator ticker bar */}
            <div className="w-full h-1 bg-zinc-900 rounded-full mt-1.5 overflow-hidden flex">
              <div 
                className={`h-full transition-all duration-100 ${isAccelerating ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : isBraking ? 'bg-red-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, (speed / 3.2) * 100)}%` }}
              />
            </div>
          </div>

          {/* Weather Status Gauge */}
          <div className="flex flex-col items-center justify-center bg-black/50 px-4 py-2.5 rounded-2xl border border-white/5 min-w-[130px] h-[58px] shadow-inner text-center">
            <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              <span>TRACK GRIP</span>
            </div>
            <div className={`text-[11px] font-display font-black tracking-tight transition-colors flex items-center gap-1.5 mt-0.5 ${
              weather === 'RAIN' ? 'text-cyan-400' : weather === 'FOG' ? 'text-zinc-400' : 'text-amber-400'
            }`}>
              {weather === 'RAIN' ? (
                <>
                  <CloudRain size={13} className="text-cyan-400 animate-bounce" />
                  <span>SLIPPERY (40%)</span>
                </>
              ) : weather === 'FOG' ? (
                <>
                  <Cloud size={13} className="text-zinc-400 animate-pulse" />
                  <span>MISTY (75%)</span>
                </>
              ) : (
                <>
                  <Sun size={13} className="text-amber-400" />
                  <span>OPTIMAL (100%)</span>
                </>
              )}
            </div>
            <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider mt-0.5">
              {weather === 'RAIN' ? 'DRENCH ROAD' : weather === 'FOG' ? 'LOW VIS' : 'DRY ASPHALT'}
            </div>
          </div>

          {/* Acceleration & Braking Tactile Cluster */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-center">
            {/* Decelerate / Brak Button */}
            <button
              onMouseDown={() => { if (gameState === 'PLAYING') setIsBraking(true); }}
              onMouseUp={() => setIsBraking(false)}
              onMouseLeave={() => setIsBraking(false)}
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'PLAYING') setIsBraking(true); }}
              onTouchEnd={() => setIsBraking(false)}
              className={`p-4 px-5 border rounded-2xl flex items-center justify-center gap-1.5 text-xs font-bold uppercase transition-all tracking-wider select-none cursor-pointer w-28 text-center ${
                isBraking 
                  ? 'bg-red-600/35 border-red-500 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.4)] scale-95' 
                  : 'bg-zinc-900/90 border-white/5 text-zinc-400 hover:text-red-400 hover:border-red-500/20 active:scale-95'
              }`}
            >
              <ShieldAlert size={14} className={isBraking ? 'animate-bounce' : ''} />
              <span>BRAKE</span>
            </button>

            {/* Accelerate / Spired Boost Button */}
            <button
              onMouseDown={() => { if (gameState === 'PLAYING') setIsAccelerating(true); }}
              onMouseUp={() => setIsAccelerating(false)}
              onMouseLeave={() => setIsAccelerating(false)}
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'PLAYING') setIsAccelerating(true); }}
              onTouchEnd={() => setIsAccelerating(false)}
              className={`p-4 px-5 border rounded-2xl flex items-center justify-center gap-1.5 text-xs font-bold uppercase transition-all tracking-wider select-none cursor-pointer w-28 text-center ${
                isAccelerating 
                  ? 'bg-emerald-600/35 border-emerald-400 text-emerald-100 shadow-[0_0_15px_rgba(52,211,153,0.4)] scale-95' 
                  : 'bg-zinc-900/90 border-white/5 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/20 active:scale-95'
              }`}
            >
              <Zap size={14} className={isAccelerating ? 'animate-pulse text-emerald-400' : ''} />
              <span>BOOST</span>
            </button>
          </div>
        </div>
      ) : (
        /* Regular passive system speed indicator for other screens */
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 text-zinc-500 font-mono text-[10px] uppercase tracking-widest bg-black/50 px-6 py-3 rounded-full border border-white/5 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <Gauge size={14} />
            <span>VELOCITY: {(speed * 100).toFixed(0)} KM/H</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Target size={14} />
            <span>{gameMode}</span>
          </div>
        </div>
      )}
    </div>
  );
}
