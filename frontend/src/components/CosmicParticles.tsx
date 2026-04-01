import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 600;
const SPREAD = 40;
const DEPTH = 30;

const COSMIC_COLORS = [
  new THREE.Color(0x60a5fa),
  new THREE.Color(0xa78bfa),
  new THREE.Color(0xf472b6),
  new THREE.Color(0x38bdf8),
  new THREE.Color(0xc084fc),
  new THREE.Color(0xe2e8f0),
  new THREE.Color(0x818cf8),
  new THREE.Color(0x22d3ee),
];

interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  scales: Float32Array;
  velocities: Float32Array;
  phases: Float32Array;
  baseScales: Float32Array;
}

function generateParticleData(): ParticleData {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const scales = new Float32Array(PARTICLE_COUNT);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);
  const phases = new Float32Array(PARTICLE_COUNT);
  const baseScales = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;

    positions[i3] = (Math.random() - 0.5) * SPREAD;
    positions[i3 + 1] = (Math.random() - 0.5) * SPREAD;
    positions[i3 + 2] = (Math.random() - 0.5) * DEPTH - 5;

    const color = COSMIC_COLORS[Math.floor(Math.random() * COSMIC_COLORS.length)];
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;

    const s = 0.02 + Math.random() * 0.06;
    scales[i] = s;
    baseScales[i] = s;

    velocities[i3] = (Math.random() - 0.5) * 0.003;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.003;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.001;

    phases[i] = Math.random() * Math.PI * 2;
  }

  return { positions, colors, scales, velocities, phases, baseScales };
}

function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const dataRef = useRef(generateParticleData());

  const initMesh = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      (meshRef as React.MutableRefObject<THREE.InstancedMesh | null>).current = mesh;
      const data = dataRef.current;

      const colorAttr = new THREE.InstancedBufferAttribute(data.colors, 3);
      mesh.instanceColor = colorAttr;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        dummy.position.set(data.positions[i3], data.positions[i3 + 1], data.positions[i3 + 2]);
        dummy.scale.setScalar(data.scales[i]);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    [dummy]
  );

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const data = dataRef.current;

    const t = clock.getElapsedTime();
    const halfSpread = SPREAD / 2;
    const halfDepth = DEPTH / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      data.positions[i3] += data.velocities[i3];
      data.positions[i3 + 1] += data.velocities[i3 + 1];
      data.positions[i3 + 2] += data.velocities[i3 + 2];

      if (data.positions[i3] > halfSpread) data.positions[i3] = -halfSpread;
      if (data.positions[i3] < -halfSpread) data.positions[i3] = halfSpread;
      if (data.positions[i3 + 1] > halfSpread) data.positions[i3 + 1] = -halfSpread;
      if (data.positions[i3 + 1] < -halfSpread) data.positions[i3 + 1] = halfSpread;
      if (data.positions[i3 + 2] > halfDepth - 5) data.positions[i3 + 2] = -halfDepth - 5;
      if (data.positions[i3 + 2] < -halfDepth - 5) data.positions[i3 + 2] = halfDepth - 5;

      const twinkle = 0.5 + 0.5 * Math.sin(t * 1.5 + data.phases[i]);
      const scale = data.baseScales[i] * (0.4 + 0.6 * twinkle);

      dummy.position.set(data.positions[i3], data.positions[i3 + 1], data.positions[i3 + 2]);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={initMesh} args={[undefined, undefined, PARTICLE_COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial transparent opacity={0.8} toneMapped={false} />
    </instancedMesh>
  );
}

function Nebula() {
  const groupRef = useRef<THREE.Group>(null);
  const materialRefs = useRef<THREE.MeshBasicMaterial[]>([]);

  const nebulaData = useMemo(
    () => [
      { position: [-6, 3, -18] as [number, number, number], scale: 12, color: new THREE.Color(0x3b82f6), baseOpacity: 0.03 },
      { position: [8, -4, -22] as [number, number, number], scale: 15, color: new THREE.Color(0xa855f7), baseOpacity: 0.025 },
      { position: [0, 6, -25] as [number, number, number], scale: 10, color: new THREE.Color(0xec4899), baseOpacity: 0.02 },
      { position: [-10, -6, -20] as [number, number, number], scale: 8, color: new THREE.Color(0x06b6d4), baseOpacity: 0.025 },
    ],
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 0.05) * 0.02;
    }
    materialRefs.current.forEach((mat, idx) => {
      if (mat) {
        const pulse = 0.7 + 0.3 * Math.sin(t * 0.3 + idx * 1.5);
        mat.opacity = nebulaData[idx].baseOpacity * pulse;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {nebulaData.map((nebula, idx) => (
        <mesh key={idx} position={nebula.position}>
          <planeGeometry args={[nebula.scale, nebula.scale]} />
          <meshBasicMaterial
            ref={(el: THREE.MeshBasicMaterial | null) => {
              if (el) materialRefs.current[idx] = el;
            }}
            color={nebula.color}
            transparent
            opacity={nebula.baseOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export function CosmicParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        dpr={[1, 1.5]}
        style={{ background: "transparent" }}
      >
        <Particles />
        <Nebula />
      </Canvas>
    </div>
  );
}
