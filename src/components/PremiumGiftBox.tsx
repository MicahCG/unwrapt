// components/PremiumGiftBox.tsx
// Premium 3D gift box for Unwrapt hero

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  PerspectiveCamera,
  Environment,
  ContactShadows,
  Float,
} from '@react-three/drei';
import * as THREE from 'three';

type MousePosition = { x: number; y: number };

function GiftBoxMesh({ mousePosition }: { mousePosition: MousePosition }) {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef({ x: 0, y: 0 });

  useFrame((state) => {
    if (!groupRef.current) return;

    // Mouse driven target rotation
    targetRotation.current.y = (mousePosition.x - 0.5) * 0.6;
    targetRotation.current.x = -(mousePosition.y - 0.5) * 0.4;

    // Smooth easing
    groupRef.current.rotation.y +=
      (targetRotation.current.y - groupRef.current.rotation.y) * 0.08;
    groupRef.current.rotation.x +=
      (targetRotation.current.x - groupRef.current.rotation.x) * 0.08;

    // Gentle idle float
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
      <group ref={groupRef} position={[0, 0.5, 0]}>
        {/* Main box */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.2, 2.2, 2.2]} />
          <meshStandardMaterial
            color="#F5EFE6" // cream
            roughness={0.2}
            metalness={0.05}
            envMapIntensity={0.8}
          />
        </mesh>

        {/* Lid separation */}
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[2.25, 0.02, 2.25]} />
          <meshStandardMaterial color="#E8DCC8" roughness={0.4} />
        </mesh>

        {/* Horizontal ribbon */}
        <mesh castShadow>
          <boxGeometry args={[2.3, 0.35, 2.3]} />
          <meshStandardMaterial
            color="#D4AF7A" // gold
            roughness={0.35}
            metalness={0.4}
            envMapIntensity={1.2}
          />
        </mesh>

        {/* Ribbon edge details */}
        <mesh position={[0, 0.175, 0]}>
          <boxGeometry args={[2.35, 0.02, 2.35]} />
          <meshStandardMaterial
            color="#C9A363"
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>
        <mesh position={[0, -0.175, 0]}>
          <boxGeometry args={[2.35, 0.02, 2.35]} />
          <meshStandardMaterial
            color="#C9A363"
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>

        {/* Vertical ribbon */}
        <mesh castShadow>
          <boxGeometry args={[0.35, 2.3, 2.3]} />
          <meshStandardMaterial
            color="#D4AF7A"
            roughness={0.35}
            metalness={0.4}
            envMapIntensity={1.2}
          />
        </mesh>

        {/* Vertical ribbon edges */}
        <mesh position={[0.175, 0, 0]}>
          <boxGeometry args={[0.02, 2.35, 2.35]} />
          <meshStandardMaterial
            color="#C9A363"
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>
        <mesh position={[-0.175, 0, 0]}>
          <boxGeometry args={[0.02, 2.35, 2.35]} />
          <meshStandardMaterial
            color="#C9A363"
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>

        {/* Bow center */}
        <mesh castShadow position={[0, 1.3, 0]}>
          <sphereGeometry args={[0.28, 32, 32]} />
          <meshStandardMaterial
            color="#C9A363"
            roughness={0.25}
            metalness={0.5}
            envMapIntensity={1.5}
          />
        </mesh>

        {/* Bow loops */}
        {[
          { pos: [-0.5, 1.3, 0], rot: [0, 0, Math.PI / 6] },
          { pos: [0.5, 1.3, 0], rot: [0, 0, -Math.PI / 6 + Math.PI] },
          { pos: [0, 1.3, 0.5], rot: [Math.PI / 6, Math.PI / 2, 0] },
          { pos: [0, 1.3, -0.5], rot: [-Math.PI / 6, Math.PI / 2, 0] },
        ].map((cfg, i) => (
          <group key={i} position={cfg.pos as any} rotation={cfg.rot as any}>
            <mesh castShadow>
              <torusGeometry args={[0.35, 0.14, 24, 32, Math.PI * 1.1]} />
              <meshStandardMaterial
                color="#C9A363"
                roughness={0.25}
                metalness={0.5}
                envMapIntensity={1.5}
              />
            </mesh>
            {i < 2 && (
              <mesh position={[0, 0, 0.02]}>
                <torusGeometry args={[0.35, 0.08, 16, 32, Math.PI * 1.1]} />
                <meshStandardMaterial
                  color="#E8C991"
                  roughness={0.2}
                  metalness={0.6}
                  transparent
                  opacity={0.6}
                />
              </mesh>
            )}
          </group>
        ))}

        {/* Ribbon tails */}
        {[-0.35, 0.35].map((x, i) => (
          <group
            key={i}
            position={[x * 0.6, 0.85, 0]}
            rotation={[0, 0, x < 0 ? -0.35 : 0.35]}
          >
            <mesh castShadow>
              <boxGeometry args={[0.18, 0.9, 0.06]} />
              <meshStandardMaterial
                color="#D4AF7A"
                roughness={0.35}
                metalness={0.4}
              />
            </mesh>
            <mesh position={[0, 0.2, 0.04]}>
              <boxGeometry args={[0.18, 0.02, 0.01]} />
              <meshStandardMaterial color="#B8904D" roughness={0.4} />
            </mesh>
            <mesh castShadow position={[0, -0.55, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.12, 0.25, 3]} />
              <meshStandardMaterial
                color="#D4AF7A"
                roughness={0.35}
                metalness={0.4}
              />
            </mesh>
          </group>
        ))}
      </group>
    </Float>
  );
}

function PremiumScene({ mousePosition }: { mousePosition: MousePosition }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.5, 5.5]} fov={45} />

      {/* Lighting */}
      <ambientLight intensity={0.4} color="#FFF8E7" />

      <directionalLight
        position={[6, 6, 4]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />

      <directionalLight position={[-4, 3, -3]} intensity={0.4} color="#FFE4B5" />
      <directionalLight position={[0, 3, -5]} intensity={0.6} color="#FFF8DC" />
      <pointLight position={[0, 5, 0]} intensity={0.8} color="#FFFAF0" />

      <GiftBoxMesh mousePosition={mousePosition} />

      <ContactShadows
        position={[0, -1.1, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={4}
        color="#8B7355"
      />

      <Environment preset="apartment" />
      <fog attach="fog" args={['#F5EFE6', 8, 15]} />
    </>
  );
}

const PremiumGiftBox: React.FC = () => {
  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0.5,
    y: 0.5,
  });

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    });
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0.5, y: 0.5 });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full h-[380px] sm:h-[460px] rounded-3xl overflow-hidden relative shadow-[0_20px_60px_rgba(212,175,122,0.18)]"
      style={{
        background:
          'linear-gradient(135deg, #F5EFE6 0%, #E8DCC8 50%, #F5EFE6 100%)',
      }}
    >
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <PremiumScene mousePosition={mousePosition} />
      </Canvas>

      {/* Soft bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background:
            'linear-gradient(to top, rgba(232,220,200,0.35), transparent)',
        }}
      />
    </div>
  );
};

export default PremiumGiftBox;
