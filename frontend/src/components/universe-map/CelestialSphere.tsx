import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";

const SPHERE_RADIUS = 5;
const MERIDIAN_COUNT = 12;
const PARALLEL_COUNT = 6;
const SEGMENTS = 128;

export function CelestialSphere() {
  const { meridians, parallels } = useMemo(() => {
    const merPoints: THREE.Vector3[][] = [];
    const parPoints: THREE.Vector3[][] = [];

    for (let i = 0; i < MERIDIAN_COUNT; i++) {
      const lon = (i / MERIDIAN_COUNT) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= SEGMENTS; j++) {
        const lat = (j / SEGMENTS) * Math.PI - Math.PI / 2;
        pts.push(
          new THREE.Vector3(
            SPHERE_RADIUS * Math.cos(lat) * Math.cos(lon),
            SPHERE_RADIUS * Math.sin(lat),
            SPHERE_RADIUS * Math.cos(lat) * Math.sin(lon),
          ),
        );
      }
      merPoints.push(pts);
    }

    for (let i = 1; i <= PARALLEL_COUNT; i++) {
      const lat = (i / (PARALLEL_COUNT + 1)) * Math.PI - Math.PI / 2;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= SEGMENTS; j++) {
        const lon = (j / SEGMENTS) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(
            SPHERE_RADIUS * Math.cos(lat) * Math.cos(lon),
            SPHERE_RADIUS * Math.sin(lat),
            SPHERE_RADIUS * Math.cos(lat) * Math.sin(lon),
          ),
        );
      }
      parPoints.push(pts);
    }

    const eqPts: THREE.Vector3[] = [];
    for (let j = 0; j <= SEGMENTS; j++) {
      const lon = (j / SEGMENTS) * Math.PI * 2;
      eqPts.push(
        new THREE.Vector3(
          SPHERE_RADIUS * Math.cos(lon),
          0,
          SPHERE_RADIUS * Math.sin(lon),
        ),
      );
    }
    parPoints.push(eqPts);

    return { meridians: merPoints, parallels: parPoints };
  }, []);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS * 0.995, 64, 64]} />
        <meshStandardMaterial
          color="#0a0e27"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {meridians.map((pts, i) => (
        <Line
          key={`mer-${i}`}
          points={pts}
          color="#38bdf8"
          lineWidth={0.6}
          transparent
          opacity={0.2}
        />
      ))}

      {parallels.map((pts, i) => {
        const isEquator = i === parallels.length - 1;
        return (
          <Line
            key={`par-${i}`}
            points={pts}
            color={isEquator ? "#67e8f9" : "#38bdf8"}
            lineWidth={isEquator ? 1.0 : 0.6}
            transparent
            opacity={isEquator ? 0.35 : 0.2}
          />
        );
      })}
    </group>
  );
}

export { SPHERE_RADIUS };
