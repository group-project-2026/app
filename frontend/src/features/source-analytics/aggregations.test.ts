import { CATALOG_ANALYTICS_DATA, CATALOG_KEYS } from "./catalogAnalyticsData";
import {
  aggregateByDimension,
  buildDetectabilityComparison
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
});
