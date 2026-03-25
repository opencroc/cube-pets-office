/**
 * Main 3D Scene Component
 * Design: Scandinavian Warm Minimalism - Cozy Study Room
 * Warm natural lighting, honey-brown wood tones, cream walls
 */
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { Suspense } from 'react';
import { ACESFilmicToneMapping } from 'three';
import { OfficeRoom } from './three/OfficeRoom';
import { PetWorkers } from './three/PetWorkers';

export function Scene3D() {
  return (
    <div className="w-full h-full absolute inset-0 z-0">
      <Canvas
        shadows
        camera={{ position: [0, 7.3, 13.8], fov: 40, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor('#D9D0C3');
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.82;
          camera.lookAt(0, 1.35, 0);
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.38} color="#F7EDE1" />

          <hemisphereLight color="#FAEEDD" groundColor="#B28A67" intensity={0.34} />

          <directionalLight
            position={[-5.2, 7.2, 4.4]}
            intensity={0.98}
            color="#FBE2BC"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={22}
            shadow-camera-left={-11}
            shadow-camera-right={11}
            shadow-camera-top={11}
            shadow-camera-bottom={-11}
            shadow-bias={-0.00025}
          />

          <directionalLight position={[6.4, 4.5, 5.5]} intensity={0.24} color="#F1E4D4" />

          <spotLight
            position={[-7.2, 2.9, 0.3]}
            angle={0.92}
            penumbra={1}
            intensity={0.34}
            color="#FFF0D8"
            distance={18}
            decay={2}
          />

          <pointLight
            position={[0.3, 2.35, -1.1]}
            intensity={0.28}
            color="#F6D8A9"
            distance={6.6}
            decay={2}
          />

          <OfficeRoom />
          <PetWorkers />

          <ContactShadows
            position={[0, 0.01, 0]}
            opacity={0.34}
            scale={15}
            blur={2.2}
            far={5.5}
            color="#665140"
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
