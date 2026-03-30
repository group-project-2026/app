import { CATEGORY_META } from "../types";
import type { CosmicCategory } from "../types";

describe("types", () => {
  describe("CATEGORY_META", () => {
    const EXPECTED_CATEGORIES: CosmicCategory[] = [
      "star",
      "galaxy",
      "nebula",
      "pulsar",
      "quasar",
      "black-hole",
      "planet",
      "cluster",
    ];

    it("should contain all 8 cosmic categories", () => {
      const keys = Object.keys(CATEGORY_META);
      expect(keys).toHaveLength(8);
      for (const cat of EXPECTED_CATEGORIES) {
        expect(CATEGORY_META).toHaveProperty(cat);
      }
    });

    it("should have a label and color for each category", () => {
      for (const cat of EXPECTED_CATEGORIES) {
        const meta = CATEGORY_META[cat];
        expect(meta.label).toBeDefined();
        expect(meta.label.length).toBeGreaterThan(0);
        expect(meta.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it("should have unique colors for all categories", () => {
      const colors = Object.values(CATEGORY_META).map((m) => m.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });

    it("should have unique labels for all categories", () => {
      const labels = Object.values(CATEGORY_META).map((m) => m.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });
  });
});
