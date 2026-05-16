import { CATALOG_ANALYTICS_DATA, CATALOG_KEYS } from "./catalogAnalyticsData";
import {
  aggregateByDimension,
  buildCatalogRadarComparison,
  buildDetectabilityComparison,
  buildEmissionComparison,
  buildEmissionTrend,
  buildSignificanceComparison,
  calculateHeadlineMetrics,
  getCatalogLabel
} from "./aggregations";

describe("source analytics aggregations", () => {
  it("aggregates by catalog with stable sample counts", () => {
    const rows = aggregateByDimension(CATALOG_ANALYTICS_DATA, "catalog");

    expect(rows).toHaveLength(CATALOG_KEYS.length);

    for (const row of rows) {
      expect(row.sampleCount).toBe(240);
      expect(row.avgSignificance).toBeGreaterThan(0);
      expect(row.avgDetectability).toBeGreaterThan(0);
    }
  });

  it("builds detectability buckets that sum to total samples", () => {
    const rows = buildDetectabilityComparison(CATALOG_ANALYTICS_DATA);

    expect(rows).toHaveLength(CATALOG_KEYS.length);

    for (const row of rows) {
      expect(row.low + row.medium + row.high).toBe(240);
      expect(row.avgDetectability).toBeGreaterThan(0);
      expect(row.avgDetectability).toBeLessThanOrEqual(100);
    }
  });

  it("returns zeroed headline metrics for empty input", () => {
    expect(calculateHeadlineMetrics([])).toEqual({
      samples: 0,
      avgEmissionFlux: 0,
      avgSignificance: 0,
      avgDetectability: 0,
      highDetectabilityShare: 0
    });
  });

  it("sorts year aggregations numerically", () => {
    const rows = aggregateByDimension(CATALOG_ANALYTICS_DATA, "year");
    expect(rows.map((row) => row.group)).toEqual([
      "2021",
      "2022",
      "2023",
      "2024",
      "2025"
    ]);
  });

  it("builds trend points with undefined values when catalog is missing", () => {
    const onlyFermin = CATALOG_ANALYTICS_DATA.filter(
      (item) => item.catalog === "FERMIN"
    );

    const trend = buildEmissionTrend(onlyFermin, ["FERMIN", "HAWC"]);
    expect(trend).toHaveLength(5);

    for (const point of trend) {
      expect(point.FERMIN).toBeDefined();
      expect(point.HAWC).toBeUndefined();
    }
  });

  it("builds per-catalog comparisons for emission and significance", () => {
    const emission = buildEmissionComparison(CATALOG_ANALYTICS_DATA);
    const significance = buildSignificanceComparison(CATALOG_ANALYTICS_DATA);

    expect(emission).toHaveLength(CATALOG_KEYS.length);
    expect(significance).toHaveLength(CATALOG_KEYS.length);
    expect(
      emission.every((row) => row.peakEmissionFlux >= row.avgEmissionFlux)
    ).toBe(true);
    expect(
      significance.every((row) => row.peakSignificance >= row.avgSignificance)
    ).toBe(true);
  });

  it("normalizes radar comparison indices to 0-100", () => {
    const radarRows = buildCatalogRadarComparison(CATALOG_ANALYTICS_DATA);
    expect(radarRows).toHaveLength(CATALOG_KEYS.length);

    const maxEmissionIndex = Math.max(
      ...radarRows.map((row) => row.emissionIndex)
    );
    const maxSignificanceIndex = Math.max(
      ...radarRows.map((row) => row.significanceIndex)
    );
    const maxDetectabilityIndex = Math.max(
      ...radarRows.map((row) => row.detectabilityIndex)
    );

    expect(maxEmissionIndex).toBe(100);
    expect(maxSignificanceIndex).toBe(100);
    expect(maxDetectabilityIndex).toBe(100);
  });

  it("exposes catalog display labels", () => {
    expect(getCatalogLabel("TEVCAT")).toBe("TeVCat");
    expect(getCatalogLabel("FERMIN")).toBe("Fermin");
  });
});
