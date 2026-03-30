import {
  CATALOG_KEYS,
  CATALOG_META,
  type CatalogKey,
  type CatalogObservation
} from "./catalogAnalyticsData";

export type GroupByDimension =
  | "catalog"
  | "year"
  | "energyBand"
  | "skyRegion"
  | "sourceType";

export interface GroupedAggregationRow {
  group: string;
  sampleCount: number;
  avgEmissionFlux: number;
  medianEmissionFlux: number;
  avgSignificance: number;
  peakSignificance: number;
  avgDetectability: number;
  highDetectabilityShare: number;
}

export interface HeadlineMetrics {
  samples: number;
  avgEmissionFlux: number;
  avgSignificance: number;
  avgDetectability: number;
  highDetectabilityShare: number;
}

export type CatalogYearPoint = { year: number } & Partial<
  Record<CatalogKey, number>
>;

export interface CatalogEmissionComparison {
  catalog: CatalogKey;
  avgEmissionFlux: number;
  peakEmissionFlux: number;
}

export interface CatalogSignificanceComparison {
  catalog: CatalogKey;
  avgSignificance: number;
  p95Significance: number;
  peakSignificance: number;
}

export interface CatalogRadarComparison {
  catalog: CatalogKey;
  emissionIndex: number;
  significanceIndex: number;
  detectabilityIndex: number;
  highDetectabilityShare: number;
}

export interface CatalogDetectabilityComparison {
  catalog: CatalogKey;
  low: number;
  medium: number;
  high: number;
  avgDetectability: number;
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

function percentile(values: number[], percentileRank: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileRank / 100) * sorted.length) - 1)
  );

  return sorted[index];
}

function sortRows(
  rows: GroupedAggregationRow[],
  groupBy: GroupByDimension
): GroupedAggregationRow[] {
  const sorted = [...rows];

  if (groupBy === "catalog") {
    sorted.sort(
      (a, b) =>
        CATALOG_KEYS.indexOf(a.group as CatalogKey) -
        CATALOG_KEYS.indexOf(b.group as CatalogKey)
    );
    return sorted;
  }

  if (groupBy === "year") {
    sorted.sort((a, b) => Number(a.group) - Number(b.group));
    return sorted;
  }

  sorted.sort((a, b) => a.group.localeCompare(b.group));
  return sorted;
}

function getGroupKey(
  observation: CatalogObservation,
  groupBy: GroupByDimension
): string {
  if (groupBy === "year") {
    return String(observation.year);
  }

  return observation[groupBy];
}

export function aggregateByDimension(
  observations: CatalogObservation[],
  groupBy: GroupByDimension
): GroupedAggregationRow[] {
  const groups = new Map<string, CatalogObservation[]>();

  for (const observation of observations) {
    const key = getGroupKey(observation, groupBy);
    const current = groups.get(key) ?? [];
    current.push(observation);
    groups.set(key, current);
  }

  const rows = Array.from(groups.entries()).map(([group, items]) => {
    const emissions = items.map((item) => item.emissionFlux);
    const significances = items.map((item) => item.significanceSigma);
    const detectabilityValues = items.map((item) => item.detectability);
    const highDetectabilityCount = detectabilityValues.filter(
      (value) => value >= 70
    ).length;

    return {
      group,
      sampleCount: items.length,
      avgEmissionFlux: Number(average(emissions).toExponential(3)),
      medianEmissionFlux: Number(median(emissions).toExponential(3)),
      avgSignificance: round(average(significances)),
      peakSignificance: round(Math.max(...significances)),
      avgDetectability: round(average(detectabilityValues), 1),
      highDetectabilityShare: round(
        (highDetectabilityCount / items.length) * 100,
        1
      )
    };
  });

  return sortRows(rows, groupBy);
}

export function calculateHeadlineMetrics(
  observations: CatalogObservation[]
): HeadlineMetrics {
  const emissions = observations.map((item) => item.emissionFlux);
  const significances = observations.map((item) => item.significanceSigma);
  const detectabilityValues = observations.map((item) => item.detectability);

  const highDetectabilityShare =
    observations.length === 0
      ? 0
      : (detectabilityValues.filter((value) => value >= 70).length /
          observations.length) *
        100;

  return {
    samples: observations.length,
    avgEmissionFlux:
      observations.length === 0
        ? 0
        : Number(average(emissions).toExponential(3)),
    avgSignificance: round(average(significances)),
    avgDetectability: round(average(detectabilityValues), 1),
    highDetectabilityShare: round(highDetectabilityShare, 1)
  };
}

export function buildEmissionTrend(
  observations: CatalogObservation[],
  selectedCatalogs: CatalogKey[]
): CatalogYearPoint[] {
  const years = Array.from(new Set(observations.map((item) => item.year))).sort(
    (a, b) => a - b
  );

  return years.map((year) => {
    const point: CatalogYearPoint = { year };

    for (const catalog of selectedCatalogs) {
      const values = observations
        .filter((item) => item.year === year && item.catalog === catalog)
        .map((item) => item.emissionFlux);

      point[catalog] = values.length
        ? Number(average(values).toExponential(3))
        : undefined;
    }

    return point;
  });
}

export function buildEmissionComparison(
  observations: CatalogObservation[]
): CatalogEmissionComparison[] {
  return CATALOG_KEYS.map((catalog) => {
    const values = observations.filter((item) => item.catalog === catalog);
    const emissionValues = values.map((item) => item.emissionFlux);

    if (emissionValues.length === 0) {
      return null;
    }

    return {
      catalog,
      avgEmissionFlux: Number(average(emissionValues).toExponential(3)),
      peakEmissionFlux: Number(Math.max(...emissionValues).toExponential(3))
    };
  }).filter((value): value is CatalogEmissionComparison => value !== null);
}

export function buildSignificanceComparison(
  observations: CatalogObservation[]
): CatalogSignificanceComparison[] {
  return CATALOG_KEYS.map((catalog) => {
    const values = observations.filter((item) => item.catalog === catalog);
    const significanceValues = values.map((item) => item.significanceSigma);

    if (significanceValues.length === 0) {
      return null;
    }

    return {
      catalog,
      avgSignificance: round(average(significanceValues)),
      p95Significance: round(percentile(significanceValues, 95)),
      peakSignificance: round(Math.max(...significanceValues))
    };
  }).filter((value): value is CatalogSignificanceComparison => value !== null);
}

export function buildCatalogRadarComparison(
  observations: CatalogObservation[]
): CatalogRadarComparison[] {
  const baseRows = CATALOG_KEYS.map((catalog) => {
    const values = observations.filter((item) => item.catalog === catalog);

    if (values.length === 0) {
      return null;
    }

    const emissionValues = values.map((item) => item.emissionFlux);
    const significanceValues = values.map((item) => item.significanceSigma);
    const detectabilityValues = values.map((item) => item.detectability);
    const highDetectabilityShare =
      (detectabilityValues.filter((value) => value >= 70).length /
        values.length) *
      100;

    return {
      catalog,
      avgEmission: average(emissionValues),
      avgSignificance: average(significanceValues),
      avgDetectability: average(detectabilityValues),
      highDetectabilityShare
    };
  }).filter(
    (
      value
    ): value is {
      catalog: CatalogKey;
      avgEmission: number;
      avgSignificance: number;
      avgDetectability: number;
      highDetectabilityShare: number;
    } => value !== null
  );

  const maxEmission = Math.max(...baseRows.map((item) => item.avgEmission), 0);
  const maxSignificance = Math.max(
    ...baseRows.map((item) => item.avgSignificance),
    0
  );
  const maxDetectability = Math.max(
    ...baseRows.map((item) => item.avgDetectability),
    0
  );

  return baseRows.map((row) => ({
    catalog: row.catalog,
    emissionIndex:
      maxEmission === 0 ? 0 : round((row.avgEmission / maxEmission) * 100, 1),
    significanceIndex:
      maxSignificance === 0
        ? 0
        : round((row.avgSignificance / maxSignificance) * 100, 1),
    detectabilityIndex:
      maxDetectability === 0
        ? 0
        : round((row.avgDetectability / maxDetectability) * 100, 1),
    highDetectabilityShare: round(row.highDetectabilityShare, 1)
  }));
}

function bucketDetectability(value: number): "low" | "medium" | "high" {
  if (value < 40) {
    return "low";
  }

  if (value < 70) {
    return "medium";
  }

  return "high";
}

export function buildDetectabilityComparison(
  observations: CatalogObservation[]
): CatalogDetectabilityComparison[] {
  return CATALOG_KEYS.map((catalog) => {
    const values = observations.filter((item) => item.catalog === catalog);

    if (values.length === 0) {
      return null;
    }

    const bucketed = values.reduce(
      (acc, item) => {
        const bucket = bucketDetectability(item.detectability);
        acc[bucket] += 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );

    return {
      catalog,
      low: bucketed.low,
      medium: bucketed.medium,
      high: bucketed.high,
      avgDetectability: round(
        average(values.map((item) => item.detectability)),
        1
      )
    };
  }).filter((value): value is CatalogDetectabilityComparison => value !== null);
}

export function getCatalogLabel(catalog: CatalogKey): string {
  return CATALOG_META[catalog].label;
}
