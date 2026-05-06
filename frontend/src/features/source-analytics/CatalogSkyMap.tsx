import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEventHandler
} from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  geoEquirectangular,
  geoOrthographic,
  scaleSqrt,
  select,
  zoom,
  zoomIdentity,
  type D3ZoomEvent,
  type GeoProjection,
  type ZoomTransform
} from "d3";
import { geoAitoff, geoMollweide } from "d3-geo-projection";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  height: number
): GeoProjection {
  const margin = 12;
  const maxScale = Math.min(width, height) * 0.34;

  if (key === "orthographic") {
    return geoOrthographic()
      .translate([width / 2, height / 2])
      .scale(maxScale)
      .clipAngle(90);
  }

  if (key === "mollweide") {
    return geoMollweide()
      .fitExtent(
        [
          [margin, margin],
          [width - margin, height - margin]
        ],
        { type: "Sphere" }
      )
      .precision(0.2);
  }

  if (key === "equirectangular") {
    return geoEquirectangular()
      .fitExtent(
        [
          [margin, margin],
          [width - margin, height - margin]
        ],
        { type: "Sphere" }
      )
      .precision(0.2);
  }

  return geoAitoff()
    .fitExtent(
      [
        [margin, margin],
        [width - margin, height - margin]
      ],
      { type: "Sphere" }
    )
    .precision(0.2);
}

function parseNumericInput(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
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
  const projectedPointsRef = useRef<ProjectedPoint[]>([]);

  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [projectionKey, setProjectionKey] = useState<ProjectionKey>("aitoff");
  const [coordinateSystem, setCoordinateSystem] =
    useState<CoordinateSystem>("equatorial");
  const [zoomTransform, setZoomTransform] =
    useState<ZoomTransform>(zoomIdentity);
  const [hoveredPoint, setHoveredPoint] = useState<SourceMapPoint | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [selectedPoint, setSelectedPoint] = useState<SourceMapPoint | null>(
    null
  );
  const [hiddenCatalogs, setHiddenCatalogs] = useState<CatalogName[]>([]);

  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [queryError, setQueryError] = useState<string | null>(null);

  const [raInput, setRaInput] = useState("");
  const [decInput, setDecInput] = useState("");
  const [radiusInput, setRadiusInput] = useState("");
  const [radiusFilter, setRadiusFilter] = useState<{
    ra: number;
    dec: number;
    radius: number;
  } | null>(null);

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

  const mapQuery = useQuery<SourceAnalyticsMapData, Error>({
    queryKey: [
      "source-analytics-map",
      selectedCatalogs,
      dateStart,
      dateEnd,
      radiusFilter
    ],
    queryFn: () =>
      fetchSourceAnalyticsMap({
        catalogs: selectedCatalogs,
        discoveryDateStart: dateStart || undefined,
        discoveryDateEnd: dateEnd || undefined,
        ra: radiusFilter?.ra,
        dec: radiusFilter?.dec,
        radius: radiusFilter?.radius
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mapSize.width <= 0 || mapSize.height <= 0) {
      return;
    }

    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([1, 12])
      .on("zoom", (event: D3ZoomEvent<HTMLCanvasElement, unknown>) => {
        setZoomTransform(event.transform);
      });

    const selection = select(canvas);
    selection.call(zoomBehavior);
    selection.on("dblclick.zoom", null);

    return () => {
      selection.on(".zoom", null);
    };
  }, [mapSize.width, mapSize.height]);

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

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, mapSize.width, mapSize.height);

    const projection = createProjection(
      projectionKey,
      mapSize.width,
      mapSize.height
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
        context.moveTo(
          zoomTransform.applyX(first[0]),
          zoomTransform.applyY(first[1])
        );
        context.lineTo(
          zoomTransform.applyX(second[0]),
          zoomTransform.applyY(second[1])
        );
      }
    }
    context.stroke();

    for (const point of visiblePoints) {
      const coords = toProjectionCoords(point, coordinateSystem);
      const projected = projection(coords);
      if (!projected) {
        continue;
      }

      const x = zoomTransform.applyX(projected[0]);
      const y = zoomTransform.applyY(projected[1]);
      const baseRadius = radiusScale(Math.max(0, point.significance ?? 0));
      const radius = Math.max(1.2, baseRadius * Math.sqrt(zoomTransform.k));

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
  }, [
    coordinateSystem,
    mapSize.height,
    mapSize.width,
    maxSignificance,
    projectionKey,
    selectedPoint,
    visiblePoints,
    zoomTransform
  ]);

  const onCanvasMove: MouseEventHandler<HTMLCanvasElement> = (event) => {
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

  const onCanvasLeave: MouseEventHandler<HTMLCanvasElement> = () => {
    setHoveredPoint(null);
  };

  const onCanvasClick: MouseEventHandler<HTMLCanvasElement> = () => {
    if (!hoveredPoint) {
      return;
    }

    setSelectedPoint(hoveredPoint);
  };

  const toggleCatalog = (catalog: CatalogName) => {
    setHiddenCatalogs((previous) =>
      previous.includes(catalog)
        ? previous.filter((value) => value !== catalog)
        : [...previous, catalog]
    );
  };

  const resetView = () => {
    setZoomTransform(zoomIdentity);
    setSelectedPoint(null);
    setHoveredPoint(null);
  };

  const applyRadiusFilter = () => {
    const ra = parseNumericInput(raInput);
    const dec = parseNumericInput(decInput);
    const radius = parseNumericInput(radiusInput);

    if (
      ra === undefined ||
      dec === undefined ||
      radius === undefined ||
      ra < 0 ||
      ra > 360 ||
      dec < -90 ||
      dec > 90 ||
      radius <= 0 ||
      radius > 180
    ) {
      setQueryError(t("analytics.map.radiusValidation"));
      return;
    }

    setQueryError(null);
    setRadiusFilter({ ra, dec, radius });
  };

  const clearRadiusFilter = () => {
    setRadiusFilter(null);
    setRaInput("");
    setDecInput("");
    setRadiusInput("");
    setQueryError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("analytics.map.title")}</CardTitle>
        <CardDescription>{t("analytics.map.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("analytics.map.timeline")}
            </p>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateStart}
                onChange={(event) => setDateStart(event.target.value)}
              />
              <Input
                type="date"
                value={dateEnd}
                onChange={(event) => setDateEnd(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-end justify-end">
            <Button type="button" variant="outline" onClick={resetView}>
              {t("analytics.map.resetView")}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Input
            type="number"
            placeholder={t("analytics.map.ra")}
            value={raInput}
            onChange={(event) => setRaInput(event.target.value)}
          />
          <Input
            type="number"
            placeholder={t("analytics.map.dec")}
            value={decInput}
            onChange={(event) => setDecInput(event.target.value)}
          />
          <Input
            type="number"
            placeholder={t("analytics.map.radius")}
            value={radiusInput}
            onChange={(event) => setRadiusInput(event.target.value)}
          />
          <Button type="button" onClick={applyRadiusFilter}>
            {t("analytics.map.applyRadius")}
          </Button>
          <Button type="button" variant="outline" onClick={clearRadiusFilter}>
            {t("analytics.map.clearRadius")}
          </Button>
          <div className="flex items-center text-xs text-muted-foreground">
            {radiusFilter
              ? `${t("analytics.map.radiusActive")}: RA ${formatStat(radiusFilter.ra)} / DEC ${formatStat(radiusFilter.dec)} / r ${formatStat(radiusFilter.radius)}`
              : t("analytics.map.radiusInactive")}
          </div>
        </div>

        {queryError ? (
          <p className="text-sm text-red-400">{queryError}</p>
        ) : null}

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
          className="relative h-115 w-full overflow-hidden rounded-md border border-white/10 bg-slate-950/80"
        >
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-crosshair"
            onMouseMove={onCanvasMove}
            onMouseLeave={onCanvasLeave}
            onClick={onCanvasClick}
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

          <div className="absolute bottom-3 right-3 rounded border border-white/10 bg-black/55 px-3 py-1 text-xs text-slate-200">
            {t("analytics.map.points")}: {visiblePoints.length} /{" "}
            {mapQuery.data?.count ?? 0}
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
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
