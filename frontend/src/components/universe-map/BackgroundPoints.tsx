import { useRef, useMemo, useLayoutEffect } from "react";
import * as THREE from "three";
import type { CosmicPoint as CosmicPointType } from "./types";
import { CATEGORY_META } from "./types";
import { SPHERE_RADIUS } from "./CelestialSphere";

const BG_GEO = new THREE.SphereGeometry(1, 6, 6);
BG_GEO.computeBoundingSphere();
if (BG_GEO.boundingSphere) BG_GEO.boundingSphere.radius = SPHERE_RADIUS + 1;

const DUMMY = new THREE.Object3D();

function raDecToOuter(ra: number, dec: number): THREE.Vector3 {
  const phi = (dec * Math.PI) / 180;
  const theta = (ra * Math.PI) / 180;
  return new THREE.Vector3(
    SPHERE_RADIUS * Math.cos(phi) * Math.cos(theta),
    SPHERE_RADIUS * Math.sin(phi),
    SPHERE_RADIUS * Math.cos(phi) * Math.sin(theta),
  );
}

interface Props {
  points: CosmicPointType[];
}

export function BackgroundPoints({ points }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const { positions, colors } = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    const col: THREE.Color[] = [];
    for (const p of points) {
      pos.push(raDecToOuter(p.ra, p.dec));
      col.push(new THREE.Color(CATEGORY_META[p.category].color));
    }
    return { positions: pos, colors: col };
  }, [points]);

  const meshKey = points.length;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || points.length === 0) return;
    for (let i = 0; i < points.length; i++) {
      DUMMY.position.copy(positions[i]);
      DUMMY.scale.setScalar(0.018);
      DUMMY.updateMatrix();
      mesh.setMatrixAt(i, DUMMY.matrix);
      mesh.setColorAt(i, colors[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [points, positions, colors, meshKey]);

  if (points.length === 0) return null;

  return (
    <instancedMesh
      key={meshKey}
      ref={meshRef}
      args={[BG_GEO, undefined, points.length]}
      frustumCulled={false}
      raycast={() => null}
    >
      <meshBasicMaterial
        transparent
        opacity={0.12}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
