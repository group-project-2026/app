import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CosmicPoint } from "./types";
import {
  buildClusterIndex,
  orderFromDistance,
  type ClusterCell
} from "./clusterIndex";
import { CosmicPoints } from "./CosmicPoint";
import { ClusterMarkers } from "./ClusterMarkers";
import { BackgroundPoints } from "./BackgroundPoints";
import type { CameraTweenRef } from "./cameraTween";

export interface CellCounts {
  clusters: number;
  points: number;
}

interface Props {
  points: CosmicPoint[];
  onSelectPoint: (p: CosmicPoint) => void;
  cameraTweenRef: CameraTweenRef;
  focusedCell: ClusterCell | null;
  onFocusChange: (cell: ClusterCell | null) => void;
  onCellCountsChange?: (counts: CellCounts) => void;
}

export function HierarchicalSky({
  points,
  onSelectPoint,
  cameraTweenRef,
  focusedCell,
  onFocusChange,
  onCellCountsChange
}: Props) {
  const { camera } = useThree();
  const index = useMemo(() => buildClusterIndex(points), [points]);
  const [order, setOrder] = useState<number>(() => {
    const d = camera.position.length();
    return orderFromDistance(d, 1);
  });

  const lastTickRef = useRef(0);

  useFrame(() => {
    if (focusedCell) return;
    const now = performance.now();
    if (now - lastTickRef.current < 150) return;
    lastTickRef.current = now;
    const d = camera.position.length();
    setOrder((prev) => {
      const next = orderFromDistance(d, prev);
      return next === prev ? prev : next;
    });
  });

  const { clusterCells, singletonPoints } = useMemo(() => {
    const cells = index.groupAtOrder(order);
    const clusters: ClusterCell[] = [];
    const singles: CosmicPoint[] = [];
    for (const c of cells) {
      if (c.count === 1) singles.push(c.members[0]);
      else clusters.push(c);
    }
    return { clusterCells: clusters, singletonPoints: singles };
  }, [index, order]);

  const focusedMembers = focusedCell?.members ?? null;
  const backgroundPoints = useMemo(() => {
    if (!focusedMembers) return [];
    const focusedIds = new Set(focusedMembers.map((p) => p.id));
    return points.filter((p) => !focusedIds.has(p.id));
  }, [points, focusedMembers]);

  useEffect(() => {
    if (focusedCell) {
      onCellCountsChange?.({
        clusters: 0,
        points: focusedCell.count
      });
    } else {
      onCellCountsChange?.({
        clusters: clusterCells.length,
        points: singletonPoints.length
      });
    }
  }, [
    focusedCell,
    clusterCells.length,
    singletonPoints.length,
    onCellCountsChange
  ]);

  const handleClusterClick = useCallback(
    (cell: ClusterCell) => {
      const cam = camera as THREE.PerspectiveCamera;
      const currentDistance = cam.position.length();
      const nextDistance = Math.max(5.5, currentDistance * 0.7);
      const toPos = cell.centerXYZ
        .clone()
        .normalize()
        .multiplyScalar(nextDistance);
      cameraTweenRef.current = {
        fromPos: cam.position.clone(),
        toPos,
        start: performance.now(),
        duration: 600
      };
      onFocusChange(cell);
    },
    [camera, cameraTweenRef, onFocusChange]
  );

  if (focusedCell) {
    return (
      <>
        <BackgroundPoints points={backgroundPoints} />
        <CosmicPoints points={focusedCell.members} onSelect={onSelectPoint} />
      </>
    );
  }

  return (
    <>
      <CosmicPoints points={singletonPoints} onSelect={onSelectPoint} />
      <ClusterMarkers cells={clusterCells} onSelect={handleClusterClick} />
    </>
  );
}
