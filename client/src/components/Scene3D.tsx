/**
 * Main 3D Scene Component
 * Design: Scandinavian Warm Minimalism — Cozy Study Room
 * Warm natural lighting, honey-brown wood tones, cream walls
 */
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Suspense } from 'react';
import { OfficeRoom } from './three/OfficeRoom';
import { PetWorkers } from './three/PetWorkers';

export function Scene3D() {
  return (
    <div className="w-full h-full absolute inset-0 z-0">
      <Canvas
        shadows
        camera={{ position: [6, 5, 6], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#E8E0D4');
          gl.toneMapping = 1; // ACESFilmicToneMapping
          gl.toneMappingExposure = 1.1;
        }}
      >
        <Suspense fallback={null}>
          {/* Warm ambient lighting */}
          <ambientLight intensity={0.5} color="#FFF5E6" />

          {/* Main directional light — warm sunlight from window */}
          <directionalLight
            position={[5, 8, 3]}
            intensity={1.2}
            color="#FFF0D4"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={20}
            shadow-camera-left={-8}
            shadow-camera-right={8}
            shadow-camera-top={8}
            shadow-camera-bottom={-8}
          />

          {/* Fill light from opposite side — cool blue */}
          <directionalLight
            position={[-3, 4, -2]}
            intensity={0.3}
            color="#D4E8FF"
          />

          {/* Point light for desk lamp effect */}
          <pointLight
            position={[-1.5, 2.2, 0.5]}
            intensity={0.8}
            color="#FFE4B5"
            distance={5}
            decay={2}
          />

          {/* Office Room with furniture */}
          <OfficeRoom />

          {/* Cube Pet Workers */}
          <PetWorkers />

          {/* Ground shadows */}
          <ContactShadows
            position={[0, 0.01, 0]}
            opacity={0.4}
            scale={12}
            blur={2}
            far={4}
            color="#8B7355"
          />

          {/* Camera controls */}
          <OrbitControls
            makeDefault
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.5}
            minDistance={4}
            maxDistance={14}
            target={[0, 1, 0]}
            enableDamping
            dampingFactor={0.05}
          />

          {/* Environment for reflections */}
          <Environment preset="apartment" />
        </Suspense>
      </Canvas>
    </div>
  );
}
