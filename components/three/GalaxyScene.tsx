'use client';
import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Stars, Sparkles, Line, Billboard } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  Points,
} from 'three';
import {
  GALAXY_PARAMS,
  BRAND_COLORS,
  FEATURED_STARS,
  type FeaturedStar,
} from '@/lib/galaxy-config';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function armPoint(arm: number, t: number) {
  const { arms, radius, twist, innerCutoff } = GALAXY_PARAMS;
  const r = innerCutoff * radius + t * (radius - innerCutoff * radius);
  const armOffset = (arm / arms) * Math.PI * 2;
  const angle = armOffset + t * twist;
  return {
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * r,
    r,
    angle,
  };
}

function ringPts(r: number, segs = 128): [number, number, number][] {
  return Array.from({ length: segs + 1 }, (_, i) => {
    const a = (i / segs) * Math.PI * 2;
    return [r * Math.cos(a), 0, r * Math.sin(a)];
  });
}

// ─── Galaxy disk ─────────────────────────────────────────────────────────────
function GalaxyDisk() {
  const ref = useRef<Points>(null);

  const geometry = useMemo(() => {
    const { particleCount, arms, thickness, randomScatter, radius, innerCutoff } =
      GALAXY_PARAMS;

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const cHot   = new Color(BRAND_COLORS.coreHot);
    const cWarm  = new Color(BRAND_COLORS.coreWarm);
    const cMid   = new Color(BRAND_COLORS.armMid);
    const cOuter = new Color(BRAND_COLORS.armOuter);
    const cEdge  = new Color(BRAND_COLORS.edgeDeep);
    const cAccentCyan   = new Color('#7FE7FF');
    const cAccentViolet = new Color('#7C5CFF');

    for (let i = 0; i < particleCount; i++) {
      const arm = i % arms;
      const t = Math.pow(Math.random(), 0.78);
      const { x, z, r } = armPoint(arm, t);

      const scatter = randomScatter * (1 - t * 0.55);
      const sx = (Math.random() - 0.5) * scatter * 2;
      const sz = (Math.random() - 0.5) * scatter * 2;
      const thicknessAt = thickness * (1 - 0.7 * t);
      const sy = (Math.random() - 0.5) * thicknessAt * 2 *
        (Math.random() < 0.85 ? 1 : 0.35);

      positions[i * 3 + 0] = x + sx;
      positions[i * 3 + 1] = sy;
      positions[i * 3 + 2] = z + sz;

      const tNorm = Math.max(0, Math.min(1, (r - innerCutoff * radius) / (radius - innerCutoff * radius)));
      const c = new Color();
      if (tNorm < 0.18) {
        c.copy(cHot).lerp(cWarm, tNorm / 0.18);
      } else if (tNorm < 0.55) {
        c.copy(cWarm).lerp(cMid, (tNorm - 0.18) / (0.55 - 0.18));
      } else if (tNorm < 0.85) {
        c.copy(cMid).lerp(cOuter, (tNorm - 0.55) / (0.85 - 0.55));
      } else {
        c.copy(cOuter).lerp(cEdge, (tNorm - 0.85) / (1 - 0.85));
      }

      // Sparse accent dusting: ~6% cyan, ~4% violet — keeps palette mostly blue
      const roll = Math.random();
      if (roll < 0.06) c.lerp(cAccentCyan, 0.45);
      else if (roll < 0.10) c.lerp(cAccentViolet, 0.35);

      const j = (Math.random() - 0.5) * 0.10;
      c.r = Math.max(0, Math.min(1, c.r + j));
      c.g = Math.max(0, Math.min(1, c.g + j * 0.7));
      c.b = Math.max(0, Math.min(1, c.b + j * 0.5));

      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positions, 3));
    g.setAttribute('color', new BufferAttribute(colors, 3));
    return g;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.025;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.038}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

// ─── Galactic core ───────────────────────────────────────────────────────────
function GalacticCore() {
  const coreRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (coreRef.current) coreRef.current.scale.setScalar(1 + Math.sin(t * 0.55) * 0.04);
    if (haloRef.current) {
      const m = haloRef.current.material as { opacity?: number };
      m.opacity = 0.10 + Math.sin(t * 0.32) * 0.025;
    }
    if (ringRef.current) ringRef.current.rotation.z = t * 0.12;
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.65, 24, 24]} />
        <meshBasicMaterial
          color={BRAND_COLORS.haloOuter}
          transparent
          opacity={0.045}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={haloRef}>
        <sphereGeometry args={[1.05, 24, 24]} />
        <meshBasicMaterial
          color={BRAND_COLORS.haloInner}
          transparent
          opacity={0.10}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2.05, 0, 0]}>
        <torusGeometry args={[0.78, 0.006, 10, 128]} />
        <meshBasicMaterial color="#A8C8FF" transparent opacity={0.42} />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.42, 64, 64]} />
        <meshPhysicalMaterial
          color="#3B5FBF"
          emissive={BRAND_COLORS.haloInner}
          emissiveIntensity={2.2}
          metalness={0.85}
          roughness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.04}
        />
      </mesh>
    </group>
  );
}

// ─── Three small moons orbiting the core ─────────────────────────────────────
function OrbitingMoons() {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.14;
  });
  const moons: number[] = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
  return (
    <group ref={ref}>
      {moons.map((angle, i) => (
        <mesh
          key={i}
          position={[Math.cos(angle) * 0.96, 0, Math.sin(angle) * 0.96]}
        >
          <sphereGeometry args={[0.04, 14, 14]} />
          <meshStandardMaterial
            color={BRAND_COLORS.star}
            emissive={BRAND_COLORS.haloInner}
            emissiveIntensity={2.4}
            metalness={0.4}
            roughness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Concentric meditative rings around the core ─────────────────────────────
function ConcentricRings() {
  const radii = [1.45, 2.15, 2.95, 3.85, 4.7];
  const rings = useMemo(() => radii.map((r) => ringPts(r)), []);
  return (
    <group>
      {rings.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color={BRAND_COLORS.haloOuter}
          lineWidth={0.35}
          transparent
          opacity={0.05 + i * 0.012}
        />
      ))}
    </group>
  );
}

// ─── Faint data tendrils from core to each featured star ─────────────────────
function DataTendrils() {
  return (
    <group>
      {FEATURED_STARS.map((s, i) => {
        const { x, z } = armPoint(s.arm, s.t);
        const y = s.yLift ?? 0;
        return (
          <Line
            key={i}
            points={[[0, 0, 0], [x, y, z]]}
            color={BRAND_COLORS.armMid}
            lineWidth={0.35}
            transparent
            opacity={0.075}
          />
        );
      })}
    </group>
  );
}

// ─── Foreground sparkle motes (close to camera) ──────────────────────────────
function ForegroundMotes() {
  const ref = useRef<Points>(null);

  const geo = useMemo(() => {
    const N = 520;
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    const cMid  = new Color(BRAND_COLORS.armMid);
    const cWarm = new Color(BRAND_COLORS.coreWarm);

    for (let i = 0; i < N; i++) {
      const r = 1.2 + Math.random() * 7.5;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3 + 0] = Math.cos(angle) * r * (0.55 + Math.random() * 0.6);
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3.5;
      positions[i * 3 + 2] = Math.sin(angle) * r * (0.55 + Math.random() * 0.6);

      const c = new Color().copy(cMid).lerp(cWarm, Math.random() * 0.6);
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positions, 3));
    g.setAttribute('color', new BufferAttribute(colors, 3));
    return g;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y -= delta * 0.012;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.024}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

// ─── Dust shells (slow breathing nebulae) ────────────────────────────────────
function DustShells() {
  const a = useRef<Mesh>(null);
  const b = useRef<Mesh>(null);
  const c = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (a.current) {
      const m = a.current.material as { opacity?: number };
      m.opacity = 0.022 + Math.sin(t * 0.18) * 0.008;
      a.current.rotation.y = t * 0.015;
    }
    if (b.current) {
      const m = b.current.material as { opacity?: number };
      m.opacity = 0.018 + Math.cos(t * 0.13) * 0.006;
      b.current.rotation.y = -t * 0.011;
    }
    if (c.current) {
      const m = c.current.material as { opacity?: number };
      m.opacity = 0.014 + Math.sin(t * 0.09 + 1.2) * 0.005;
      c.current.rotation.y = t * 0.008;
    }
  });

  return (
    <group>
      <mesh ref={a} scale={[1.18, 0.42, 1.18]}>
        <sphereGeometry args={[5.4, 24, 24]} />
        <meshBasicMaterial
          color={BRAND_COLORS.dustIndigo}
          transparent
          opacity={0.022}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={b} scale={[1.05, 0.32, 1.05]}>
        <sphereGeometry args={[3.9, 24, 24]} />
        <meshBasicMaterial
          color={BRAND_COLORS.dustViolet}
          transparent
          opacity={0.018}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={c} scale={[0.95, 0.28, 0.95]}>
        <sphereGeometry args={[2.6, 24, 24]} />
        <meshBasicMaterial
          color="#1FB8E3"
          transparent
          opacity={0.014}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── Featured star (labeled domain) ──────────────────────────────────────────
function FeaturedStarMark({ star, index }: { star: FeaturedStar; index: number }) {
  const ref = useRef<Mesh>(null);
  const phase = (index / FEATURED_STARS.length) * Math.PI * 2;
  const { x, z } = armPoint(star.arm, star.t);
  const y = star.yLift ?? 0;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.elapsedTime * 0.7 + phase) * 0.14;
    ref.current.scale.setScalar(s);
  });

  return (
    <group position={[x, y, z]}>
      <mesh>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial
          color={BRAND_COLORS.starHalo}
          transparent
          opacity={0.10}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ref}>
        <sphereGeometry args={[0.085, 24, 24]} />
        <meshStandardMaterial
          color={BRAND_COLORS.star}
          emissive={BRAND_COLORS.haloInner}
          emissiveIntensity={3.4}
          metalness={0.4}
          roughness={0.08}
        />
      </mesh>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Text
          position={[0, 0.34, 0]}
          fontSize={0.16}
          color={BRAND_COLORS.label}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.011}
          outlineColor={BRAND_COLORS.labelOutline}
        >
          {star.label}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── Scene ───────────────────────────────────────────────────────────────────
function Scene() {
  const groupRef = useRef<Group>(null);
  const { pointer } = useThree();

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.008;
    const targetX = 0.46 + (-pointer.y * 0.05);
    const targetZ = pointer.x * 0.035;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.022;
    groupRef.current.rotation.z += (targetZ - groupRef.current.rotation.z) * 0.022;
  });

  return (
    <group ref={groupRef}>
      <DustShells />
      <ConcentricRings />
      <DataTendrils />
      <GalaxyDisk />
      <ForegroundMotes />
      <GalacticCore />
      <OrbitingMoons />

      {FEATURED_STARS.map((s, i) => (
        <FeaturedStarMark key={s.label} star={s} index={i} />
      ))}

      <Sparkles count={32} scale={9.5} size={0.55} speed={0.04} opacity={0.07} color={BRAND_COLORS.haloInner} />
    </group>
  );
}

// ─── Canvas ──────────────────────────────────────────────────────────────────
export default function GalaxyScene() {
  return (
    <Canvas
      camera={{ position: [0, 4.6, 11], fov: 50 }}
      dpr={[1, 2]}
      frameloop="always"
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.22} />
      <pointLight position={[3, 7, 4]}    intensity={2.0} color={BRAND_COLORS.haloInner} />
      <pointLight position={[-5, -2, -3]} intensity={0.5} color={BRAND_COLORS.armOuter} />
      <pointLight position={[0, -4, 3]}   intensity={0.6} color={BRAND_COLORS.armMid} />

      <Suspense fallback={null}>
        <Stars radius={80} depth={40} count={2200} factor={3} saturation={0} fade speed={0.3} />
        <Scene />
        <EffectComposer>
          <Bloom
            intensity={0.92}
            luminanceThreshold={0.30}
            luminanceSmoothing={0.84}
            mipmapBlur
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
