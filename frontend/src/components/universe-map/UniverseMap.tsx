import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { CelestialSphere } from "./CelestialSphere";
import { CosmicPoints } from "./CosmicPoint";
import { CoordinateOverlay } from "./CoordinateOverlay";
import { PointDetailPanel } from "./PointDetailPanel";
import { Legend } from "./Legend";
import { Filters } from "./Filters";
import { MOCK_POINTS } from "./data/mock-points";
import type { CosmicCategory, CosmicPoint } from "./types";
import { CATEGORY_META } from "./types";

const ALL_CATEGORIES = new Set(Object.keys(CATEGORY_META) as CosmicCategory[]);

export function UniverseMap() {
  const { t } = useTranslation();
  const [selectedPoint, setSelectedPoint] = useState<CosmicPoint | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<CosmicCategory>>(
    new Set(ALL_CATEGORIES)
  );

  const filteredPoints = useMemo(
    () => MOCK_POINTS.filter((p) => activeCategories.has(p.category)),
    [activeCategories]
  );

  const handleSelectPoint = useCallback((point: CosmicPoint) => {
    setSelectedPoint(point);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedPoint(null);
  }, []);

  const handleToggleCategory = useCallback((category: CosmicCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const panelOpen = selectedPoint !== null;

  return (
    <div className="flex w-full h-full bg-[#030712]">
      <div
        className={`relative h-full transition-all duration-300 ease-in-out ${panelOpen ? "w-[calc(100%-420px)]" : "w-full"}`}
      >
        <Canvas
          camera={{ position: [0, 2, 12], fov: 50, near: 0.1, far: 100 }}
          className="w-full h-full"
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl }) => {
            gl.setClearColor("#030712");
          }}
        >
          <Stars
            radius={50}
            depth={60}
            count={4000}
            factor={3}
            saturation={0}
            fade
            speed={0.5}
          />
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />

          <CelestialSphere />
          <CosmicPoints points={filteredPoints} onSelect={handleSelectPoint} />
          <CoordinateOverlay />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={25}
            zoomSpeed={0.8}
            rotateSpeed={0.5}
            panSpeed={0.5}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>
        <Legend />
        <Filters
          activeCategories={activeCategories}
          onToggle={handleToggleCategory}
        />

        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 text-[11px] text-white/25 select-none pointer-events-none whitespace-nowrap">
          {t("universeMap.instructions")}
        </div>
      </div>
      {panelOpen && (
        <div className="h-full shrink-0 animate-in slide-in-from-right-4 duration-300 w-[420px]">
          <PointDetailPanel point={selectedPoint} onClose={handleCloseDetail} />
        </div>
      )}
    </div>
  );
}
