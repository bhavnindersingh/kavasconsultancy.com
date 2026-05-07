'use client';
import { Suspense, useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import {
  AdditiveBlending,
  BackSide,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  Object3D,
} from 'three';
import {
  PIXEL_PARAMS,
  BRAND_COLORS,
  FEATURED_STARS,
  type FeaturedStar,
} from '@/lib/galaxy-config';

const M = {
  earth:  '/models/space-kit/earth.gltf',
  moon:   '/models/space-kit/moon.gltf',
  green:  '/models/space-kit/planet-green.gltf',
  violet: '/models/space-kit/planet-violet.gltf',
  rock1:  '/models/space-kit/rock-1.gltf',
  rock2:  '/models/space-kit/rock-2.gltf',
  rock3:  '/models/space-kit/rock-3.gltf',
};

useGLTF.preload(M.earth);
useGLTF.preload(M.moon);
useGLTF.preload(M.green);
useGLTF.preload(M.violet);
useGLTF.preload(M.rock1);
useGLTF.preload(M.rock2);
useGLTF.preload(M.rock3);

function applyShadows(scene: Object3D) {
  scene.traverse((c) => {
    const m = c as Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
}

// ─── Earth (centerpiece) ─────────────────────────────────────────────────
function Earth() {
  const { scene } = useGLTF(M.earth);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const ref = useRef<Group>(null);

  useEffect(() => { applyShadows(cloned); }, [cloned]);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.07; });

  return (
    <group position={[0, 0, 0]} rotation={[0, 0, 0.41]}>
      <group ref={ref} scale={0.7}>
        <primitive object={cloned} />
      </group>
      {/* Soft atmosphere shells */}
      <mesh>
        <sphereGeometry args={[1.78, 32, 32]} />
        <meshBasicMaterial
          color={BRAND_COLORS.haloInner}
          transparent
          opacity={0.05}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.55, 32, 32]} />
        <meshBasicMaterial
          color={BRAND_COLORS.starHalo}
          transparent
          opacity={0.07}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── Moon (orbits Earth) ─────────────────────────────────────────────────
function Moon() {
  const { scene } = useGLTF(M.moon);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const orbitRef = useRef<Group>(null);
  const spinRef = useRef<Group>(null);

  useEffect(() => { applyShadows(cloned); }, [cloned]);

  useFrame(({ clock }, dt) => {
    if (!orbitRef.current) return;
    const t = clock.elapsedTime * 0.18;
    orbitRef.current.position.set(
      Math.cos(t) * 3.0,
      Math.sin(t * 0.6) * 0.5,
      Math.sin(t) * 3.0,
    );
    if (spinRef.current) spinRef.current.rotation.y += dt * 0.12;
  });

  return (
    <group ref={orbitRef}>
      <group ref={spinRef} scale={0.18}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

// ─── Distant background planet ──────────────────────────────────────────
function DistantPlanet({
  url, position, scale, spin = 0.04,
}: { url: string; position: [number, number, number]; scale: number; spin?: number }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const ref = useRef<Group>(null);

  useEffect(() => { applyShadows(cloned); }, [cloned]);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * spin; });

  return (
    <group position={position}>
      <group ref={ref} scale={scale}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

// ─── Drifting asteroid ──────────────────────────────────────────────────
function Asteroid({
  url, orbitRadius, orbitSpeed, yLift, phase, scale, tumble,
}: {
  url: string;
  orbitRadius: number;
  orbitSpeed: number;
  yLift: number;
  phase: number;
  scale: number;
  tumble: [number, number, number];
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const orbitRef = useRef<Group>(null);
  const tumbleRef = useRef<Group>(null);

  useEffect(() => { applyShadows(cloned); }, [cloned]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime * orbitSpeed + phase;
    if (orbitRef.current) {
      orbitRef.current.position.set(
        Math.cos(t) * orbitRadius,
        yLift + Math.sin(t * 0.7 + phase) * 0.3,
        Math.sin(t) * orbitRadius,
      );
    }
    if (tumbleRef.current) {
      tumbleRef.current.rotation.x += dt * tumble[0];
      tumbleRef.current.rotation.y += dt * tumble[1];
      tumbleRef.current.rotation.z += dt * tumble[2];
    }
  });

  return (
    <group ref={orbitRef}>
      <group ref={tumbleRef} scale={scale}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

// ─── Mandala ring ───────────────────────────────────────────────────────
type RingDef = (typeof PIXEL_PARAMS.mandala)[number];

function MandalaRing({ ring, idx }: { ring: RingDef; idx: number }) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<InstancedMesh>(null);
  const { radius, count, voxelSize, color, sway } = ring;

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const dummy = new Object3D();
    const c = new Color(color);
    const accent = new Color(BRAND_COLORS.haloInner);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const wobble = Math.sin(angle * 6 + idx) * sway * 0.05;
      dummy.position.set(
        Math.cos(angle) * (radius + wobble),
        Math.sin(angle * 4 + idx * 0.5) * sway * 0.08,
        Math.sin(angle) * (radius + wobble),
      );
      const beat = i % 8 === 0;
      const s = beat ? 1.6 : 0.85 + Math.sin(angle * 8 + idx) * 0.20;
      dummy.scale.setScalar(s);
      dummy.rotation.set(angle * 0.5, angle, idx * 0.4);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, beat ? accent : c);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [radius, count, color, idx, sway]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dir = idx % 2 === 0 ? 1 : -1;
    groupRef.current.rotation.y += delta * 0.04 * dir * (1 + idx * 0.18);
  });

  return (
    <group ref={groupRef} rotation={[Math.PI * 0.5 + idx * 0.04, idx * 0.7, 0]}>
      <instancedMesh ref={meshRef} args={[undefined!, undefined!, count]}>
        <boxGeometry args={[voxelSize, voxelSize, voxelSize]} />
        <meshStandardMaterial
          metalness={0.45}
          roughness={0.35}
          emissive={color}
          emissiveIntensity={0.55}
        />
      </instancedMesh>
    </group>
  );
}

function PixelMandala() {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.012;
  });
  return (
    <group ref={ref}>
      {PIXEL_PARAMS.mandala.map((ring, i) => (
        <MandalaRing key={i} ring={ring} idx={i} />
      ))}
    </group>
  );
}

// ─── Floating petals ─────────────────────────────────────────────────────
function FloatingPetals() {
  const ref = useRef<InstancedMesh>(null);
  const { count, voxelSize, fieldInner, fieldOuter } = PIXEL_PARAMS.petals;

  const data = useMemo(() => {
    const cWarm = new Color(BRAND_COLORS.haloInner);
    const cCool = new Color(BRAND_COLORS.starHalo);
    const cIce  = new Color('#DCEBFF');
    return Array.from({ length: count }, () => {
      const r = fieldInner + Math.random() * (fieldOuter - fieldInner);
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.7;
      const speed = 0.04 + Math.random() * 0.10;
      const phase = Math.random() * Math.PI * 2;
      const bobAmp = 0.08 + Math.random() * 0.32;
      const baseScale = 0.55 + Math.random() * 0.7;
      const roll = Math.random();
      const color = roll < 0.55 ? cWarm : roll < 0.85 ? cCool : cIce;
      return { r, theta, phi, speed, phase, bobAmp, baseScale, color };
    });
  }, [count, fieldInner, fieldOuter]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    data.forEach((d, i) => { ref.current!.setColorAt(i, d.color); });
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [data]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const dummy = new Object3D();
    const t = clock.elapsedTime;
    data.forEach((d, i) => {
      const theta = d.theta + t * d.speed * 0.05;
      const phi = d.phi + Math.sin(t * 0.18 + d.phase) * 0.04;
      const bob = Math.sin(t * 0.55 + d.phase) * d.bobAmp;
      dummy.position.set(
        Math.cos(phi) * d.r * Math.cos(theta),
        Math.sin(phi) * d.r + bob,
        Math.cos(phi) * d.r * Math.sin(theta),
      );
      const pulse = d.baseScale * (0.85 + Math.sin(t * 0.9 + d.phase) * 0.25);
      dummy.scale.setScalar(pulse);
      dummy.rotation.set(t * 0.3 + d.phase, t * 0.25, t * 0.2 + d.phase);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined!, undefined!, count]}>
      <boxGeometry args={[voxelSize, voxelSize, voxelSize]} />
      <meshBasicMaterial
        transparent
        opacity={0.78}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

// ─── Pixel star field (background) ──────────────────────────────────────
function PixelStarfield() {
  const ref = useRef<InstancedMesh>(null);
  const { count, fieldRadius, voxelSize } = PIXEL_PARAMS.stars;

  useLayoutEffect(() => {
    if (!ref.current) return;
    const dummy = new Object3D();
    const palette = [
      new Color('#F0F4FF'),
      new Color('#DCEBFF'),
      new Color('#93C5FD'),
      new Color('#4D8FFF'),
      new Color('#7FE7FF'),
      new Color('#7C5CFF'),
    ];
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const phi = Math.acos(u);
      const theta = Math.random() * Math.PI * 2;
      const r = fieldRadius * (0.65 + Math.random() * 0.35);
      dummy.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      );
      const s = 0.35 + Math.pow(Math.random(), 4) * 4.0;
      dummy.scale.setScalar(s);
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
      const col = palette[Math.floor(Math.pow(Math.random(), 1.4) * palette.length)];
      ref.current.setColorAt(i, col);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [count, fieldRadius]);

  return (
    <instancedMesh ref={ref} args={[undefined!, undefined!, count]}>
      <boxGeometry args={[voxelSize, voxelSize, voxelSize]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

// ─── Featured-star markers (with HTML labels) ───────────────────────────
function FeaturedStarMark({
  star, index, total,
}: { star: FeaturedStar; index: number; total: number }) {
  const cubeRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  const { ringRadius, yLiftScale } = PIXEL_PARAMS.featured;
  const phase = (index / total) * Math.PI * 2;
  const x = Math.cos(phase) * ringRadius;
  const z = Math.sin(phase) * ringRadius;
  const y = (star.yLift ?? 0) * yLiftScale;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (cubeRef.current) {
      cubeRef.current.rotation.x = t * 0.22 + phase;
      cubeRef.current.rotation.y = t * 0.28 + phase * 0.5;
      cubeRef.current.scale.setScalar(1 + Math.sin(t * 0.7 + phase) * 0.16);
    }
    if (haloRef.current) {
      const m = haloRef.current.material as { opacity?: number };
      m.opacity = 0.10 + Math.sin(t * 0.5 + phase) * 0.04;
    }
  });

  return (
    <group position={[x, y, z]}>
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshBasicMaterial
          color={BRAND_COLORS.starHalo}
          transparent
          opacity={0.10}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={cubeRef}>
        <boxGeometry args={[0.16, 0.16, 0.16]} />
        <meshStandardMaterial
          color={BRAND_COLORS.star}
          emissive={BRAND_COLORS.haloInner}
          emissiveIntensity={0.85}
          metalness={0.4}
          roughness={0.22}
        />
      </mesh>
      <Html
        center
        position={[0, 0.42, 0]}
        zIndexRange={[10, 0]}
        style={{
          pointerEvents: 'none',
          color: BRAND_COLORS.label,
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          textShadow:
            '0 0 6px #020916, 0 0 2px #020916, 0 1px 2px rgba(0,0,0,0.9)',
          userSelect: 'none',
        }}
      >
        {star.label}
      </Html>
    </group>
  );
}

// ─── Scene ──────────────────────────────────────────────────────────────
function Scene() {
  const groupRef = useRef<Group>(null);
  const { pointer } = useThree();

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.005;
    const targetX = 0.18 + (-pointer.y * 0.04);
    const targetZ = pointer.x * 0.03;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.022;
    groupRef.current.rotation.z += (targetZ - groupRef.current.rotation.z) * 0.022;
  });

  return (
    <group ref={groupRef}>
      <PixelStarfield />
      <FloatingPetals />
      <PixelMandala />

      <Earth />
      <Moon />

      {/* Distant background planets — placed off-axis so they don't overlap Earth */}
      <DistantPlanet url={M.green}  position={[ 7.5,  2.2, -9]} scale={0.30} spin={0.05} />
      <DistantPlanet url={M.violet} position={[-4.5, -3.0, -11]} scale={0.45} spin={0.03} />

      {/* Three drifting asteroids on different orbits */}
      <Asteroid url={M.rock1} orbitRadius={4.4} orbitSpeed={0.10} yLift={ 0.6} phase={0.0}
                scale={0.10} tumble={[0.3, 0.5, 0.2]} />
      <Asteroid url={M.rock2} orbitRadius={5.2} orbitSpeed={0.08} yLift={-0.5} phase={2.3}
                scale={0.09} tumble={[0.2, 0.6, 0.4]} />
      <Asteroid url={M.rock3} orbitRadius={3.7} orbitSpeed={0.13} yLift={ 1.1} phase={4.5}
                scale={0.08} tumble={[0.5, 0.3, 0.3]} />

      {FEATURED_STARS.map((s, i) => (
        <FeaturedStarMark
          key={s.label}
          star={s}
          index={i}
          total={FEATURED_STARS.length}
        />
      ))}
    </group>
  );
}

// ─── Canvas ─────────────────────────────────────────────────────────────
export default function GalaxyScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 3.2, 8.6], fov: 48 }}
      dpr={[1, 2]}
      frameloop="always"
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.28} color="#A8C8FF" />
      <directionalLight
        position={[6, 5, 4]}
        intensity={2.6}
        color="#FFF1D9"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
      />
      <directionalLight
        position={[-5, 2, -4]}
        intensity={0.55}
        color={BRAND_COLORS.starHalo}
      />
      <pointLight position={[0, 0, 0]} intensity={0.4} color={BRAND_COLORS.haloInner} />

      <Suspense fallback={null}>
        <Scene />
        <EffectComposer>
          <Bloom
            intensity={0.32}
            luminanceThreshold={0.85}
            luminanceSmoothing={0.55}
            mipmapBlur
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
