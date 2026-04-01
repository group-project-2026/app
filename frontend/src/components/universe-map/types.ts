import type { TFunction } from "i18next";

export type CosmicCategory =
  | "star"
  | "galaxy"
  | "nebula"
  | "pulsar"
  | "quasar"
  | "black-hole"
  | "planet"
  | "cluster";

export interface CosmicPoint {
  id: string;
  name: string;
  category: CosmicCategory;
  ra: number;
  dec: number;
  magnitude: number;
  description: string;
  distance: string;
  discoveredBy: string;
}

export const CATEGORY_COLORS: Record<CosmicCategory, string> = {
  star: "#facc15",
  galaxy: "#a855f7",
  nebula: "#ec4899",
  pulsar: "#22d3ee",
  quasar: "#f97316",
  "black-hole": "#ef4444",
  planet: "#22c55e",
  cluster: "#3b82f6",
};

export const getCategoryMeta = (t: TFunction): Record<
  CosmicCategory,
  { label: string; color: string }
> => ({
  star: { label: t("universeMap.categories.star"), color: CATEGORY_COLORS.star },
  galaxy: { label: t("universeMap.categories.galaxy"), color: CATEGORY_COLORS.galaxy },
  nebula: { label: t("universeMap.categories.nebula"), color: CATEGORY_COLORS.nebula },
  pulsar: { label: t("universeMap.categories.pulsar"), color: CATEGORY_COLORS.pulsar },
  quasar: { label: t("universeMap.categories.quasar"), color: CATEGORY_COLORS.quasar },
  "black-hole": { label: t("universeMap.categories.blackHole"), color: CATEGORY_COLORS["black-hole"] },
  planet: { label: t("universeMap.categories.planet"), color: CATEGORY_COLORS.planet },
  cluster: { label: t("universeMap.categories.cluster"), color: CATEGORY_COLORS.cluster },
});

// Dla kompatybilności wstecznej - deprecated
export const CATEGORY_META: Record<
  CosmicCategory,
  { label: string; color: string }
> = {
  star: { label: "Star", color: CATEGORY_COLORS.star },
  galaxy: { label: "Galaxy", color: CATEGORY_COLORS.galaxy },
  nebula: { label: "Nebula", color: CATEGORY_COLORS.nebula },
  pulsar: { label: "Pulsar", color: CATEGORY_COLORS.pulsar },
  quasar: { label: "Quasar", color: CATEGORY_COLORS.quasar },
  "black-hole": { label: "Black Hole", color: CATEGORY_COLORS["black-hole"] },
  planet: { label: "Planet", color: CATEGORY_COLORS.planet },
  cluster: { label: "Cluster", color: CATEGORY_COLORS.cluster },
};
