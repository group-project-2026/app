import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { CelestialSphere } from "./CelestialSphere";
import { CoordinateOverlay } from "./CoordinateOverlay";
import { PointDetailPanel } from "./PointDetailPanel";
import { Legend } from "./Legend";
import { Filters } from "./Filters";
import { HierarchicalSky, type CellCounts } from "./HierarchicalSky";
import { CameraTweenDriver, type CameraTween } from "./cameraTween";
import { useUniverseMapPoints } from "./useUniverseMapPoints";
import type { CosmicCategory, CosmicPoint } from "./types";
import type { ClusterCell } from "./clusterIndex";
import { ALL_CATEGORIES } from "./types";

export function UniverseMap() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useUniverseMapPoints();
  const [selectedPoint, setSelectedPoint] = useState<CosmicPoint | null>(null);
  const [focusedCell, setFocusedCell] = useState<ClusterCell | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<CosmicCategory>>(
    () => new Set(ALL_CATEGORIES)
  );

  const tweenRef = useRef<CameraTween | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [cellCounts, setCellCounts] = useState<CellCounts>({
    clusters: 0,
    points: 0
  });

  const allPoints = useMemo(() => data ?? [], [data]);

  const filteredPoints = useMemo(
    () => allPoints.filter((p) => activeCategories.has(p.category)),
    [allPoints, activeCategories]
  );

  const handleSelectPoint = useCallback((point: CosmicPoint) => {
    setSelectedPoint(point);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedPoint(null);
  }, []);

  const handleClearFocus = useCallback(() => {
    setFocusedCell(null);
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
    setFocusedCell(null);
  }, []);

  useEffect(() => {
    if (!focusedCell) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusedCell(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedCell]);

  const panelOpen = selectedPoint !== null;
  const focused = focusedCell !== null;

  return (
    <div className="flex w-full h-full bg-[#030712]">
      <div
        className={`relative h-full transition-all duration-300 ease-in-out ${panelOpen ? "w-[calc(100%-420px)]" : "w-full"}`}
      >
        <Canvas
          camera={{ position: [0, 3, 15], fov: 50, near: 0.1, far: 100 }}
          className="w-full h-full"
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl }) => {
            gl.setClearColor("#030712");
          }}
          onPointerMissed={handleClearFocus}
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
          <HierarchicalSky
            points={filteredPoints}
            onSelectPoint={handleSelectPoint}
            cameraTweenRef={tweenRef}
            focusedCell={focusedCell}
            onFocusChange={setFocusedCell}
            onCellCountsChange={setCellCounts}
          />
          <CoordinateOverlay />
          <CameraTweenDriver tweenRef={tweenRef} controlsRef={controlsRef} />
          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5.5}
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

        {isLoading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-lg border border-white/10 bg-black/70 backdrop-blur-xl px-4 py-2 text-xs text-white/70">
            {t("universeMap.loading")}
          </div>
        )}

        {isError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-lg border border-red-500/40 bg-red-950/60 backdrop-blur-xl px-4 py-2 text-xs text-red-200">
            {t("universeMap.errorLoading", { message: error?.message ?? "" })}
          </div>
        )}

        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 text-[11px] text-white/25 select-none pointer-events-none whitespace-nowrap">
          {t("universeMap.instructions")}
        </div>

        {focused && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-black/75 backdrop-blur-md px-4 py-2 rounded-xl border border-amber-300/30 shadow-[0_0_18px_rgba(252,211,77,0.18)] text-[12px] text-slate-100 font-medium">
            <span className="text-amber-300/80 uppercase tracking-wider text-[10px]">
              {t("universeMap.focus.label")}
            </span>
            <span>
              {t("universeMap.focus.count", { count: focusedCell.count })}
            </span>
            <button
              type="button"
              onClick={handleClearFocus}
              className="ml-1 grid place-items-center w-5 h-5 rounded-full bg-white/8 hover:bg-white/20 transition-colors text-white/80 hover:text-white text-[14px] leading-none cursor-pointer"
              aria-label={t("universeMap.focus.exit")}
              title={t("universeMap.focus.exitHint")}
            >
              ×
            </button>
          </div>
        )}

        <div className="absolute bottom-4 left-4 z-10 text-[11px] text-white/40 select-none pointer-events-none">
          {t("universeMap.pointsCount", {
            clusters: cellCounts.clusters,
            points: cellCounts.points,
            shown: filteredPoints.length,
            total: allPoints.length
          })}
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
