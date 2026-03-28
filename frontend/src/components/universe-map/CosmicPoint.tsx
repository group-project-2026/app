import { useRef, useMemo, useCallback, useState, useLayoutEffect } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { CosmicPoint as CosmicPointType } from "./types";
import { CATEGORY_META } from "./types";
import { SPHERE_RADIUS } from "./CelestialSphere";

const POINT_GEO = new THREE.SphereGeometry(1, 12, 12);
const GLOW_GEO = new THREE.SphereGeometry(1, 8, 8);
POINT_GEO.computeBoundingSphere();
GLOW_GEO.computeBoundingSphere();
if (POINT_GEO.boundingSphere) POINT_GEO.boundingSphere.radius = SPHERE_RADIUS + 2;
if (GLOW_GEO.boundingSphere) GLOW_GEO.boundingSphere.radius = SPHERE_RADIUS + 2;

const DUMMY = new THREE.Object3D();
const _color = new THREE.Color();
function raDecToXYZ(ra: number, dec: number, radius: number): THREE.Vector3 {
  const phi = (dec * Math.PI) / 180;
  const theta = (ra * Math.PI) / 180;
  return new THREE.Vector3(
    radius * Math.cos(phi) * Math.cos(theta),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.sin(theta),
  );
}

interface Props {
  points: CosmicPointType[];
  onSelect: (point: CosmicPointType) => void;
}
export function CosmicPoints({ points, onSelect }: Props) {
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [prevPoints, setPrevPoints] = useState<CosmicPointType[]>(points);

  if (points !== prevPoints) {
    setPrevPoints(points);
    setHoveredIdx(null);
  }

  const { camera } = useThree();
  const { positions, scales, colors } = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    const scl: number[] = [];
    const col: THREE.Color[] = [];

    for (const p of points) {
      pos.push(raDecToXYZ(p.ra, p.dec, SPHERE_RADIUS));
      scl.push(Math.max(0.04, p.magnitude / 100));
      col.push(new THREE.Color(CATEGORY_META[p.category].color));
    }

    return { positions: pos, scales: scl, colors: col };
  }, [points]);

  const meshKey = points.length;
  useLayoutEffect(() => {
    const core = coreRef.current;
    const glow = glowRef.current;
    if (!core || !glow || points.length === 0) return;

    for (let i = 0; i < points.length; i++) {
      const pos = positions[i];
      const s = scales[i];

      DUMMY.position.copy(pos);
      DUMMY.scale.setScalar(s);
      DUMMY.updateMatrix();
      core.setMatrixAt(i, DUMMY.matrix);
      core.setColorAt(i, colors[i]);

      DUMMY.scale.setScalar(s * 2.5);
      DUMMY.updateMatrix();
      glow.setMatrixAt(i, DUMMY.matrix);
      glow.setColorAt(i, colors[i]);
    }

    core.instanceMatrix.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;
    if (core.instanceColor) core.instanceColor.needsUpdate = true;
    if (glow.instanceColor) glow.instanceColor.needsUpdate = true;

    core.computeBoundingSphere();
    glow.computeBoundingSphere();
  }, [points, positions, scales, colors, meshKey]);

  useLayoutEffect(() => {
    document.body.style.cursor = "auto";
  }, [points]);

  const timeRef = useRef(0);

  /* v8 ignore start - WebGL specific event handlers and animation frame loop cannot be tested in jsdom */
  useFrame((_, delta) => {
    if (hoveredIdx === null) return;
    if (hoveredIdx >= points.length) return;
    const core = coreRef.current;
    const glow = glowRef.current;
    if (!core || !glow) return;

    timeRef.current += delta;
    const pulse = 1.0 + Math.sin(timeRef.current * 4) * 0.15;
    const s = scales[hoveredIdx];

    DUMMY.position.copy(positions[hoveredIdx]);
    DUMMY.scale.setScalar(s * 1.6 * pulse);
    DUMMY.updateMatrix();
    core.setMatrixAt(hoveredIdx, DUMMY.matrix);
    core.instanceMatrix.needsUpdate = true;

    DUMMY.scale.setScalar(s * 3.5 * pulse);
    DUMMY.updateMatrix();
    glow.setMatrixAt(hoveredIdx, DUMMY.matrix);
    glow.instanceMatrix.needsUpdate = true;
  });

  const resetHoveredScale = useCallback(
    (idx: number) => {
      if (idx >= points.length) return;
      const core = coreRef.current;
      const glow = glowRef.current;
      if (!core || !glow) return;

      const s = scales[idx];
      DUMMY.position.copy(positions[idx]);
      DUMMY.scale.setScalar(s);
      DUMMY.updateMatrix();
      core.setMatrixAt(idx, DUMMY.matrix);
      core.instanceMatrix.needsUpdate = true;

      DUMMY.scale.setScalar(s * 2.5);
      DUMMY.updateMatrix();
      glow.setMatrixAt(idx, DUMMY.matrix);
      glow.instanceMatrix.needsUpdate = true;
    },
    [positions, scales, points.length],
  );

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const idx = e.instanceId;
      if (idx === undefined) return;
      setHoveredIdx((prev) => {
        if (prev !== null && prev !== idx) resetHoveredScale(prev);
        return idx;
      });
      document.body.style.cursor = "pointer";
    },
    [resetHoveredScale],
  );

  const handlePointerOut = useCallback(() => {
    setHoveredIdx((prev) => {
      if (prev !== null) resetHoveredScale(prev);
      return null;
    });
    document.body.style.cursor = "auto";
  }, [resetHoveredScale]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const idx = e.instanceId;
      if (idx === undefined || idx >= points.length) return;
      onSelect(points[idx]);
    },
    [onSelect, points],
  );
  /* v8 ignore stop */

  const hoveredPoint = hoveredIdx !== null && hoveredIdx < points.length ? points[hoveredIdx] : null;
  const hoveredPos = hoveredIdx !== null && hoveredIdx < positions.length ? positions[hoveredIdx] : null;
  const hoveredMeta =
    hoveredPoint ? CATEGORY_META[hoveredPoint.category] : null;

  const _v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    void _v;
    void camera;
  });

  if (points.length === 0) return null;

  return (
    <group key={meshKey}>
      <instancedMesh
        ref={glowRef}
        args={[GLOW_GEO, undefined, points.length]}
        frustumCulled={false}
        raycast={() => null}
      >
        <meshBasicMaterial
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={coreRef}
        args={[POINT_GEO, undefined, points.length]}
        frustumCulled={false}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshStandardMaterial
          emissive={_color.set("#ffffff")}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </instancedMesh>

      {hoveredPoint && hoveredPos && hoveredMeta && (
        <group position={hoveredPos}>
          <Html
            center
            distanceFactor={10}
            className="pointer-events-none"
          >
            <div
              className="bg-black/85 backdrop-blur-sm text-white py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap -translate-y-7 border border-[var(--cat-border)] shadow-[0_0_12px_var(--cat-shadow)]"
              style={
                {
                  "--cat-color": hoveredMeta.color,
                  "--cat-border": hoveredMeta.color + "40",
                  "--cat-shadow": hoveredMeta.color + "30",
                } as React.CSSProperties
              }
            >
              <span className="mr-1.5 text-[var(--cat-color)]">
                ●
              </span>
              {hoveredPoint.name}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
