import type { ColumnDef } from "@/components/data-table-types";
import type { Source, SourceClass } from "./types";
import { SOURCE_CLASS_LABELS } from "./types";
import { Badge } from "@/components/ui/badge";

const isSourceClass = (value: unknown): value is SourceClass =>
  typeof value === "string" && value in SOURCE_CLASS_LABELS;

const formatFixed = (value: unknown, digits: number): string =>
  typeof value === "number" ? value.toFixed(digits) : "-";

const formatExponential = (value: unknown, digits: number): string =>
  typeof value === "number" ? value.toExponential(digits) : "-";

export const sourcesColumns: ColumnDef<Source>[] = [
  {
    id: "name",
    header: "Source Name",
    accessorKey: "name",
    sortable: true,
    className: "font-medium"
  },
  {
    id: "sourceClass",
    header: "Class",
    accessorKey: "sourceClass",
    cell: ({ value }) => (
      <Badge variant="outline">
        {isSourceClass(value) ? SOURCE_CLASS_LABELS[value] : "Unknown"}
      </Badge>
    ),
    sortable: false
  },
  {
    id: "ra",
    header: "RA (°)",
    accessorKey: "ra",
    cell: ({ value }) => formatFixed(value, 2),
    sortable: true
  },
  {
    id: "dec",
    header: "Dec (°)",
    accessorKey: "dec",
    cell: ({ value }) => formatFixed(value, 2),
    sortable: true
  },
  {
    id: "glon",
    header: "GLON (°)",
    accessorKey: "glon",
    cell: ({ value }) => formatFixed(value, 2),
    sortable: true
  },
  {
    id: "glat",
    header: "GLAT (°)",
    accessorKey: "glat",
    cell: ({ value }) => formatFixed(value, 2),
    sortable: true
  },
  {
    id: "flux",
    header: "Flux (ph/cm²/s)",
    accessorKey: "flux",
    cell: ({ value }) => formatExponential(value, 2),
    sortable: true,
    className: "font-mono text-sm"
  },
  {
    id: "spectralIndex",
    header: "Spectral Index",
    accessorKey: "spectralIndex",
    cell: ({ value }) => formatFixed(value, 2),
    sortable: true
  },
  {
    id: "significance",
    header: "Significance (σ)",
    accessorKey: "significance",
    cell: ({ value }) => formatFixed(value, 1),
    sortable: true
  }
];
