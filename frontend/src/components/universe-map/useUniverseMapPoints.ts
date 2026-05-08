import { useQuery } from "@tanstack/react-query";
import type { CosmicPoint } from "./types";
import { fetchUniverseMapPoints } from "./api";

export function useUniverseMapPoints() {
  return useQuery<CosmicPoint[], Error>({
    queryKey: ["universe-map-points"],
    queryFn: fetchUniverseMapPoints,
    staleTime: 5 * 60 * 1000,
  });
}
