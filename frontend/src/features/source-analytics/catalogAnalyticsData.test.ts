import {
  CATALOG_ANALYTICS_DATA,
  CATALOG_KEYS,
  CATALOG_META,
  ENERGY_BANDS,
  SKY_REGIONS,
  SOURCE_TYPES
} from "./catalogAnalyticsData";

describe("catalog analytics generated dataset", () => {
  it("contains the full cartesian product for each catalog and year", () => {
    const expectedPerCatalog =
      5 * ENERGY_BANDS.length * SKY_REGIONS.length * SOURCE_TYPES.length;
    const expectedTotal = CATALOG_KEYS.length * expectedPerCatalog;

    expect(CATALOG_ANALYTICS_DATA).toHaveLength(expectedTotal);

    const perCatalogCounts = new Map<string, number>();
    for (const row of CATALOG_ANALYTICS_DATA) {
      perCatalogCounts.set(
        row.catalog,
        (perCatalogCounts.get(row.catalog) ?? 0) + 1
      );
    }

    for (const catalog of CATALOG_KEYS) {
      expect(perCatalogCounts.get(catalog)).toBe(expectedPerCatalog);
    }
  });

  it("produces unique ids and valid metric ranges", () => {
    const ids = new Set<string>();

    for (const row of CATALOG_ANALYTICS_DATA) {
      ids.add(row.id);
      expect(row.emissionFlux).toBeGreaterThan(0);
      expect(row.significanceSigma).toBeGreaterThan(0);
      expect(row.detectability).toBeGreaterThanOrEqual(0);
      expect(row.detectability).toBeLessThanOrEqual(100);
    }

    expect(ids.size).toBe(CATALOG_ANALYTICS_DATA.length);
  });

  it("uses metadata keys consistently", () => {
    const metadataKeys = Object.keys(CATALOG_META).sort();
    const catalogKeys = [...CATALOG_KEYS].sort();

    expect(catalogKeys).toEqual(metadataKeys);
  });

  it("shows increasing average significance over years for each catalog", () => {
    for (const catalog of CATALOG_KEYS) {
      const yearAverages = [2021, 2022, 2023, 2024, 2025].map((year) => {
        const rows = CATALOG_ANALYTICS_DATA.filter(
          (item) => item.catalog === catalog && item.year === year
        );

        const sum = rows.reduce((acc, item) => acc + item.significanceSigma, 0);
        return sum / rows.length;
      });

      for (let index = 1; index < yearAverages.length; index += 1) {
        expect(yearAverages[index]).toBeGreaterThan(
          yearAverages[index - 1] ?? 0
        );
      }
    }
  });
});
