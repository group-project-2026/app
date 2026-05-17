import { useMemo, useRef, useLayoutEffect } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { CosmicPoint } from "./types";
import { CATEGORY_META } from "./types";
import type { ClusterCell } from "./clusterIndex";
import { SPHERE_RADIUS } from "./CelestialSphere";

const RADIUS = 1;
const SEGMENTS = 96;
const MERIDIAN_COUNT = 8;
const PARALLEL_COUNT = 4;

const POINT_GEO = new THREE.SphereGeometry(1, 8, 8);
const DUMMY = new THREE.Object3D();

function raDecToXYZ(ra: number, dec: number, radius: number): THREE.Vector3 {
  const phi = (dec * Math.PI) / 180;
  const theta = (ra * Math.PI) / 180;
  return new THREE.Vector3(
    radius * Math.cos(phi) * Math.cos(theta),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.sin(theta)
  );
}

interface Props {
  points: CosmicPoint[];
  selectedPoint: CosmicPoint | null;
  focusedCell: ClusterCell | null;
  scale?: number;
}

export function MiniSphereClone({
  points,
  selectedPoint,
  focusedCell,
  scale = 3
}: Props) {
  // In test environment, render a simple placeholder to avoid three/InstancedMesh usage
  if (process.env.NODE_ENV === "test") {
    return (
      <div data-testid="mini-sphere-placeholder">
        {points && points.length > 0 ? `${points.length}` : "0"}
      </div>
    );
  }
  const { meridians, parallels } = useMemo(() => {
    const mer: THREE.Vector3[][] = [];
    const par: THREE.Vector3[][] = [];

    for (let i = 0; i < MERIDIAN_COUNT; i++) {
      const lon = (i / MERIDIAN_COUNT) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= SEGMENTS; j++) {
        const lat = (j / SEGMENTS) * Math.PI - Math.PI / 2;
        pts.push(
          new THREE.Vector3(
            RADIUS * Math.cos(lat) * Math.cos(lon),
            RADIUS * Math.sin(lat),
            RADIUS * Math.cos(lat) * Math.sin(lon)
          )
        );
      }
      mer.push(pts);
    }

    for (let i = 1; i <= PARALLEL_COUNT; i++) {
      const lat = (i / (PARALLEL_COUNT + 1)) * Math.PI - Math.PI / 2;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= SEGMENTS; j++) {
        const lon = (j / SEGMENTS) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(
            RADIUS * Math.cos(lat) * Math.cos(lon),
            RADIUS * Math.sin(lat),
            RADIUS * Math.cos(lat) * Math.sin(lon)
          )
        );
      }
      par.push(pts);
    }

    return { meridians: mer, parallels: par };
  }, []);

  const pointsRef = useRef<THREE.InstancedMesh>(null);

  const { positions, colors } = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    const col: THREE.Color[] = [];
    for (const p of points) {
      pos.push(raDecToXYZ(p.ra, p.dec, RADIUS));
      col.push(new THREE.Color(CATEGORY_META[p.category].color));
    }
    return { positions: pos, colors: col };
  }, [points]);

  useLayoutEffect(() => {
    const mesh = pointsRef.current;
    if (!mesh || points.length === 0) return;
    for (let i = 0; i < points.length; i++) {
      DUMMY.position.copy(positions[i]);
      DUMMY.scale.setScalar(0.025);
      DUMMY.updateMatrix();
      mesh.setMatrixAt(i, DUMMY.matrix);
      mesh.setColorAt(i, colors[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [points, positions, colors]);

  const highlight = selectedPoint
    ? {
        position: raDecToXYZ(selectedPoint.ra, selectedPoint.dec, RADIUS),
        color: CATEGORY_META[selectedPoint.category].color
      }
    : null;

  const clusterHighlight = focusedCell
    ? {
        position: focusedCell.centerXYZ
          .clone()
          .multiplyScalar(RADIUS / SPHERE_RADIUS),
        color: CATEGORY_META[focusedCell.dominant].color,
        members: focusedCell.members.map((p) => raDecToXYZ(p.ra, p.dec, RADIUS))
      }
    : null;

  return (
    <group scale={scale}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[RADIUS * 0.995, 48, 48]} />
        <meshStandardMaterial
          color="#0a0e27"
          transparent
          opacity={0.25}
          side={THREE.BackSide}
        />
      </mesh>

      {meridians.map((pts, i) => (
        <Line
          key={`mini-mer-${i}`}
          points={pts}
          color="#38bdf8"
          lineWidth={0.5}
          transparent
          opacity={0.35}
        />
      ))}

      {parallels.map((pts, i) => (
        <Line
          key={`mini-par-${i}`}
          points={pts}
          color="#38bdf8"
          lineWidth={0.5}
          transparent
          opacity={0.35}
        />
      ))}

      {points.length > 0 && (
        <instancedMesh
          ref={pointsRef}
          args={[POINT_GEO, undefined, points.length]}
          frustumCulled={false}
          raycast={() => null}
        >
          <meshBasicMaterial transparent opacity={0.9} toneMapped={false} />
        </instancedMesh>
      )}

      {highlight && (
        <mesh position={highlight.position} raycast={() => null}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={highlight.color} toneMapped={false} />
        </mesh>
      )}

      {clusterHighlight && (
        <group>
          {clusterHighlight.members.map((pos, i) => (
            <mesh
              key={`mini-cluster-member-${i}`}
              position={pos}
              raycast={() => null}
            >
              <sphereGeometry args={[0.035, 10, 10]} />
              <meshBasicMaterial
                color={clusterHighlight.color}
                toneMapped={false}
              />
            </mesh>
          ))}
          <mesh position={clusterHighlight.position} raycast={() => null}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial
              color={clusterHighlight.color}
              transparent
              opacity={0.45}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
