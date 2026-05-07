'use client';
import { Suspense, useRef, useMemo, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { EffectComposer, Bloom, Pixelation } from '@react-three/postprocessing';
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
  EARTH_PALETTE,
  BRAND_COLORS,
  FEATURED_STARS,
  type FeaturedStar,
} from '@/lib/galaxy-config';

// ─── Continent generator ────────────────────────────────────────────────────
// Layered sines stand in for value-noise — gives blob-shaped pseudo-continents
// without pulling in a noise library.
function elevationAt(lat: number, lon: number) {
  const f1 = Math.sin(lon * 1.4 + lat * 0.9) * 0.70;
  const f2 = Math.sin(lon * 2.7 - lat * 1.6) * 0.50;
  const f3 = Math.sin(lat * 3.2 + lon * 0.4) * 0.55;
  const f4 = Math.cos(lon * 0.6 + lat * 2.0) * 0.40;
  return f1 + f2 + f3 + f4 - Math.abs(lat) * 0.18;
}

function biomeColor(lat: number, lon: number, target: Color) {
  const polar = Math.abs(lat);
  if (polar > 1.34) return target.set(EARTH_PALETTE.ice);
  if (polar > 1.20) {
    const noisy = Math.sin(lon * 5 + lat * 2.4) + Math.cos(lat * 6.1) * 0.5;
    return target.set(noisy > 0 ? EARTH_PALETTE.ice : EARTH_PALETTE.tundra);
  }
  const e = elevationAt(lat, lon);
  if (e >  1.08) return target.set(EARTH_PALETTE.peak);
  if (e >  0.55) return target.set(EARTH_PALETTE.highland);
  if (e >  0.10) return target.set(EARTH_PALETTE.lowland);
  if (e > -0.05) return target.set(EARTH_PALETTE.coast);
  if (e > -0.55) return target.set(EARTH_PALETTE.shallow);
  return target.set(EARTH_PALETTE.deep);
}

// ─── Voxel Earth ─────────────────────────────────────────────────────────────
function VoxelEarth() {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<InstancedMesh>(null);
  const { rows, cols, radius, voxelSize } = PIXEL_PARAMS.earth;
  const count = rows * cols;

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const dummy = new Object3D();
    const tmp = new Color();
    let i = 0;
    for (let r = 0; r < rows; r++) {
      const lat = -Math.PI / 2 + ((r + 0.5) / rows) * Math.PI;
      const cosLat = Math.cos(lat);
      const sinLat = Math.sin(lat);
      for (let c = 0; c < cols; c++) {
        const lon = (c / cols) * Math.PI * 2;
        const e = elevationAt(lat, lon);
        const bump = Math.max(0, e) * 0.05;
        const r2 = radius + bump;

        dummy.position.set(
          cosLat * r2 * Math.cos(lon),
          sinLat * r2,
          cosLat * r2 * Math.sin(lon),
        );
        const s = 1 + Math.max(0, e) * 0.18 + (cosLat < 0.25 ? 0.1 : 0);
        dummy.scale.setScalar(s);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, biomeColor(lat, lon, tmp));
        i++;
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [rows, cols, radius]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.06;
  });

  return (
    <group ref={groupRef}>
      {/* Atmospheric glow (two soft shells) */}
      <mesh>
        <sphereGeometry args={[radius * 1.20, 28, 28]} />
        <meshBasicMaterial
          color={BRAND_COLORS.haloInner}
          transparent
          opacity={0.05}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 1.07, 28, 28]} />
        <meshBasicMaterial
          color={BRAND_COLORS.starHalo}
          transparent
          opacity={0.09}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
      <instancedMesh ref={meshRef} args={[undefined!, undefined!, count]}>
        <boxGeometry args={[voxelSize, voxelSize, voxelSize]} />
        <meshStandardMaterial metalness={0.05} roughness={0.85} />
      </instancedMesh>
    </group>
  );
}

// ─── Pixel cloud belt ────────────────────────────────────────────────────────
function CloudBelt() {
  const ref = useRef<InstancedMesh>(null);
  const groupRef = useRef<Group>(null);
  const { count, radius, voxelSize } = PIXEL_PARAMS.clouds;

  const placements = useMemo(() => {
    return Array.from({ length: count }, () => {
      // Cluster clouds in latitudinal bands
      const lat = (Math.random() - 0.5) * Math.PI * 0.9;
      const lon = Math.random() * Math.PI * 2;
      const dr  = (Math.random() - 0.5) * 0.06;
      const s   = 0.6 + Math.random() * 0.7;
      return { lat, lon, dr, s };
    });
  }, [count]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const dummy = new Object3D();
    placements.forEach((p, i) => {
      const r2 = radius + p.dr;
      dummy.position.set(
        Math.cos(p.lat) * r2 * Math.cos(p.lon),
        Math.sin(p.lat) * r2,
        Math.cos(p.lat) * r2 * Math.sin(p.lon),
      );
      dummy.scale.setScalar(p.s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [placements, radius]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.10;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={ref} args={[undefined!, undefined!, count]}>
        <boxGeometry args={[voxelSize, voxelSize, voxelSize]} />
        <meshBasicMaterial
          color={EARTH_PALETTE.ice}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}

// ─── Pixel Moon (orbits the Earth) ───────────────────────────────────────────
function PixelMoon() {
  const orbitRef = useRef<Group>(null);
  const meshRef = useRef<InstancedMesh>(null);
  const { rows, cols, radius, voxelSize, orbit } = PIXEL_PARAMS.moon;
  const count = rows * cols;

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const dummy = new Object3D();
    const surface = new Color('#9FBEFF');
    const crater  = new Color('#3B5FBF');
    let i = 0;
    for (let r = 0; r < rows; r++) {
      const lat = -Math.PI / 2 + ((r + 0.5) / rows) * Math.PI;
      const cosLat = Math.cos(lat);
      const sinLat = Math.sin(lat);
      for (let c = 0; c < cols; c++) {
        const lon = (c / cols) * Math.PI * 2;
        dummy.position.set(
          cosLat * radius * Math.cos(lon),
          sinLat * radius,
          cosLat * radius * Math.sin(lon),
        );
        dummy.scale.setScalar(1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        const isCrater = Math.sin(lon * 5.1 + lat * 3.3) + Math.cos(lat * 4.2 - lon * 1.1) > 1.05;
        meshRef.current.setColorAt(i, isCrater ? crater : surface);
        i++;
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [rows, cols, radius]);

  useFrame(({ clock }, delta) => {
    if (!orbitRef.current) return;
    const t = clock.elapsedTime * orbit.speed;
    orbitRef.current.position.set(
      Math.cos(t) * orbit.radius,
      Math.sin(t * 0.6) * orbit.tilt,
      Math.sin(t) * orbit.radius,
    );
    orbitRef.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={orbitRef}>
      <mesh>
        <sphereGeometry args={[radius * 1.7, 14, 14]} />
        <meshBasicMaterial
          color={BRAND_COLORS.haloInner}
          transparent
          opacity={0.08}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
      <instancedMesh ref={meshRef} args={[undefined!, undefined!, count]}>
        <boxGeometry args={[voxelSize, voxelSize, voxelSize]} />
        <meshStandardMaterial metalness={0.08} roughness={0.85} />
      </instancedMesh>
    </group>
  );
}

// ─── Mandala ring (one of the concentric pixel rings) ───────────────────────
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
      // Cardinal beats stand out — every Nth cube is brighter and bigger
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

// ─── Floating petals (drifting voxel motes) ─────────────────────────────────
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
    data.forEach((d, i) => {
      ref.current!.setColorAt(i, d.color);
    });
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

// ─── Pixel star field (deep background) ─────────────────────────────────────
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
      // Uniform direction on sphere
      const u = Math.random() * 2 - 1;
      const phi = Math.acos(u);
      const theta = Math.random() * Math.PI * 2;
      const r = fieldRadius * (0.65 + Math.random() * 0.35);
      dummy.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      );
      // Heavy-tailed star sizes — most tiny, a few bright
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

// ─── Featured-star markers (labeled domain pixel cubes) ─────────────────────
function FeaturedStarMark({
  star, index, total,
}: { star: FeaturedStar; index: number; total: number }) {
  const cubeRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  const { ringRadius, yLiftScale } = PIXEL_PARAMS.featured;
  const phase = (index / total) * Math.PI * 2;
  const angle = phase;
  const x = Math.cos(angle) * ringRadius;
  const z = Math.sin(angle) * ringRadius;
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

// ─── Scene ──────────────────────────────────────────────────────────────────
function Scene() {
  const groupRef = useRef<Group>(null);
  const { pointer } = useThree();

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.006;
    const targetX = 0.22 + (-pointer.y * 0.04);
    const targetZ = pointer.x * 0.03;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.022;
    groupRef.current.rotation.z += (targetZ - groupRef.current.rotation.z) * 0.022;
  });

  return (
    <group ref={groupRef}>
      <PixelStarfield />
      <FloatingPetals />
      <PixelMandala />
      <VoxelEarth />
      <CloudBelt />
      <PixelMoon />
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

// ─── Canvas ─────────────────────────────────────────────────────────────────
export default function GalaxyScene() {
  return (
    <Canvas
      camera={{ position: [0, 3.2, 8.6], fov: 48 }}
      dpr={[1, 2]}
      frameloop="always"
      // Disable AA — Pixelation post-effect wants crisp blocks, not soft edges.
      gl={{ antialias: false, alpha: true }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 6, 5]}    intensity={1.2}  color={'#DCEBFF'} />
      <directionalLight position={[-4, 2, -3]}  intensity={0.45} color={BRAND_COLORS.armOuter} />
      <pointLight       position={[0, 0, 0]}    intensity={0.9}  color={BRAND_COLORS.haloInner} />

      <Suspense fallback={null}>
        <Scene />
        <EffectComposer>
          <Bloom
            intensity={0.42}
            luminanceThreshold={0.72}
            luminanceSmoothing={0.5}
            mipmapBlur
          />
          <Pixelation granularity={5} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
