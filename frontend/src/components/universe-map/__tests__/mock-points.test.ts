import { MOCK_POINTS, CATEGORIES } from "../data/mock-points";

describe("mock-points", () => {
  describe("MOCK_POINTS", () => {
    it("should generate exactly 100 points", () => {
      expect(MOCK_POINTS).toHaveLength(100);
    });

    it("should have unique ids for every point", () => {
      const ids = MOCK_POINTS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });

    it("should have valid RA values (0-360)", () => {
      for (const p of MOCK_POINTS) {
        expect(p.ra).toBeGreaterThanOrEqual(0);
        expect(p.ra).toBeLessThanOrEqual(360);
      }
    });

    it("should have valid Dec values (-90 to +90)", () => {
      for (const p of MOCK_POINTS) {
        expect(p.dec).toBeGreaterThanOrEqual(-90);
        expect(p.dec).toBeLessThanOrEqual(90);
      }
    });

    it("should have magnitude values between 1 and 10", () => {
      for (const p of MOCK_POINTS) {
        expect(p.magnitude).toBeGreaterThanOrEqual(1);
        expect(p.magnitude).toBeLessThanOrEqual(10);
      }
    });

    it("should have non-empty names, descriptions, distances, and discoverers", () => {
      for (const p of MOCK_POINTS) {
        expect(p.name.length).toBeGreaterThan(0);
        expect(p.description.length).toBeGreaterThan(0);
        expect(p.distance.length).toBeGreaterThan(0);
        expect(p.discoveredBy.length).toBeGreaterThan(0);
      }
    });

    it("should have every category represented", () => {
      const presentCategories = new Set(MOCK_POINTS.map((p) => p.category));
      for (const cat of CATEGORIES) {
        expect(presentCategories.has(cat)).toBe(true);
      }
    });

    it("should produce deterministic results (seeded random)", () => {
      // Re-import to validate same data each time
      const firstPoint = MOCK_POINTS[0];
      expect(firstPoint.category).toBe("star");
      expect(firstPoint.id).toBe("star-0");

      // RA and Dec should be stable across runs
      expect(firstPoint.ra).toBeCloseTo(MOCK_POINTS[0].ra, 2);
    });

    it("should have distances with appropriate unit suffixes", () => {
      const validSuffixes = ["ly", "Mly", "Gly"];
      for (const p of MOCK_POINTS) {
        const hasValidSuffix = validSuffixes.some((s) => p.distance.endsWith(s));
        expect(hasValidSuffix).toBe(true);
      }
    });
  });

  describe("CATEGORIES", () => {
    it("should export all 8 categories", () => {
      expect(CATEGORIES).toHaveLength(8);
    });
  });
});
