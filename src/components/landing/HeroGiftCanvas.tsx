import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import giftPoster from "@/assets/unwrapt-gift-box.png";

type MousePosition = { x: number; y: number };

type GiftMeshProps = {
  mousePosition: MousePosition;
  revealProgress: number;
  reducedMotion: boolean;
};

function GiftBoxMesh({
  mousePosition,
  revealProgress,
  reducedMotion,
}: GiftMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const bowRef = useRef<THREE.Group>(null);
  const targetRotation = useRef({ x: 0.15, y: 0.35 });

  useFrame((state) => {
    if (!groupRef.current) return;

    if (!reducedMotion) {
      targetRotation.current.y = 0.35 + (mousePosition.x - 0.5) * 0.55;
      targetRotation.current.x = 0.12 - (mousePosition.y - 0.5) * 0.35;
      groupRef.current.rotation.y +=
        (targetRotation.current.y - groupRef.current.rotation.y) * 0.07;
      groupRef.current.rotation.x +=
        (targetRotation.current.x - groupRef.current.rotation.x) * 0.07;
      groupRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.45) * 0.05;
    }

    const t = THREE.MathUtils.clamp(revealProgress, 0, 1);
    if (lidRef.current) {
      lidRef.current.position.y = 1.05 + t * 0.85;
      lidRef.current.rotation.x = -t * 0.35;
      lidRef.current.position.z = t * -0.15;
    }
    if (bowRef.current) {
      bowRef.current.position.y = 1.3 + t * 0.85;
      bowRef.current.rotation.z = t * 0.2;
      bowRef.current.scale.setScalar(1 - t * 0.08);
    }
  });

  const cream = "#F5EFE6";
  const gold = "#D4AF7A";
  const goldDeep = "#C9A363";

  return (
    <Float
      speed={reducedMotion ? 0 : 1.2}
      rotationIntensity={reducedMotion ? 0 : 0.08}
      floatIntensity={reducedMotion ? 0 : 0.15}
    >
      <group ref={groupRef} position={[0, -0.15, 0]}>
        {/* Base */}
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[2.2, 2.0, 2.2]} />
          <meshStandardMaterial
            color={cream}
            roughness={0.28}
            metalness={0.05}
            envMapIntensity={0.85}
          />
        </mesh>

        {/* Inner glow when opening */}
        <mesh position={[0, 0.95, 0]}>
          <boxGeometry args={[1.9, 0.05, 1.9]} />
          <meshStandardMaterial
            color="#E8C991"
            emissive="#D4AF7A"
            emissiveIntensity={0.15 + revealProgress * 0.55}
            roughness={0.4}
            transparent
            opacity={0.35 + revealProgress * 0.45}
          />
        </mesh>

        {/* Horizontal ribbon on base */}
        <mesh castShadow position={[0, 0.15, 0]}>
          <boxGeometry args={[2.28, 0.32, 2.28]} />
          <meshStandardMaterial
            color={gold}
            roughness={0.32}
            metalness={0.42}
            envMapIntensity={1.15}
          />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.32, 2.05, 2.28]} />
          <meshStandardMaterial
            color={gold}
            roughness={0.32}
            metalness={0.42}
            envMapIntensity={1.15}
          />
        </mesh>

        {/* Lid */}
        <group ref={lidRef} position={[0, 1.05, 0]}>
          <mesh castShadow>
            <boxGeometry args={[2.28, 0.28, 2.28]} />
            <meshStandardMaterial
              color={cream}
              roughness={0.25}
              metalness={0.06}
              envMapIntensity={0.9}
            />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <boxGeometry args={[2.15, 0.08, 2.15]} />
            <meshStandardMaterial color="#EDE4D4" roughness={0.45} />
          </mesh>
          <mesh castShadow position={[0, 0.02, 0]}>
            <boxGeometry args={[2.32, 0.12, 2.32]} />
            <meshStandardMaterial
              color={gold}
              roughness={0.3}
              metalness={0.45}
            />
          </mesh>
        </group>

        {/* Bow */}
        <group ref={bowRef} position={[0, 1.3, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.26, 28, 28]} />
            <meshStandardMaterial
              color={goldDeep}
              roughness={0.22}
              metalness={0.55}
              envMapIntensity={1.4}
            />
          </mesh>
          {[
            { pos: [-0.48, 0, 0] as const, rot: [0, 0, Math.PI / 6] as const },
            { pos: [0.48, 0, 0] as const, rot: [0, 0, -Math.PI / 6 + Math.PI] as const },
            { pos: [0, 0, 0.48] as const, rot: [Math.PI / 6, Math.PI / 2, 0] as const },
            { pos: [0, 0, -0.48] as const, rot: [-Math.PI / 6, Math.PI / 2, 0] as const },
          ].map((cfg, i) => (
            <group key={i} position={cfg.pos} rotation={cfg.rot}>
              <mesh castShadow>
                <torusGeometry args={[0.32, 0.12, 20, 28, Math.PI * 1.1]} />
                <meshStandardMaterial
                  color={goldDeep}
                  roughness={0.22}
                  metalness={0.5}
                  envMapIntensity={1.4}
                />
              </mesh>
            </group>
          ))}
          {[-0.32, 0.32].map((x, i) => (
            <group
              key={`tail-${i}`}
              position={[x * 0.55, -0.35, 0]}
              rotation={[0, 0, x < 0 ? -0.4 : 0.4]}
            >
              <mesh castShadow>
                <boxGeometry args={[0.16, 0.75, 0.05]} />
                <meshStandardMaterial color={gold} roughness={0.35} metalness={0.4} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </Float>
  );
}

function Scene({
  mousePosition,
  revealProgress,
  reducedMotion,
}: GiftMeshProps) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.55, 5.2]} fov={42} />
      <ambientLight intensity={0.45} color="#FFF8E7" />
      <directionalLight
        position={[5, 6, 4]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} color="#FFE4B5" />
      <pointLight position={[0, 4, 1]} intensity={0.55} color="#FFFAF0" />
      <GiftBoxMesh
        mousePosition={mousePosition}
        revealProgress={revealProgress}
        reducedMotion={reducedMotion}
      />
      <ContactShadows
        position={[0, -1.15, 0]}
        opacity={0.35}
        scale={10}
        blur={2.2}
        far={4}
        color="#8B7355"
      />
      <Environment preset="apartment" />
    </>
  );
}

export type HeroGiftCanvasProps = {
  className?: string;
  revealProgress?: number;
  /** When false, canvas uses frameloop="never" after one frame */
  active?: boolean;
  /** Force static poster (mobile / reduced motion) */
  forcePoster?: boolean;
};

const HeroGiftCanvas: React.FC<HeroGiftCanvasProps> = ({
  className = "",
  revealProgress = 0,
  active = true,
  forcePoster = false,
}) => {
  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0.5,
    y: 0.5,
  });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const usePoster = forcePoster || reducedMotion || !mounted;

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    });
  };

  const dpr = useMemo(() => {
    if (typeof window === "undefined") return [1, 1.5] as [number, number];
    return [1, Math.min(window.devicePixelRatio || 1, 1.75)] as [number, number];
  }, []);

  if (usePoster) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img
          src={giftPoster}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain object-center scale-[1.05]"
          style={{
            transform: `translateY(${revealProgress * -8}%) scale(${1 + revealProgress * 0.04})`,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePosition({ x: 0.5, y: 0.5 })}
    >
      <Suspense
        fallback={
          <img
            src={giftPoster}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain"
          />
        }
      >
        <Canvas
          shadows
          dpr={dpr}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          frameloop={active ? "always" : "demand"}
          style={{ background: "transparent" }}
          camera={{ position: [0, 0.55, 5.2], fov: 42 }}
        >
          <Scene
            mousePosition={mousePosition}
            revealProgress={revealProgress}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </Suspense>
    </div>
  );
};

export default HeroGiftCanvas;
