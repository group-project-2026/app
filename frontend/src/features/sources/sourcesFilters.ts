import type { FilterConfig } from "@/components/data-table-types";
import { SOURCE_CLASS_OPTIONS } from "./types";

export const sourcesFilters: FilterConfig[] = [
  {
    id: "search",
    type: "text",
    label: "Search",
    field: "search",
    placeholder: "Search by source name..."
  },
  {
    id: "sourceClass",
    type: "multiselect",
    label: "Source Class",
    field: "sourceClass",
    options: SOURCE_CLASS_OPTIONS
  },
  {
    id: "raRange",
    type: "range",
    label: "RA Range (°)",
    field: "ra",
    min: 0,
    max: 360,
    step: 1
  },
  {
    id: "decRange",
    type: "range",
    label: "Dec Range (°)",
    field: "dec",
    min: -90,
    max: 90,
    step: 1
  },
  {
    id: "fluxRange",
    type: "number",
    label: "Min Flux (ph/cm²/s)",
    field: "fluxMin",
    min: 0,
    step: 0.0000000001,
    placeholder: "e.g., 1e-9"
  },
  {
    id: "significance",
    type: "number",
    label: "Min Significance (σ)",
    field: "significanceMin",
    min: 0,
    step: 0.1,
    placeholder: "e.g., 5"
  }
];
