import { useQuery } from "@tanstack/react-query";
import type { CatalogEntry } from "./types";
import { fetchCatalogEntriesBySource } from "./api";

export function useSourceCatalogEntries(id: string | undefined) {
  return useQuery<CatalogEntry[], Error>({
    queryKey: ["source-catalog-entries", id],
    queryFn: () => fetchCatalogEntriesBySource(id!),
    enabled: Boolean(id)
  });
}

