import * as THREE from "three";
import type { CosmicCategory, CosmicPoint } from "./types";
import { ALL_CATEGORIES } from "./types";
import { ang2pixNest, parentPixel } from "./healpix";
import { SPHERE_RADIUS } from "./CelestialSphere";

export const MAX_HEALPIX_ORDER = 6;

export interface ClusterCell {
  pixel: number;
  order: number;
  members: CosmicPoint[];
  count: number;
  centerXYZ: THREE.Vector3;
  byCategory: Record<CosmicCategory, number>;
  dominant: CosmicCategory;
}

export interface ClusterIndex {
  groupAtOrder: (order: number) => ClusterCell[];
  pointPositions: THREE.Vector3[];
}

function emptyCategoryCount(): Record<CosmicCategory, number> {
  const out = {} as Record<CosmicCategory, number>;
  for (const c of ALL_CATEGORIES) out[c] = 0;
  return out;
}

function raDecToUnit(ra: number, dec: number): THREE.Vector3 {
  const phi = (dec * Math.PI) / 180;
  const theta = (ra * Math.PI) / 180;
  return new THREE.Vector3(
    Math.cos(phi) * Math.cos(theta),
    Math.sin(phi),
    Math.cos(phi) * Math.sin(theta)
  );
}

export function buildClusterIndex(points: CosmicPoint[]): ClusterIndex {
  const n = points.length;
  const maxOrder = MAX_HEALPIX_ORDER;
  const maxOrderPixels = new Int32Array(n);
  const positions: THREE.Vector3[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const p = points[i];
    maxOrderPixels[i] = ang2pixNest(maxOrder, p.ra, p.dec);
    const unit = raDecToUnit(p.ra, p.dec);
    positions[i] = unit.clone().multiplyScalar(SPHERE_RADIUS);
  }

  const cache = new Map<number, ClusterCell[]>();

  function groupAtOrder(order: number): ClusterCell[] {
    const o = Math.max(0, Math.min(maxOrder, Math.floor(order)));
    const cached = cache.get(o);
    if (cached) return cached;

    const groups = new Map<
      number,
      {
        members: CosmicPoint[];
        sum: THREE.Vector3;
        byCategory: Record<CosmicCategory, number>;
      }
    >();

    for (let i = 0; i < n; i++) {
      const parent = parentPixel(maxOrderPixels[i], maxOrder, o);
      let g = groups.get(parent);
      if (!g) {
        g = {
          members: [],
          sum: new THREE.Vector3(),
          byCategory: emptyCategoryCount()
        };
        groups.set(parent, g);
      }
      g.members.push(points[i]);
      g.sum.add(positions[i]);
      g.byCategory[points[i].category] += 1;
    }

    const cells: ClusterCell[] = [];
    groups.forEach((g, pixel) => {
      let dominant: CosmicCategory = ALL_CATEGORIES[0];
      let best = -1;
      for (const c of ALL_CATEGORIES) {
        if (g.byCategory[c] > best) {
          best = g.byCategory[c];
          dominant = c;
        }
      }
      const center = g.sum.clone().normalize().multiplyScalar(SPHERE_RADIUS);
      cells.push({
        pixel,
        order: o,
        members: g.members,
        count: g.members.length,
        centerXYZ: center,
        byCategory: g.byCategory,
        dominant
      });
    });

    cache.set(o, cells);
    return cells;
  }

  return { groupAtOrder, pointPositions: positions };
}

const ORDER_BANDS: Array<{ minDistance: number; order: number }> = [
  { minDistance: 18, order: 1 },
  { minDistance: 13, order: 2 },
  { minDistance: 9, order: 3 },
  { minDistance: 7, order: 4 },
  { minDistance: 0, order: 5 }
];

const HYSTERESIS = 0.4;

export function orderFromDistance(
  distance: number,
  currentOrder: number
): number {
  let candidate = MAX_HEALPIX_ORDER;
  for (const band of ORDER_BANDS) {
    if (distance > band.minDistance) {
      candidate = band.order;
      break;
    }
  }
  if (candidate === currentOrder) return currentOrder;

  const lowerBand = ORDER_BANDS.find(
    (b) => b.order === Math.min(candidate, currentOrder)
  );
  if (lowerBand && Math.abs(distance - lowerBand.minDistance) < HYSTERESIS) {
    return currentOrder;
  }
  return candidate;
}
