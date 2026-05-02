import { useRef, useMemo, useCallback, useState, useLayoutEffect } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import type { ClusterCell } from "./clusterIndex";
import { CATEGORY_META, ALL_CATEGORIES } from "./types";
import { SPHERE_RADIUS } from "./CelestialSphere";

const BUBBLE_GEO = new THREE.SphereGeometry(1, 18, 18);
const BUBBLE_GLOW_GEO = new THREE.SphereGeometry(1, 12, 12);
BUBBLE_GEO.computeBoundingSphere();
BUBBLE_GLOW_GEO.computeBoundingSphere();
if (BUBBLE_GEO.boundingSphere)
  BUBBLE_GEO.boundingSphere.radius = SPHERE_RADIUS + 2;
if (BUBBLE_GLOW_GEO.boundingSphere)
  BUBBLE_GLOW_GEO.boundingSphere.radius = SPHERE_RADIUS + 2;

const DUMMY = new THREE.Object3D();

function bubbleScale(count: number, maxCount: number): number {
  const t = Math.sqrt(count) / Math.sqrt(Math.max(2, maxCount));
  return 0.12 + 0.28 * Math.min(1, t);
}

interface Props {
  cells: ClusterCell[];
  onSelect: (cell: ClusterCell) => void;
}

export function ClusterMarkers({ cells, onSelect }: Props) {
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [prevCells, setPrevCells] = useState<ClusterCell[]>(cells);
  const { t } = useTranslation();

  if (cells !== prevCells) {
    setPrevCells(cells);
    setHoveredIdx(null);
  }

  const { scales, colors } = useMemo(() => {
    let maxCount = 0;
    for (const c of cells) if (c.count > maxCount) maxCount = c.count;
    const scl: number[] = [];
    const col: THREE.Color[] = [];
    for (const c of cells) {
      scl.push(bubbleScale(c.count, maxCount));
      col.push(new THREE.Color(CATEGORY_META[c.dominant].color));
    }
    return { scales: scl, colors: col };
  }, [cells]);

  const meshKey = cells.length;

  useLayoutEffect(() => {
    const core = coreRef.current;
    const glow = glowRef.current;
    if (!core || !glow || cells.length === 0) return;

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const s = scales[i];

      DUMMY.position.copy(c.centerXYZ);
      DUMMY.scale.setScalar(s);
      DUMMY.updateMatrix();
      core.setMatrixAt(i, DUMMY.matrix);
      core.setColorAt(i, colors[i]);

      DUMMY.scale.setScalar(s * 1.7);
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
  }, [cells, scales, colors, meshKey]);

  useLayoutEffect(() => {
    document.body.style.cursor = "auto";
  }, [cells]);

  /* v8 ignore start - WebGL event handlers cannot be tested in jsdom */
  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const idx = e.instanceId;
    if (idx === undefined) return;
    setHoveredIdx(idx);
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    setHoveredIdx(null);
    document.body.style.cursor = "auto";
  }, []);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const idx = e.instanceId;
      if (idx === undefined || idx >= cells.length) return;
      onSelect(cells[idx]);
    },
    [onSelect, cells]
  );
  /* v8 ignore stop */

  const hoveredCell =
    hoveredIdx !== null && hoveredIdx < cells.length ? cells[hoveredIdx] : null;
  const hoveredColor = hoveredCell
    ? CATEGORY_META[hoveredCell.dominant].color
    : null;

  if (cells.length === 0) return null;

  return (
    <group key={meshKey}>
      <instancedMesh
        ref={glowRef}
        args={[BUBBLE_GLOW_GEO, undefined, cells.length]}
        frustumCulled={false}
        raycast={() => null}
      >
        <meshBasicMaterial
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={coreRef}
        args={[BUBBLE_GEO, undefined, cells.length]}
        frustumCulled={false}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshBasicMaterial toneMapped={false} transparent opacity={0.95} />
      </instancedMesh>

      {hoveredCell && hoveredColor && (
        <group position={hoveredCell.centerXYZ}>
          <Html center distanceFactor={10} className="pointer-events-none">
            <div
              className="bg-black/85 backdrop-blur-sm text-white py-2 px-3 rounded-lg text-xs whitespace-nowrap -translate-y-9 border shadow-[0_0_14px_var(--cat-shadow)]"
              style={
                {
                  "--cat-color": hoveredColor,
                  "--cat-shadow": hoveredColor + "40",
                  borderColor: hoveredColor + "55"
                } as React.CSSProperties
              }
            >
              <div className="font-semibold mb-0.5">
                <span className="mr-1.5 text-[var(--cat-color)]">●</span>
                {t("universeMap.cluster.tooltip", { count: hoveredCell.count })}
              </div>
              <div className="text-[10px] text-white/70 leading-relaxed">
                {ALL_CATEGORIES.filter(
                  (c) => hoveredCell.byCategory[c] > 0
                ).map((c, i, arr) => (
                  <span key={c}>
                    <span style={{ color: CATEGORY_META[c].color }}>
                      {CATEGORY_META[c].label}
                    </span>{" "}
                    {hoveredCell.byCategory[c]}
                    {i < arr.length - 1 ? " · " : ""}
                  </span>
                ))}
              </div>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
