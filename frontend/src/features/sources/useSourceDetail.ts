import { useQuery } from "@tanstack/react-query";
import type { SourceDetail } from "./types";
import { fetchSourceDetail } from "./api";

export function useSourceDetail(id: string | undefined) {
  return useQuery<SourceDetail, Error>({
    queryKey: ["source-detail", id],
    queryFn: () => fetchSourceDetail(id!),
    enabled: Boolean(id)
  });
}

