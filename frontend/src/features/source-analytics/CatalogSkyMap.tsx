import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEventHandler
} from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  geoEquirectangular,
  geoOrthographic,
  scaleSqrt,
  geoPath,
  geoGraticule,
  select as d3Select,
  type GeoProjection
} from "d3";
import { geoAitoff, geoMollweide } from "d3-geo-projection";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString
} from "geojson";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { CatalogName } from "../sources/types";
import {
  fetchSourceAnalyticsMap,
  SOURCE_CATALOG_META,
  type SourceAnalyticsMapData,
  type SourceMapPoint
} from "./api";

type ProjectionKey =
  | "aitoff"
  | "mollweide"
  | "orthographic"
  | "equirectangular";
type CoordinateSystem = "equatorial" | "galactic";

interface CatalogSkyMapProps {
  selectedCatalogs: CatalogName[];
}

interface ProjectedPoint {
  point: SourceMapPoint;
  x: number;
  y: number;
  radius: number;
}

type SkyRotation = [number, number, number];

const DEFAULT_ROTATION: SkyRotation = [0, 0, 0];
const ROTATION_SENSITIVITY = 0.28;
const MAX_LATITUDE_ROTATION = 89;
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 3;
const ZOOM_SENSITIVITY = 0.15;

const PROJECTION_OPTIONS: Array<{ value: ProjectionKey; labelKey: string }> = [
  { value: "aitoff", labelKey: "analytics.map.projections.aitoff" },
  { value: "mollweide", labelKey: "analytics.map.projections.mollweide" },
  { value: "orthographic", labelKey: "analytics.map.projections.orthographic" },
  {
    value: "equirectangular",
    labelKey: "analytics.map.projections.equirectangular"
  }
];

function wrapLongitude(value: number): number {
  const wrapped = ((((value + 180) % 360) + 360) % 360) - 180;
  return wrapped;
}

function equatorialToGalactic(raDeg: number, decDeg: number): [number, number] {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const alphaNgp = (192.85948 * Math.PI) / 180;
  const deltaNgp = (27.12825 * Math.PI) / 180;
  const lOmega = (32.93192 * Math.PI) / 180;

  const sinB =
    Math.sin(dec) * Math.sin(deltaNgp) +
    Math.cos(dec) * Math.cos(deltaNgp) * Math.cos(ra - alphaNgp);
  const b = Math.asin(Math.max(-1, Math.min(1, sinB)));

  const y = Math.cos(dec) * Math.sin(ra - alphaNgp);
  const x =
    Math.sin(dec) * Math.cos(deltaNgp) -
    Math.cos(dec) * Math.sin(deltaNgp) * Math.cos(ra - alphaNgp);
  const l = Math.atan2(y, x) + lOmega;

  const lDeg = ((((l * 180) / Math.PI) % 360) + 360) % 360;
  const bDeg = (b * 180) / Math.PI;
  return [lDeg, bDeg];
}

function toProjectionCoords(
  point: SourceMapPoint,
  coordinateSystem: CoordinateSystem
): [number, number] {
  if (coordinateSystem === "galactic") {
    const [l, b] = equatorialToGalactic(point.ra, point.dec);
    return [-wrapLongitude(l), b];
  }

  return [-wrapLongitude(point.ra), point.dec];
}

function createProjection(
  key: ProjectionKey,
  width: number,
  height: number,
  rotation: SkyRotation,
  zoom: number = 1
): GeoProjection {
  const margin = 12;
  const maxScale = Math.min(width, height) * 0.34 * zoom;

  if (key === "orthographic") {
    return geoOrthographic()
      .rotate(rotation)
      .translate([width / 2, height / 2])
      .scale(maxScale)
      .clipAngle(90);
  }

  if (key === "mollweide") {
    const proj = geoMollweide()
      .rotate(rotation)
      .fitExtent(
        [
          [margin, margin],
          [width - margin, height - margin]
        ],
        { type: "Sphere" }
      )
      .precision(0.2);
    return proj.scale(proj.scale() * zoom);
  }

  if (key === "equirectangular") {
    const proj = geoEquirectangular()
      .rotate(rotation)
      .fitExtent(
        [
          [margin, margin],
          [width - margin, height - margin]
        ],
        { type: "Sphere" }
      )
      .precision(0.2);
    return proj.scale(proj.scale() * zoom);
  }

  const proj = geoAitoff()
    .rotate(rotation)
    .fitExtent(
      [
        [margin, margin],
        [width - margin, height - margin]
      ],
      { type: "Sphere" }
    )
    .precision(0.2);
  return proj.scale(proj.scale() * zoom);
}

// Simplified Milky Way outline (visual reference)
function getMilkyWayOutline() {
  return {
    type: "Feature",
    geometry: {
      type: "MultiLineString",
      coordinates: [
        // Galactic plane
        [
          [-180, 0],
          [-90, 0],
          [0, 0],
          [90, 0],
          [180, 0]
        ],
        // Galactic bulge region (~-30 to -10 RA)
        [
          [-30, -5],
          [-25, -8],
          [-20, -10],
          [-15, -8],
          [-10, -5]
        ],
        // Andromeda region (~40-50 RA, ~40+ DEC)
        [
          [40, 40],
          [45, 42],
          [50, 43],
          [55, 42]
        ]
      ]
    }
  } as Feature<MultiLineString>;
}

// Create constellation boundary grid
function getConstellationGrid() {
  const features: Array<Feature<LineString>> = [];
  const raStep = 30; // RA steps in degrees
  const decStep = 30; // DEC steps in degrees

  // RA meridian lines
  for (let ra = -180; ra <= 180; ra += raStep) {
    const coords = [];
    for (let dec = -90; dec <= 90; dec += 5) {
      coords.push([ra, dec]);
    }
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {}
    });
  }

  // DEC parallel lines
  for (let dec = -60; dec <= 60; dec += decStep) {
    const coords = [];
    for (let ra = -180; ra <= 180; ra += 5) {
      coords.push([ra, dec]);
    }
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {}
    });
  }

  return {
    type: "FeatureCollection",
    features
  } as FeatureCollection<LineString>;
}

// Create graticule labels (RA/DEC text markers)
function getGraticuleLabelPoints(
  projection: GeoProjection,
  width: number,
  height: number
) {
  const labels = [];
  const raSteps = [0, 30, 60, 90, 120, 150, 180, -150, -120, -90, -60, -30];
  const decSteps = [-60, -30, 0, 30, 60];

  // RA labels on bottom
  for (const ra of raSteps) {
    const projected = projection([-ra, -60]);
    if (projected && projected[0] >= 0 && projected[0] <= width) {
      labels.push({
        x: projected[0],
        y: height - 6,
        text: `${Math.abs(ra)}°`,
        anchor: "middle"
      });
    }
  }

  // DEC labels on left
  for (const dec of decSteps) {
    const projected = projection([180, dec]);
    if (projected && projected[1] >= 0 && projected[1] <= height) {
      labels.push({
        x: 6,
        y: projected[1],
        text: `${dec}°`,
        anchor: "start"
      });
    }
  }

  return labels;
}

function formatStat(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return value.toFixed(2);
}

export function CatalogSkyMap({ selectedCatalogs }: CatalogSkyMapProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const projectedPointsRef = useRef<ProjectedPoint[]>([]);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragRotationRef = useRef<SkyRotation>(DEFAULT_ROTATION);
  const dragPointerIdRef = useRef<number | null>(null);
  const didDragRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [projectionKey, setProjectionKey] = useState<ProjectionKey>("aitoff");
  const [coordinateSystem, setCoordinateSystem] =
    useState<CoordinateSystem>("equatorial");
  const [projectionRotation, setProjectionRotation] =
    useState<SkyRotation>(DEFAULT_ROTATION);
  const [zoomScale, setZoomScale] = useState(1);
  const [hoveredPoint, setHoveredPoint] = useState<SourceMapPoint | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [selectedPoint, setSelectedPoint] = useState<SourceMapPoint | null>(
    null
  );
  const [hiddenCatalogs, setHiddenCatalogs] = useState<CatalogName[]>([]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setMapSize({
        width: Math.max(320, Math.floor(entry.contentRect.width)),
        height: Math.max(360, Math.floor(entry.contentRect.height))
      });
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Render SVG celestial overlays (graticule, MW, constellations)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || mapSize.width <= 0 || mapSize.height <= 0) {
      return;
    }

    const projection = createProjection(
      projectionKey,
      mapSize.width,
      mapSize.height,
      projectionRotation,
      zoomScale
    );

    const pathGenerator = geoPath(projection);

    // Clear SVG
    d3Select(svg).selectAll("*").remove();

    const g = d3Select(svg)
      .attr("width", mapSize.width)
      .attr("height", mapSize.height)
      .append("g");

    // Render Milky Way outline
    const mw = getMilkyWayOutline();
    g.selectAll(".milkyway")
      .data([mw])
      .enter()
      .append("path")
      .attr("class", "milkyway")
      .attr("d", pathGenerator)
      .attr("fill", "none")
      .attr("stroke", "rgba(200, 150, 100, 0.4)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,4");

    // Render constellation grid
    const grid = getConstellationGrid();
    g.selectAll(".constgrid")
      .data(grid.features)
      .enter()
      .append("path")
      .attr("class", "constgrid")
      .attr("d", pathGenerator)
      .attr("fill", "none")
      .attr("stroke", "rgba(100, 150, 200, 0.15)")
      .attr("stroke-width", 0.8);

    // Render graticule (major lines)
    const graticule = geoGraticule()
      .step([30, 30])
      .extentMajor([
        [-180, -90],
        [180, 90]
      ]);
    g.append("path")
      .datum(graticule())
      .attr("class", "graticule-major")
      .attr("d", pathGenerator)
      .attr("fill", "none")
      .attr("stroke", "rgba(148, 163, 184, 0.2)")
      .attr("stroke-width", 0.6);

    // Render graticule labels
    const labels = getGraticuleLabelPoints(
      projection,
      mapSize.width,
      mapSize.height
    );
    g.selectAll(".graticule-label")
      .data(labels)
      .enter()
      .append("text")
      .attr("class", "graticule-label")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("text-anchor", (d) => d.anchor)
      .attr("dominant-baseline", "middle")
      .attr("font-size", "10px")
      .attr("fill", "rgba(148, 163, 184, 0.6)")
      .text((d) => d.text);

    // Render ecliptic plane reference
    const eclipticCoords: LineString["coordinates"] = [];
    for (let ra = -180; ra <= 180; ra += 5) {
      eclipticCoords.push([ra, 0]);
    }
    const eclipticLine: Feature<LineString> = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: eclipticCoords },
      properties: {}
    };
    g.append("path")
      .datum(eclipticLine)
      .attr("class", "ecliptic")
      .attr("d", pathGenerator)
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 200, 100, 0.25)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "2,3");
  }, [mapSize, projectionKey, projectionRotation, zoomScale]);

  const mapQuery = useQuery<SourceAnalyticsMapData, Error>({
    queryKey: ["source-analytics-map", selectedCatalogs],
    queryFn: () =>
      fetchSourceAnalyticsMap({
        catalogs: selectedCatalogs
      }),
    staleTime: 60 * 1000,
    enabled: selectedCatalogs.length > 0
  });

  const visiblePoints = useMemo(() => {
    const points = mapQuery.data?.points ?? [];
    return points.filter(
      (point) => !hiddenCatalogs.includes(point.primary_catalog)
    );
  }, [hiddenCatalogs, mapQuery.data?.points]);

  const maxSignificance = useMemo(() => {
    const values = visiblePoints
      .map((point) => point.significance ?? 0)
      .filter((value) => Number.isFinite(value) && value > 0);
    return values.length === 0 ? 1 : Math.max(...values, 1);
  }, [visiblePoints]);

  const formatMagicStatus = (point: SourceMapPoint): string => {
    if (typeof point.magic_significance !== "number") {
      return t("analytics.magic.statusUnavailable");
    }

    if (point.magic_detectable) {
      return t("analytics.magic.statusDetectable");
    }

    return t("analytics.magic.statusNotDetectable");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mapSize.width <= 0 || mapSize.height <= 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(mapSize.width * dpr);
    canvas.height = Math.floor(mapSize.height * dpr);
    canvas.style.width = `${mapSize.width}px`;
    canvas.style.height = `${mapSize.height}px`;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(() => {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, mapSize.width, mapSize.height);

      const projection = createProjection(
        projectionKey,
        mapSize.width,
        mapSize.height,
        projectionRotation,
        zoomScale
      );
      const radiusScale = scaleSqrt()
        .domain([0, maxSignificance])
        .range([1.8, 6.4]);

      const plotted: ProjectedPoint[] = [];

      context.save();
      context.fillStyle = "rgba(15, 23, 42, 0.6)";
      context.strokeStyle = "rgba(148, 163, 184, 0.35)";
      context.lineWidth = 1;
      context.beginPath();
      context.rect(0, 0, mapSize.width, mapSize.height);
      context.fill();

      context.beginPath();
      context.strokeStyle = "rgba(148, 163, 184, 0.25)";
      const horizontalLines = [-60, -30, 0, 30, 60];
      for (const lat of horizontalLines) {
        const first = projection([-180, lat]);
        const second = projection([180, lat]);
        if (first && second) {
          context.moveTo(first[0], first[1]);
          context.lineTo(second[0], second[1]);
        }
      }
      context.stroke();

      for (const point of visiblePoints) {
        const coords = toProjectionCoords(point, coordinateSystem);
        const projected = projection(coords);
        if (!projected) {
          continue;
        }

        const x = projected[0];
        const y = projected[1];
        const baseRadius = radiusScale(Math.max(0, point.significance ?? 0));
        const radius = Math.max(1.2, baseRadius);

        context.beginPath();
        context.fillStyle = SOURCE_CATALOG_META[point.primary_catalog].color;
        context.globalAlpha = 0.82;
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;

        plotted.push({ point, x, y, radius });
      }

      if (selectedPoint) {
        const selected = plotted.find(
          (item) => item.point.id === selectedPoint.id
        );
        if (selected) {
          context.beginPath();
          context.strokeStyle = "#f8fafc";
          context.lineWidth = 1.5;
          context.arc(
            selected.x,
            selected.y,
            selected.radius + 2.5,
            0,
            Math.PI * 2
          );
          context.stroke();
        }
      }

      projectedPointsRef.current = plotted;
      context.restore();
    });

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [
    coordinateSystem,
    mapSize.height,
    mapSize.width,
    maxSignificance,
    projectionKey,
    projectionRotation,
    selectedPoint,
    visiblePoints,
    zoomScale
  ]);

  const updateRotationFromDrag = (x: number, y: number) => {
    const start = dragStartRef.current;
    if (!start) {
      return;
    }

    const deltaX = x - start.x;
    const deltaY = y - start.y;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 2) {
      didDragRef.current = true;
    }

    const [startLambda, startPhi, startGamma] = dragRotationRef.current;
    const nextPhi = Math.max(
      -MAX_LATITUDE_ROTATION,
      Math.min(MAX_LATITUDE_ROTATION, startPhi - deltaY * ROTATION_SENSITIVITY)
    );

    setProjectionRotation([
      startLambda + deltaX * ROTATION_SENSITIVITY,
      nextPhi,
      startGamma
    ]);
  };

  const onCanvasPointerDown: PointerEventHandler<HTMLCanvasElement> = (
    event
  ) => {
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    dragRotationRef.current = projectionRotation;
    dragPointerIdRef.current = event.pointerId;
    didDragRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onCanvasPointerMove: PointerEventHandler<HTMLCanvasElement> = (
    event
  ) => {
    if (dragPointerIdRef.current === event.pointerId) {
      updateRotationFromDrag(event.clientX, event.clientY);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let nearest: ProjectedPoint | null = null;
    let nearestDistanceSq = Number.POSITIVE_INFINITY;

    for (const item of projectedPointsRef.current) {
      const dx = item.x - x;
      const dy = item.y - y;
      const distanceSq = dx * dx + dy * dy;
      const threshold = Math.max(36, (item.radius + 2) * (item.radius + 2));
      if (distanceSq <= threshold && distanceSq < nearestDistanceSq) {
        nearest = item;
        nearestDistanceSq = distanceSq;
      }
    }

    if (!nearest) {
      setHoveredPoint(null);
      return;
    }

    setHoveredPoint(nearest.point);
    setHoverPosition({ x, y });
  };

  const onCanvasPointerUp: PointerEventHandler<HTMLCanvasElement> = (event) => {
    if (dragPointerIdRef.current === event.pointerId) {
      dragPointerIdRef.current = null;
      dragStartRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onCanvasPointerCancel: PointerEventHandler<HTMLCanvasElement> = (
    event
  ) => {
    if (dragPointerIdRef.current === event.pointerId) {
      dragPointerIdRef.current = null;
      dragStartRef.current = null;
      didDragRef.current = false;
    }
  };

  const onCanvasLeave: PointerEventHandler<HTMLCanvasElement> = () => {
    setHoveredPoint(null);
  };

  const onCanvasClick: PointerEventHandler<HTMLCanvasElement> = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    if (!hoveredPoint) {
      return;
    }

    setSelectedPoint(hoveredPoint);
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(MAX_ZOOM, prev + ZOOM_SENSITIVITY));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(MIN_ZOOM, prev - ZOOM_SENSITIVITY));
  };

  const toggleCatalog = (catalog: CatalogName) => {
    setHiddenCatalogs((previous) =>
      previous.includes(catalog)
        ? previous.filter((value) => value !== catalog)
        : [...previous, catalog]
    );
  };

  const resetView = () => {
    setProjectionRotation(DEFAULT_ROTATION);
    setZoomScale(1);
    setSelectedPoint(null);
    setHoveredPoint(null);
    dragStartRef.current = null;
    dragPointerIdRef.current = null;
    didDragRef.current = false;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("analytics.map.title")}</CardTitle>
        <CardDescription>{t("analytics.map.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
          {t("analytics.map.dragToRotate")}
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("analytics.map.projection")}
            </p>
            <Select
              value={projectionKey}
              onValueChange={(value) =>
                setProjectionKey(value as ProjectionKey)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECTION_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {t(item.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("analytics.map.coordinates")}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={
                  coordinateSystem === "equatorial" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setCoordinateSystem("equatorial")}
              >
                {t("analytics.map.equatorial")}
              </Button>
              <Button
                type="button"
                variant={
                  coordinateSystem === "galactic" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setCoordinateSystem("galactic")}
              >
                {t("analytics.map.galactic")}
              </Button>
            </div>
          </div>

          <div className="flex items-end justify-end lg:col-start-4">
            <Button type="button" variant="outline" onClick={resetView}>
              {t("analytics.map.resetView")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedCatalogs.map((catalog) => (
            <Button
              key={catalog}
              type="button"
              size="sm"
              variant={hiddenCatalogs.includes(catalog) ? "outline" : "default"}
              onClick={() => toggleCatalog(catalog)}
            >
              {SOURCE_CATALOG_META[catalog].label}
            </Button>
          ))}
        </div>

        <div
          ref={containerRef}
          className="relative h-115 w-full overflow-hidden rounded-md border border-white/10 bg-slate-950/80 touch-none"
        >
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-crosshair"
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerCancel={onCanvasPointerCancel}
            onMouseLeave={onCanvasLeave}
            onClick={onCanvasClick}
          />

          <svg
            ref={svgRef}
            className="absolute inset-0 pointer-events-none"
            style={{ pointerEvents: "none" }}
          />

          {hoveredPoint ? (
            <div
              className="pointer-events-none absolute z-20 rounded-md border border-white/10 bg-slate-900/95 px-3 py-2 text-xs text-white shadow-lg"
              style={{ left: hoverPosition.x + 14, top: hoverPosition.y + 14 }}
            >
              <p className="font-semibold">{hoveredPoint.unified_name}</p>
              <p>{SOURCE_CATALOG_META[hoveredPoint.primary_catalog].label}</p>
              <p>
                RA {formatStat(hoveredPoint.ra)} / DEC{" "}
                {formatStat(hoveredPoint.dec)}
              </p>
              <p>
                {t("analytics.map.significance")}:{" "}
                {formatStat(hoveredPoint.significance ?? undefined)}
              </p>
              <p>
                {t("analytics.magic.fields.significance")}:{" "}
                {formatStat(hoveredPoint.magic_significance ?? undefined)}
              </p>
              <p>{formatMagicStatus(hoveredPoint)}</p>
            </div>
          ) : null}

          {mapQuery.isLoading ? (
            <div className="absolute left-4 top-4 rounded border border-white/10 bg-black/60 px-3 py-2 text-xs text-slate-100">
              {t("analytics.loadingDescription")}
            </div>
          ) : null}

          {mapQuery.isError ? (
            <div className="absolute left-4 top-4 rounded border border-red-400/40 bg-red-950/50 px-3 py-2 text-xs text-red-100">
              {mapQuery.error instanceof Error
                ? mapQuery.error.message
                : t("analytics.errorDescription")}
            </div>
          ) : null}

          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
            {selectedCatalogs.map((catalog) => (
              <Badge key={catalog} variant="secondary">
                {SOURCE_CATALOG_META[catalog].label}:{" "}
                {mapQuery.data?.catalogDistribution?.[catalog] ?? 0}
              </Badge>
            ))}
          </div>

          <div className="absolute bottom-3 right-3 flex flex-col gap-2">
            <div className="rounded border border-white/10 bg-black/55 px-3 py-1 text-xs text-slate-200">
              {t("analytics.map.points")}: {visiblePoints.length} /
              {mapQuery.data?.count ?? 0}
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleZoomOut}
                disabled={zoomScale <= MIN_ZOOM}
              >
                −
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleZoomIn}
                disabled={zoomScale >= MAX_ZOOM}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {selectedPoint ? (
          <div className="grid gap-3 rounded-md border border-white/10 bg-slate-900/40 p-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("analytics.topSourcesColumns.sourceName")}
              </p>
              <p className="text-sm">{selectedPoint.unified_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("analytics.topSourcesColumns.catalog")}
              </p>
              <p className="text-sm">
                {SOURCE_CATALOG_META[selectedPoint.primary_catalog].label}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("analytics.map.position")}
              </p>
              <p className="text-sm">
                RA {formatStat(selectedPoint.ra)} / DEC{" "}
                {formatStat(selectedPoint.dec)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("analytics.map.significance")}
              </p>
              <p className="text-sm">
                {formatStat(selectedPoint.significance ?? undefined)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("analytics.magic.fields.significance")}
              </p>
              <p className="text-sm">
                {formatStat(selectedPoint.magic_significance ?? undefined)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("analytics.magic.fields.detectable")}
              </p>
              <p className="text-sm">{formatMagicStatus(selectedPoint)}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
