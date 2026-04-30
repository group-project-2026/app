import { useQuery } from "@tanstack/react-query";
import type { SourcesQueryParams, SourcesResponse } from "./types";
import { fetchSources } from "./api";

export function useSourcesData(params: SourcesQueryParams) {
  return useQuery<SourcesResponse, Error>({
    queryKey: ["sources", params],
    queryFn: () => fetchSources(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData // Keep previous data while loading
  });
}
