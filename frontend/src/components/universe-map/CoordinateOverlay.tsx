import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

function calcCoordsFromCamera(camera: THREE.Camera) {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  const dec = THREE.MathUtils.radToDeg(Math.asin(dir.y));
  let ra = THREE.MathUtils.radToDeg(Math.atan2(dir.z, dir.x));
  if (ra < 0) ra += 360;

  return { ra: Math.round(ra * 10) / 10, dec: Math.round(dec * 10) / 10 };
}

export function CoordinateOverlay() {
  const { camera } = useThree();
  const [coords, setCoords] = useState(() => calcCoordsFromCamera(camera));
  const lastUpdate = useRef(0);

  useFrame(() => {
    const now = performance.now();
    if (now - lastUpdate.current < 50) return;
    lastUpdate.current = now;
    const c = calcCoordsFromCamera(camera);
    setCoords((prev) => {
      if (prev.ra === c.ra && prev.dec === c.dec) return prev;
      return c;
    });
  });

  return (
    <Html fullscreen className="pointer-events-none">
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-6 bg-black/70 backdrop-blur-md px-6 py-2.5 rounded-xl border border-sky-400/20 font-mono text-slate-200 text-[13px] font-medium select-none">
        <span>
          RA{" "}
          <span className="text-sky-400 font-bold">
            {coords.ra.toFixed(1)}°
          </span>
        </span>
        <span className="text-white/20">|</span>
        <span>
          Dec{" "}
          <span className="text-cyan-300 font-bold">
            {coords.dec > 0 ? "+" : ""}
            {coords.dec.toFixed(1)}°
          </span>
        </span>
      </div>
    </Html>
  );
}
