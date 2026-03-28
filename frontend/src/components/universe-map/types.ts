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

export const CATEGORY_META: Record<
  CosmicCategory,
  { label: string; color: string }
> = {
  star: { label: "Star", color: "#facc15" },
  galaxy: { label: "Galaxy", color: "#a855f7" },
  nebula: { label: "Nebula", color: "#ec4899" },
  pulsar: { label: "Pulsar", color: "#22d3ee" },
  quasar: { label: "Quasar", color: "#f97316" },
  "black-hole": { label: "Black Hole", color: "#ef4444" },
  planet: { label: "Planet", color: "#22c55e" },
  cluster: { label: "Cluster", color: "#3b82f6" },
};
