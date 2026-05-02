import { type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface CameraTween {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  start: number;
  duration: number;
}

export type CameraTweenRef = { current: CameraTween | null };

interface OrbitControlsLike {
  update: () => void;
}

interface Props {
  tweenRef: CameraTweenRef;
  controlsRef: RefObject<OrbitControlsLike | null>;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function CameraTweenDriver({ tweenRef, controlsRef }: Props) {
  /* v8 ignore start - useFrame loop cannot be tested in jsdom */
  useFrame((state) => {
    const tw = tweenRef.current;
    if (!tw) return;
    const now = performance.now();
    const t = Math.min(1, (now - tw.start) / tw.duration);
    const eased = easeInOut(t);
    state.camera.position.lerpVectors(tw.fromPos, tw.toPos, eased);
    controlsRef.current?.update();
    if (t >= 1) tweenRef.current = null;
  });
  /* v8 ignore stop */

  return null;
}
