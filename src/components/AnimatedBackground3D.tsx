import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

// Individual animated shape component
const AnimatedShape = ({ position, geometry, material, speed }: any) => {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Move from left to right
      meshRef.current.position.x += speed;
      
      // Reset position when shape goes off screen
      if (meshRef.current.position.x > 15) {
        meshRef.current.position.x = -15;
      }
      
      // Gentle rotation
      meshRef.current.rotation.x += 0.002;
      meshRef.current.rotation.y += 0.003;
      meshRef.current.rotation.z += 0.001;
    }
  });

  return (
    <mesh ref={meshRef} position={position} geometry={geometry} material={material} />
  );
};

// Main 3D scene component
const Scene = () => {
  const shapes = useMemo(() => {
    const shapeArray = [];
    
    for (let i = 0; i < 12; i++) {
      const geometries = [
        <boxGeometry args={[0.8, 0.8, 0.8]} />,
        <sphereGeometry args={[0.5, 16, 16]} />,
        <tetrahedronGeometry args={[0.6]} />,
        <octahedronGeometry args={[0.6]} />,
        <icosahedronGeometry args={[0.5]} />,
        <torusGeometry args={[0.4, 0.2, 8, 16]} />,
      ];
      
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      
      const position = [
        -15 + Math.random() * 30, // x: spread across screen width
        -8 + Math.random() * 16,  // y: spread across screen height
        -10 + Math.random() * 20  // z: depth variation
      ];
      
      const speed = 0.005 + Math.random() * 0.01; // Random speed between 0.005 and 0.015
      
      const material = (
        <meshPhongMaterial 
          color={`hsl(${210 + Math.random() * 60}, 50%, ${60 + Math.random() * 20}%)`}
          transparent
          opacity={0.1 + Math.random() * 0.2}
          wireframe={Math.random() > 0.5}
        />
      );

      shapeArray.push(
        <AnimatedShape
          key={i}
          position={position}
          geometry={geometry}
          material={material}
          speed={speed}
        />
      );
    }
    
    return shapeArray;
  }, []);

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      
      {/* Directional lighting */}
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.5} 
        color="#f0f0f0"
      />
      
      {/* Point light for depth */}
      <pointLight 
        position={[-10, -10, -10]} 
        intensity={0.3} 
        color="#ffd700"
      />
      
      {shapes}
    </>
  );
};

// Main component
const AnimatedBackground3D = () => {
  return (
    <div className="absolute inset-0 w-full h-full -z-10">
      <Canvas
        camera={{ 
          position: [0, 0, 8], 
          fov: 60,
          near: 0.1,
          far: 100
        }}
        style={{ 
          background: 'transparent',
          pointerEvents: 'none' // Allow clicks to pass through
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default AnimatedBackground3D;