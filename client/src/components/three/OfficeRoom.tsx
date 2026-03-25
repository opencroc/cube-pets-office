/**
 * Office Room — Scandinavian Warm Minimalism study room
 * Furniture from Kenney Furniture Kit, arranged as a cozy research workspace
 */
import { useGLTF } from '@react-three/drei';
import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { FURNITURE_MODELS } from '@/lib/assets';
import { useAppStore } from '@/lib/store';
import { useFrame } from '@react-three/fiber';

function FurnitureModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  return (
    <primitive
      object={cloned}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[12, 12]} />
      <meshStandardMaterial color="#D4B896" roughness={0.8} metalness={0} />
    </mesh>
  );
}

function Walls() {
  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 1.5, -3.5]} receiveShadow>
        <boxGeometry args={[10, 3, 0.15]} />
        <meshStandardMaterial color="#FFF5EC" roughness={0.9} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-5, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[7, 3, 0.15]} />
        <meshStandardMaterial color="#FFF0E5" roughness={0.9} />
      </mesh>
    </group>
  );
}

function WindowFrame() {
  return (
    <group position={[-4.9, 1.8, -0.5]}>
      {/* Window frame */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.8, 1.4, 0.08]} />
        <meshStandardMaterial color="#E8DDD0" roughness={0.5} />
      </mesh>
      {/* Glass */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0.02, 0, 0]}>
        <planeGeometry args={[1.6, 1.2]} />
        <meshStandardMaterial
          color="#B8D4E8"
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      {/* Sunlight glow from window */}
      <pointLight position={[0.5, 0, 0]} intensity={0.6} color="#FFF5D4" distance={6} decay={2} />
    </group>
  );
}

function CorkBoard() {
  return (
    <group position={[0, 2.2, -3.4]}>
      {/* Cork board */}
      <mesh>
        <boxGeometry args={[2.5, 1.2, 0.06]} />
        <meshStandardMaterial color="#C4956A" roughness={0.95} />
      </mesh>
      {/* Frame */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[2.6, 1.3, 0.02]} />
        <meshStandardMaterial color="#8B6914" roughness={0.7} />
      </mesh>
      {/* Pinned notes */}
      {[
        { pos: [-0.6, 0.2, 0.05] as [number, number, number], color: '#FFE4B5', rot: 0.05 },
        { pos: [0.3, -0.1, 0.05] as [number, number, number], color: '#E8F5E9', rot: -0.08 },
        { pos: [0.8, 0.3, 0.05] as [number, number, number], color: '#FFF3E0', rot: 0.12 },
        { pos: [-0.2, -0.3, 0.05] as [number, number, number], color: '#E3F2FD', rot: -0.03 },
      ].map((note, i) => (
        <mesh key={i} position={note.pos} rotation={[0, 0, note.rot]}>
          <planeGeometry args={[0.5, 0.4]} />
          <meshStandardMaterial color={note.color} roughness={0.9} />
        </mesh>
      ))}
      {/* Pins */}
      {[[-0.6, 0.35], [0.3, 0.1], [0.8, 0.45], [-0.2, -0.1]].map((p, i) => (
        <mesh key={`pin-${i}`} position={[p[0], p[1], 0.08]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color={['#FF5252', '#4CAF50', '#FF9800', '#2196F3'][i]} />
        </mesh>
      ))}
    </group>
  );
}

function DeskLamp() {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (lightRef.current) {
      // Subtle flickering effect
      lightRef.current.intensity = 0.8 + Math.sin(clock.elapsedTime * 3) * 0.05;
    }
  });

  return (
    <group position={[-1.5, 1.05, 0.5]}>
      {/* Lamp base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.05, 16]} />
        <meshStandardMaterial color="#3A3A3A" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Lamp arm */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.5, 8]} />
        <meshStandardMaterial color="#3A3A3A" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Lamp shade */}
      <mesh position={[0.1, 0.5, 0]}>
        <coneGeometry args={[0.12, 0.15, 16, 1, true]} />
        <meshStandardMaterial color="#D4845A" side={THREE.DoubleSide} roughness={0.6} />
      </mesh>
      {/* Light */}
      <pointLight
        ref={lightRef}
        position={[0.1, 0.45, 0]}
        intensity={0.8}
        color="#FFE4B5"
        distance={4}
        decay={2}
        castShadow
      />
    </group>
  );
}

function Rug() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1, 0.01, 1]}>
      <planeGeometry args={[3, 2.5]} />
      <meshStandardMaterial color="#C4956A" roughness={0.95} opacity={0.7} transparent />
    </mesh>
  );
}

export function OfficeRoom() {
  const setSceneReady = useAppStore((s) => s.setSceneReady);
  const setLoadingProgress = useAppStore((s) => s.setLoadingProgress);

  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 15;
      setLoadingProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => setSceneReady(true), 300);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [setSceneReady, setLoadingProgress]);

  return (
    <group>
      {/* Floor */}
      <Floor />

      {/* Walls */}
      <Walls />

      {/* Window */}
      <WindowFrame />

      {/* Cork board on back wall */}
      <CorkBoard />

      {/* === Workstation 1: Main desk with computer (cat works here) === */}
      <FurnitureModel
        url={FURNITURE_MODELS.desk}
        position={[-1.5, 0, -2.5]}
        rotation={[0, 0, 0]}
        scale={1}
      />
      <FurnitureModel
        url={FURNITURE_MODELS.chairDesk}
        position={[-1.5, 0, -1.5]}
        rotation={[0, Math.PI, 0]}
        scale={1}
      />
      <FurnitureModel
        url={FURNITURE_MODELS.computerScreen}
        position={[-1.5, 1.05, -2.7]}
        rotation={[0, 0, 0]}
        scale={1}
      />
      <FurnitureModel
        url={FURNITURE_MODELS.computerKeyboard}
        position={[-1.5, 1.05, -2.3]}
        rotation={[0, 0, 0]}
        scale={1}
      />
      <FurnitureModel
        url={FURNITURE_MODELS.computerMouse}
        position={[-0.9, 1.05, -2.3]}
        rotation={[0, 0, 0]}
        scale={1}
      />

      {/* Desk lamp */}
      <DeskLamp />

      {/* === Workstation 2: Laptop desk (dog works here) === */}
      <FurnitureModel
        url={FURNITURE_MODELS.desk}
        position={[2, 0, -2.5]}
        rotation={[0, 0, 0]}
        scale={1}
      />
      <FurnitureModel
        url={FURNITURE_MODELS.chairDesk}
        position={[2, 0, -1.5]}
        rotation={[0, Math.PI, 0]}
        scale={1}
      />
      <FurnitureModel
        url={FURNITURE_MODELS.laptop}
        position={[2, 1.05, -2.5]}
        rotation={[0, 0, 0]}
        scale={1}
      />

      {/* === Bookcase area (bunny organizes books here) === */}
      <FurnitureModel
        url={FURNITURE_MODELS.bookcaseOpen}
        position={[-4.2, 0, -2.5]}
        rotation={[0, Math.PI / 2, 0]}
        scale={1}
      />
      <FurnitureModel
        url={FURNITURE_MODELS.books}
        position={[-4.2, 0.5, -2.5]}
        rotation={[0, Math.PI / 2, 0]}
        scale={1}
      />
      <FurnitureModel
        url={FURNITURE_MODELS.books}
        position={[-4.2, 1.0, -2.5]}
        rotation={[0, 0, 0]}
        scale={1}
      />

      {/* === Coffee table area (monkey & chick discuss here) === */}
      <FurnitureModel
        url={FURNITURE_MODELS.tableCoffee}
        position={[1, 0, 1.5]}
        rotation={[0, 0, 0]}
        scale={1}
      />

      {/* Rug under coffee table */}
      <Rug />

      {/* === Decorations === */}
      <FurnitureModel
        url={FURNITURE_MODELS.plantSmall1}
        position={[3.5, 0, -3]}
        scale={1.2}
      />
      <FurnitureModel
        url={FURNITURE_MODELS.pottedPlant}
        position={[-4.2, 0, 1]}
        scale={1}
      />
      <FurnitureModel
        url={FURNITURE_MODELS.lampRoundTable}
        position={[3.5, 1.05, -2.5]}
        scale={1}
      />
    </group>
  );
}

// Preload all furniture models
Object.values(FURNITURE_MODELS).forEach((url) => {
  useGLTF.preload(url);
});
