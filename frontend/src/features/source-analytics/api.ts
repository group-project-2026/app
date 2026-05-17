import { fetchSources } from "../sources/api";
import type { CatalogName, Source } from "../sources/types";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "/api";

export type GroupByDimension =
  | "catalog"
  | "sourceClass"
  | "discoveryMethod"
  | "confidenceBand"
  | "catalogCountBand";

export const SOURCE_CATALOGS: CatalogName[] = [
  "FERMI",
  "LHAASO",
  "HAWC",
  "TEVCAT",
  "NED"
];

export const SOURCE_CATALOG_META: Record<
  CatalogName,
  { label: string; color: string }
> = {
  FERMI: { label: "Fermi-LAT", color: "#2E86AB" },
  LHAASO: { label: "LHAASO", color: "#81B29A" },
  HAWC: { label: "HAWC", color: "#E07A5F" },
  TEVCAT: { label: "TeVCat", color: "#6D597A" },
  NED: { label: "NED", color: "#F2CC8F" }
};

const ANALYTICS_PAGE_SIZE = 1000;

export interface SourceHeadlineMetrics {
  samples: number;
  avgSignificance: number;
  avgFlux1000: number;
  avgConfidence: number;
  multiCatalogShare: number;
}

export interface SourceMagicHeadlineMetrics {
  samples: number;
  sourcesWithMagic: number;
  avgMagicSignificance: number;
  detectableShare: number;
}

export interface SourceMagicComparisonRow {
  catalog: CatalogName;
  sampleCount: number;
  sourcesWithMagic: number;
  avgMagicSignificance: number;
  detectableShare: number;
  strongestMagicSignificance: number;
  strongestSourceName: string | null;
}

export interface SourceMagicTopRow {
  name: string;
  catalog: CatalogName;
  magicSignificance: number;
  magicDetectable: boolean | null;
}

export interface SourceCatalogComparisonRow {
  catalog: CatalogName;
  sampleCount: number;
  avgSignificance: number;
  avgFlux1000: number;
  avgConfidence: number;
  avgCatalogCount: number;
  multiCatalogShare: number;
  classDiversity: number;
  scienceScore: number;
}

export interface SourceGroupingRow {
  group: string;
  sampleCount: number;
  avgSignificance: number;
  avgFlux1000: number;
  avgConfidence: number;
  avgCatalogCount: number;
  multiCatalogShare: number;
}

export interface SourceScatterPoint {
  name: string;
  catalog: CatalogName;
  sourceClass: string;
  significance: number;
  flux1000: number;
  confidence: number;
  catalogCount: number;
  score: number;
}

export interface SourceTopRow {
  name: string;
  catalog: CatalogName;
  sourceClass: string;
  significance: number;
  flux1000: number;
  confidence: number;
  catalogCount: number;
  score: number;
}

export interface SourceAnalyticsData {
  sources: Source[];
  headlineMetrics: SourceHeadlineMetrics;
  magicHeadlineMetrics: SourceMagicHeadlineMetrics;
  catalogComparison: SourceCatalogComparisonRow[];
  magicComparison: SourceMagicComparisonRow[];
  scatterPoints: SourceScatterPoint[];
  topSources: SourceTopRow[];
  magicTopSources: SourceMagicTopRow[];
  classMixRows: Array<Record<string, string | number>>;
  topClasses: string[];
  significanceHistogram?: {
    edges: number[];
    perCatalog: Record<
      string,
      {
        bins: Array<{
          min: number;
          max: number;
          label: string;
          count: number;
          percentage: number;
        }>;
        total: number;
      }
    >;
  };
  radarComparison: Array<{
    catalog: CatalogName;
    significanceIndex: number;
    fluxIndex: number;
    confidenceIndex: number;
    connectivityIndex: number;
    classDiversityIndex: number;
    multiCatalogShare: number;
  }>;
}

// Backend Analytics Response Types
export interface BackendCatalogRow {
  catalog: CatalogName;
  sampleCount: number;
  avgEmissionFlux: number;
  peakEmissionFlux: number;
  avgSignificance: number;
  p95Significance: number;
  peakSignificance: number;
  avgDetectability: number;
  highDetectabilityShare: number;
  low: number;
  medium: number;
  high: number;
}

export interface BackendHeadlineMetrics {
  samples: number;
  avgEmissionFlux: number;
  avgSignificance: number;
  avgDetectability: number;
  highDetectabilityShare: number;
}

export interface BackendSignificanceComparison {
  catalog: CatalogName;
  avgSignificance: number;
  p95Significance: number;
  peakSignificance: number;
}

export interface BackendDetectabilityComparison {
  catalog: CatalogName;
  low: number;
  medium: number;
  high: number;
  avgDetectability: number;
}

export interface BackendRadarComparisonRow {
  catalog: CatalogName;
  emissionIndex: number;
  significanceIndex: number;
  detectabilityIndex: number;
  highDetectabilityShare: number;
}

export interface BackendAnalyticsResponse {
  headlineMetrics: BackendHeadlineMetrics;
  catalogRows: BackendCatalogRow[];
  groupingRows: Array<Record<string, unknown>>;
  emissionTrend: Array<Record<string, unknown>>;
  emissionComparison: Array<{
    catalog: CatalogName;
    avgEmissionFlux: number;
    peakEmissionFlux: number;
  }>;
  significanceComparison: BackendSignificanceComparison[];
  detectabilityComparison: BackendDetectabilityComparison[];
  radarComparison: BackendRadarComparisonRow[];
  significanceHistogram: {
    edges: number[];
    perCatalog: Record<
      string,
      {
        bins: Array<{
          min: number;
          max: number;
          label: string;
          count: number;
          percentage: number;
        }>;
        total: number;
      }
    >;
  };
  availableCatalogs: CatalogName[];
  groupBy: string;
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function logBoost(value: number | null): number {
  if (value === null || value <= 0) {
    return 0;
  }

  return Math.log10(value * 1e13 + 1);
}

function sourceConfidence(source: Source): number {
  return source.avg_confidence ?? source.best_confidence ?? 0;
}

function sourceSignificance(source: Source): number {
  return source.significance ?? 0;
}

function sourceFlux(source: Source): number {
  return source.flux1000 ?? 0;
}

function sourceClass(source: Source): string {
  return source.source_class?.trim() || "Unknown";
}

function discoveryMethod(source: Source): string {
  return source.discovery_method?.trim() || "Unknown";
}

function sourceMagicSignificance(source: Source): number | null {
  return source.magic_significance ?? null;
}

function sourceMagicDetectable(source: Source): boolean | null {
  return source.magic_detectable ?? null;
}

function sourceHasMagic(source: Source): boolean {
  return typeof source.magic_significance === "number";
}

function confidenceBandKey(confidence: number): string {
  if (confidence < 0.4) {
    return "veryLow";
  }

  if (confidence < 0.7) {
    return "low";
  }

  if (confidence < 0.9) {
    return "medium";
  }

  return "high";
}

function catalogCountBandKey(catalogCount: number): string {
  if (catalogCount <= 1) {
    return "single";
  }

  if (catalogCount <= 3) {
    return "paired";
  }

  return "multi";
}

function sourceScore(source: Source): number {
  const significance = sourceSignificance(source);
  const flux = sourceFlux(source);
  const confidence = sourceConfidence(source);
  const catalogCount = source.catalog_count;

  return round(
    significance * 5 + logBoost(flux) * 8 + confidence * 25 + catalogCount * 3,
    2
  );
}

function magicScore(source: Source): number {
  return round(sourceMagicSignificance(source) ?? 0, 2);
}

function buildMagicComparison(sources: Source[]): SourceMagicComparisonRow[] {
  return SOURCE_CATALOGS.map((catalog) => {
    const catalogSources = sources.filter(
      (source) => source.primary_catalog === catalog
    );

    if (catalogSources.length === 0) {
      return null;
    }

    const magicSources = catalogSources.filter(sourceHasMagic);
    const magicValues = magicSources
      .map(sourceMagicSignificance)
      .filter((value): value is number => typeof value === "number");
    const detectableShare =
      magicSources.length === 0
        ? 0
        : (magicSources.filter(
            (source) => sourceMagicDetectable(source) === true
          ).length /
            magicSources.length) *
          100;

    const strongestMagic = magicSources.reduce<Source | null>(
      (best, source) => {
        if (!best) {
          return source;
        }

        return magicScore(source) > magicScore(best) ? source : best;
      },
      null
    );

    return {
      catalog,
      sampleCount: catalogSources.length,
      sourcesWithMagic: magicSources.length,
      avgMagicSignificance: round(average(magicValues), 2),
      detectableShare: round(detectableShare, 1),
      strongestMagicSignificance: strongestMagic
        ? magicScore(strongestMagic)
        : 0,
      strongestSourceName: strongestMagic?.unified_name ?? null
    };
  }).filter((value): value is SourceMagicComparisonRow => value !== null);
}

function buildMagicHeadlineMetrics(
  sources: Source[]
): SourceMagicHeadlineMetrics {
  const magicSources = sources.filter(sourceHasMagic);
  const magicValues = magicSources
    .map(sourceMagicSignificance)
    .filter((value): value is number => typeof value === "number");

  return {
    samples: sources.length,
    sourcesWithMagic: magicSources.length,
    avgMagicSignificance: round(average(magicValues), 2),
    detectableShare: round(
      magicSources.length === 0
        ? 0
        : (magicSources.filter(
            (source) => sourceMagicDetectable(source) === true
          ).length /
            magicSources.length) *
            100,
      1
    )
  };
}

function buildMagicTopSources(sources: Source[]): SourceMagicTopRow[] {
  return sources
    .filter(sourceHasMagic)
    .sort((left, right) => magicScore(right) - magicScore(left))
    .slice(0, 10)
    .map((source) => ({
      name: source.unified_name,
      catalog: source.primary_catalog,
      magicSignificance: magicScore(source),
      magicDetectable: sourceMagicDetectable(source)
    }));
}

export async function fetchAllSources(): Promise<Source[]> {
  const sources: Source[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (sources.length < total) {
    const response = await fetchSources({
      page,
      pageSize: ANALYTICS_PAGE_SIZE,
      sortBy: "unified_name",
      sortOrder: "asc"
    });

    sources.push(...response.data);
    total = response.total;

    if (response.data.length === 0) {
      break;
    }

    page += 1;
  }

  return sources;
}

function buildCatalogComparison(
  sources: Source[]
): SourceCatalogComparisonRow[] {
  return SOURCE_CATALOGS.map((catalog) => {
    const catalogSources = sources.filter(
      (source) => source.primary_catalog === catalog
    );

    if (catalogSources.length === 0) {
      return null;
    }

    const significanceValues = catalogSources.map(sourceSignificance);
    const fluxValues = catalogSources.map(sourceFlux);
    const confidenceValues = catalogSources.map(sourceConfidence);
    const catalogCounts = catalogSources.map((source) => source.catalog_count);
    const classDiversity = new Set(catalogSources.map(sourceClass)).size;
    const multiCatalogShare =
      (catalogSources.filter((source) => source.catalog_count > 1).length /
        catalogSources.length) *
      100;

    return {
      catalog,
      sampleCount: catalogSources.length,
      avgSignificance: round(average(significanceValues), 2),
      avgFlux1000: round(average(fluxValues), 3),
      avgConfidence: round(average(confidenceValues), 3),
      avgCatalogCount: round(average(catalogCounts), 2),
      multiCatalogShare: round(multiCatalogShare, 1),
      classDiversity,
      scienceScore: 0
    };
  }).filter((value): value is SourceCatalogComparisonRow => value !== null);
}

function addScienceScore(
  rows: SourceCatalogComparisonRow[]
): SourceCatalogComparisonRow[] {
  const maxSignificance = Math.max(
    ...rows.map((row) => row.avgSignificance),
    0
  );
  const maxFlux = Math.max(...rows.map((row) => row.avgFlux1000), 0);
  const maxConfidence = Math.max(...rows.map((row) => row.avgConfidence), 0);
  const maxCatalogCount = Math.max(
    ...rows.map((row) => row.avgCatalogCount),
    0
  );
  const maxClassDiversity = Math.max(
    ...rows.map((row) => row.classDiversity),
    0
  );

  return rows.map((row) => ({
    ...row,
    scienceScore: round(
      (maxSignificance === 0
        ? 0
        : (row.avgSignificance / maxSignificance) * 100) *
        0.3 +
        (maxFlux === 0 ? 0 : (row.avgFlux1000 / maxFlux) * 100) * 0.15 +
        (maxConfidence === 0 ? 0 : (row.avgConfidence / maxConfidence) * 100) *
          0.2 +
        (maxCatalogCount === 0
          ? 0
          : (row.avgCatalogCount / maxCatalogCount) * 100) *
          0.15 +
        (maxClassDiversity === 0
          ? 0
          : (row.classDiversity / maxClassDiversity) * 100) *
          0.2,
      1
    )
  }));
}

function buildRadarComparison(
  rows: SourceCatalogComparisonRow[]
): SourceAnalyticsData["radarComparison"] {
  const maxSignificance = Math.max(
    ...rows.map((row) => row.avgSignificance),
    0
  );
  const maxFlux = Math.max(...rows.map((row) => row.avgFlux1000), 0);
  const maxConfidence = Math.max(...rows.map((row) => row.avgConfidence), 0);
  const maxCatalogCount = Math.max(
    ...rows.map((row) => row.avgCatalogCount),
    0
  );
  const maxClassDiversity = Math.max(
    ...rows.map((row) => row.classDiversity),
    0
  );

  return rows.map((row) => ({
    catalog: row.catalog,
    significanceIndex:
      maxSignificance === 0
        ? 0
        : round((row.avgSignificance / maxSignificance) * 100, 1),
    fluxIndex: maxFlux === 0 ? 0 : round((row.avgFlux1000 / maxFlux) * 100, 1),
    confidenceIndex:
      maxConfidence === 0
        ? 0
        : round((row.avgConfidence / maxConfidence) * 100, 1),
    connectivityIndex:
      maxCatalogCount === 0
        ? 0
        : round((row.avgCatalogCount / maxCatalogCount) * 100, 1),
    classDiversityIndex:
      maxClassDiversity === 0
        ? 0
        : round((row.classDiversity / maxClassDiversity) * 100, 1),
    multiCatalogShare: row.multiCatalogShare
  }));
}

function buildGroupingRows(
  sources: Source[],
  groupBy: GroupByDimension
): SourceGroupingRow[] {
  const groups = new Map<string, Source[]>();

  for (const source of sources) {
    let key: string = source.primary_catalog;

    if (groupBy === "sourceClass") {
      key = sourceClass(source);
    } else if (groupBy === "discoveryMethod") {
      key = discoveryMethod(source);
    } else if (groupBy === "confidenceBand") {
      key = confidenceBandKey(sourceConfidence(source));
    } else if (groupBy === "catalogCountBand") {
      key = catalogCountBandKey(source.catalog_count);
    }

    const current = groups.get(key) ?? [];
    current.push(source);
    groups.set(key, current);
  }

  const rows = Array.from(groups.entries()).map(([group, items]) => {
    const significanceValues = items.map(sourceSignificance);
    const fluxValues = items.map(sourceFlux);
    const confidenceValues = items.map(sourceConfidence);
    const catalogCounts = items.map((source) => source.catalog_count);
    const multiCatalogShare =
      (items.filter((source) => source.catalog_count > 1).length /
        items.length) *
      100;

    return {
      group,
      sampleCount: items.length,
      avgSignificance: round(average(significanceValues), 2),
      avgFlux1000: round(average(fluxValues), 3),
      avgConfidence: round(average(confidenceValues), 3),
      avgCatalogCount: round(average(catalogCounts), 2),
      multiCatalogShare: round(multiCatalogShare, 1)
    };
  });

  return rows.sort((left, right) => {
    if (groupBy === "catalog") {
      return (
        SOURCE_CATALOGS.indexOf(left.group as CatalogName) -
        SOURCE_CATALOGS.indexOf(right.group as CatalogName)
      );
    }

    if (groupBy === "confidenceBand") {
      const order = ["veryLow", "low", "medium", "high"];
      return order.indexOf(left.group) - order.indexOf(right.group);
    }

    if (groupBy === "catalogCountBand") {
      const order = ["single", "paired", "multi"];
      return order.indexOf(left.group) - order.indexOf(right.group);
    }

    return left.group.localeCompare(right.group);
  });
}

function buildScatterPoints(sources: Source[]): SourceScatterPoint[] {
  return sources
    .map((source) => ({
      name: source.unified_name,
      catalog: source.primary_catalog,
      sourceClass: sourceClass(source),
      significance: sourceSignificance(source),
      flux1000: sourceFlux(source),
      confidence: sourceConfidence(source),
      catalogCount: source.catalog_count,
      score: sourceScore(source)
    }))
    .sort((left, right) => right.score - left.score);
}

function buildTopSources(sources: Source[]): SourceTopRow[] {
  return buildScatterPoints(sources).slice(0, 12);
}

function buildClassMixRows(sources: Source[]): {
  topClasses: string[];
  rows: Array<Record<string, string | number>>;
} {
  const classCounts = new Map<string, number>();

  for (const source of sources) {
    const label = sourceClass(source);
    classCounts.set(label, (classCounts.get(label) ?? 0) + 1);
  }

  const topClasses = Array.from(classCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([label]) => label);

  const rows = SOURCE_CATALOGS.flatMap((catalog) => {
    const catalogSources = sources.filter(
      (source) => source.primary_catalog === catalog
    );
    if (catalogSources.length === 0) {
      return [];
    }

    const row: Record<string, string | number> = { catalog };
    let otherCount = 0;

    for (const classLabel of topClasses) {
      const count = catalogSources.filter(
        (source) => sourceClass(source) === classLabel
      ).length;
      row[classLabel] = count;
      otherCount += count;
    }

    row.Other = catalogSources.length - otherCount;
    return [row];
  });

  return { topClasses, rows };
}

export async function fetchSourceAnalytics(
  selectedCatalogs: CatalogName[]
): Promise<SourceAnalyticsData> {
  const allSources = await fetchAllSources();
  const filteredSources =
    selectedCatalogs.length > 0
      ? allSources.filter((source) =>
          selectedCatalogs.includes(source.primary_catalog)
        )
      : allSources;

  const catalogComparison = addScienceScore(
    buildCatalogComparison(filteredSources)
  );
  const magicComparison = buildMagicComparison(filteredSources);
  const scatterPoints = buildScatterPoints(filteredSources);
  const topSources = buildTopSources(filteredSources);
  const magicHeadlineMetrics = buildMagicHeadlineMetrics(filteredSources);
  const magicTopSources = buildMagicTopSources(filteredSources);
  const { topClasses, rows: classMixRows } = buildClassMixRows(filteredSources);

  const headlineMetrics: SourceHeadlineMetrics = {
    samples: filteredSources.length,
    avgSignificance: round(average(filteredSources.map(sourceSignificance)), 2),
    avgFlux1000: round(average(filteredSources.map(sourceFlux)), 3),
    avgConfidence: round(average(filteredSources.map(sourceConfidence)), 3),
    multiCatalogShare: round(
      filteredSources.length === 0
        ? 0
        : (filteredSources.filter((source) => source.catalog_count > 1).length /
            filteredSources.length) *
            100,
      1
    )
  };

  // Fetch server-side histogram (if available) to avoid heavy client aggregation
  let significanceHistogram:
    | SourceAnalyticsData["significanceHistogram"]
    | undefined = undefined;
  try {
    const params = new URLSearchParams();
    for (const c of selectedCatalogs) params.append("catalog", c);
    const resp = await fetch(`/api/sources/analytics/?${params.toString()}`);
    if (resp.ok) {
      const json = await resp.json();
      if (json && json.significanceHistogram) {
        significanceHistogram = json.significanceHistogram;
      }
    }
  } catch {
    // ignore; histogram optional
  }

  return {
    sources: filteredSources,
    headlineMetrics,
    magicHeadlineMetrics,
    catalogComparison,
    magicComparison,
    scatterPoints,
    topSources,
    magicTopSources,
    classMixRows,
    topClasses,
    significanceHistogram,
    radarComparison: buildRadarComparison(catalogComparison)
  };
}

export async function fetchBackendAnalytics(
  selectedCatalogs: CatalogName[]
): Promise<BackendAnalyticsResponse | null> {
  try {
    const params = new URLSearchParams();
    for (const c of selectedCatalogs) {
      params.append("catalog", c);
    }
    const resp = await fetch(`/api/sources/analytics/?${params.toString()}`);
    if (!resp.ok) {
      console.error("Failed to fetch backend analytics:", resp.statusText);
      return null;
    }
    const json = await resp.json();
    return json as BackendAnalyticsResponse;
  } catch (error) {
    console.error("Error fetching backend analytics:", error);
    return null;
  }
}

export interface SourceMapPoint {
  id: string;
  unified_name: string;
  ra: number;
  dec: number;
  primary_catalog: CatalogName;
  created_at: string;
  discovery_date: string | null;
  catalog_count: number;
  avg_confidence: number | null;
  best_confidence: number | null;
  source_class: string | null;
  significance: number | null;
  flux1000: number | null;
  spectral_index: number | null;
  associated_name: string | null;
  discovery_method: string | null;
  magic_significance: number | null;
  magic_detectable: boolean | null;
}

export interface SourceAnalyticsMapFilters {
  catalogs: CatalogName[];
  search?: string;
  discoveryDateStart?: string;
  discoveryDateEnd?: string;
  raMin?: number;
  raMax?: number;
  decMin?: number;
  decMax?: number;
  significanceMin?: number;
  significanceMax?: number;
  fluxMin?: number;
  fluxMax?: number;
  ra?: number;
  dec?: number;
  radius?: number;
}

interface SourceAnalyticsMapPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: SourceMapPoint[];
  spatialBounds?: {
    raMin: number | null;
    raMax: number | null;
    decMin: number | null;
    decMax: number | null;
  };
  dateBounds?: {
    start: string | null;
    end: string | null;
  };
  catalogDistribution?: Record<string, number>;
  filtersApplied?: Record<string, unknown>;
}

export interface SourceAnalyticsMapData {
  count: number;
  points: SourceMapPoint[];
  spatialBounds: {
    raMin: number | null;
    raMax: number | null;
    decMin: number | null;
    decMax: number | null;
  };
  dateBounds: {
    start: string | null;
    end: string | null;
  };
  catalogDistribution: Record<string, number>;
  filtersApplied: Record<string, unknown>;
}

export function buildAnalyticsGroupRows(
  sources: Source[],
  groupBy: GroupByDimension
): SourceGroupingRow[] {
  return buildGroupingRows(sources, groupBy);
}

function appendNumericFilter(
  query: URLSearchParams,
  key: string,
  value: number | undefined
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    query.set(key, String(value));
  }
}

function buildMapQuery(
  filters: SourceAnalyticsMapFilters,
  page: number
): string {
  const query = new URLSearchParams();

  query.set("page", String(page));
  query.set("page_size", "1000");

  for (const catalog of filters.catalogs) {
    query.append("catalog", catalog);
  }

  if (filters.search) {
    query.set("search", filters.search);
  }

  if (filters.discoveryDateStart) {
    query.set("discovery_date_start", filters.discoveryDateStart);
  }

  if (filters.discoveryDateEnd) {
    query.set("discovery_date_end", filters.discoveryDateEnd);
  }

  appendNumericFilter(query, "ra_min", filters.raMin);
  appendNumericFilter(query, "ra_max", filters.raMax);
  appendNumericFilter(query, "dec_min", filters.decMin);
  appendNumericFilter(query, "dec_max", filters.decMax);
  appendNumericFilter(query, "significance_min", filters.significanceMin);
  appendNumericFilter(query, "significance_max", filters.significanceMax);
  appendNumericFilter(query, "flux_min", filters.fluxMin);
  appendNumericFilter(query, "flux_max", filters.fluxMax);
  appendNumericFilter(query, "ra", filters.ra);
  appendNumericFilter(query, "dec", filters.dec);
  appendNumericFilter(query, "radius", filters.radius);

  return query.toString();
}

export async function fetchSourceAnalyticsMap(
  filters: SourceAnalyticsMapFilters
): Promise<SourceAnalyticsMapData> {
  let page = 1;
  const points: SourceMapPoint[] = [];
  let count = 0;
  let spatialBounds: SourceAnalyticsMapData["spatialBounds"] = {
    raMin: null,
    raMax: null,
    decMin: null,
    decMax: null
  };
  let dateBounds: SourceAnalyticsMapData["dateBounds"] = {
    start: null,
    end: null
  };
  let catalogDistribution: Record<string, number> = {};
  let filtersApplied: Record<string, unknown> = {};

  while (true) {
    const query = buildMapQuery(filters, page);
    const response = await fetch(
      `${API_BASE_URL}/sources/analytics_map/?${query}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as SourceAnalyticsMapPage;

    count = payload.count;
    points.push(...payload.results);
    spatialBounds = payload.spatialBounds ?? spatialBounds;
    dateBounds = payload.dateBounds ?? dateBounds;
    catalogDistribution = payload.catalogDistribution ?? catalogDistribution;
    filtersApplied = payload.filtersApplied ?? filtersApplied;

    if (!payload.next) {
      break;
    }

    page += 1;
  }

  return {
    count,
    points,
    spatialBounds,
    dateBounds,
    catalogDistribution,
    filtersApplied
  };
}
