import { fetchSources } from "../sources/api";
import type { CatalogName, Source } from "../sources/types";

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

export interface SignificanceDistributionBin {
  bin: string;
  range: string;
  count: number;
  percentage: number;
}

export interface CrossCatalogOverlapRow {
  catalog: string;
  [key: string]: string | number;
}

export interface SignificanceCDFPoint {
  significance: number;
  cumulative: number;
  percentage: number;
}

export interface TopSourcesBubblePoint {
  name: string;
  catalog: CatalogName;
  significance: number;
  flux: number;
  confidence: number;
  score: number;
  catalogCount: number;
}

export interface SourceAnalyticsData {
  sources: Source[];
  headlineMetrics: SourceHeadlineMetrics;
  catalogComparison: SourceCatalogComparisonRow[];
  scatterPoints: SourceScatterPoint[];
  topSources: SourceTopRow[];
  classMixRows: Array<Record<string, string | number>>;
  topClasses: string[];
  significanceDistribution: SignificanceDistributionBin[];
  crossCatalogOverlapMatrix: CrossCatalogOverlapRow[];
  significanceCDF: SignificanceCDFPoint[];
  topSourcesBubble: TopSourcesBubblePoint[];
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

function buildSignificanceDistribution(
  sources: Source[]
): SignificanceDistributionBin[] {
  const bins = [
    { min: 0, max: 1, label: "0-1" },
    { min: 1, max: 2, label: "1-2" },
    { min: 2, max: 3, label: "2-3" },
    { min: 3, max: 4, label: "3-4" },
    { min: 4, max: 5, label: "4-5" },
    { min: 5, max: Infinity, label: "5+" }
  ];

  const distribution = bins.map((bin) => {
    const count = sources.filter((source) => {
      const sig = sourceSignificance(source);
      return sig >= bin.min && sig < bin.max;
    }).length;

    return {
      bin: bin.label,
      range: bin.label,
      count,
      percentage:
        sources.length > 0 ? round((count / sources.length) * 100, 1) : 0
    };
  });

  return distribution;
}

function buildCrossCatalogOverlapMatrix(
  sources: Source[]
): CrossCatalogOverlapRow[] {
  const catalogs = SOURCE_CATALOGS.filter((cat) =>
    sources.some((s) => s.primary_catalog === cat)
  );

  const matrix: CrossCatalogOverlapRow[] = catalogs.map((catalog1) => {
    const row: CrossCatalogOverlapRow = { catalog: catalog1 };

    catalogs.forEach((catalog2) => {
      if (catalog1 === catalog2) {
        row[catalog2] = sources.filter(
          (s) => s.primary_catalog === catalog1
        ).length;
      } else {
        row[catalog2] = sources.filter(
          (s) => s.primary_catalog === catalog1 && s.catalog_count > 1
        ).length;
      }
    });

    return row;
  });

  return matrix;
}

function buildSignificanceCDF(sources: Source[]): SignificanceCDFPoint[] {
  if (sources.length === 0) return [];

  const sigs = sources.map(sourceSignificance).sort((a, b) => a - b);

  const points: SignificanceCDFPoint[] = [];
  const step = Math.max(1, Math.floor(sigs.length / 30));

  for (let i = 0; i < sigs.length; i += step) {
    const sig = sigs[i];
    const cumulative = i + 1;
    points.push({
      significance: round(sig, 2),
      cumulative,
      percentage: round((cumulative / sigs.length) * 100, 1)
    });
  }

  if (points[points.length - 1]?.cumulative !== sigs.length) {
    const lastSig = sigs[sigs.length - 1];
    points.push({
      significance: round(lastSig, 2),
      cumulative: sigs.length,
      percentage: 100
    });
  }

  return points;
}

function buildTopSourcesBubbleData(sources: Source[]): TopSourcesBubblePoint[] {
  return buildScatterPoints(sources)
    .slice(0, 20)
    .map((point) => ({
      name: point.name,
      catalog: point.catalog,
      significance: point.significance,
      flux: point.flux1000,
      confidence: point.confidence,
      score: point.score,
      catalogCount: point.catalogCount
    }));
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
  const scatterPoints = buildScatterPoints(filteredSources);
  const topSources = buildTopSources(filteredSources);
  const { topClasses, rows: classMixRows } = buildClassMixRows(filteredSources);
  const significanceDistribution =
    buildSignificanceDistribution(filteredSources);
  const crossCatalogOverlapMatrix =
    buildCrossCatalogOverlapMatrix(filteredSources);
  const significanceCDF = buildSignificanceCDF(filteredSources);
  const topSourcesBubble = buildTopSourcesBubbleData(filteredSources);

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

  return {
    sources: filteredSources,
    headlineMetrics,
    catalogComparison,
    scatterPoints,
    topSources,
    classMixRows,
    topClasses,
    significanceDistribution,
    crossCatalogOverlapMatrix,
    significanceCDF,
    topSourcesBubble,
    radarComparison: buildRadarComparison(catalogComparison)
  };
}

export function buildAnalyticsGroupRows(
  sources: Source[],
  groupBy: GroupByDimension
): SourceGroupingRow[] {
  return buildGroupingRows(sources, groupBy);
}
