import type { TFunction } from "i18next";
import type { ColumnDef } from "@/components/data-table-types";
import type { Source } from "./types";
import { Badge } from "@/components/ui/badge";

const formatFixed = (value: unknown, digits: number): string =>
  typeof value === "number" ? value.toFixed(digits) : "-";

const formatExponential = (value: unknown, digits: number): string =>
  typeof value === "number" ? value.toExponential(digits) : "-";

const formatText = (value: unknown): string =>
  typeof value === "string" && value.trim().length > 0 ? value : "-";

export const getSourcesColumns = (t: TFunction): ColumnDef<Source>[] => [
  {
    id: "unified_name",
    header: t("sources.columns.sourceName"),
    accessorKey: "unified_name",
    sortable: true,
    className: "font-medium"
  },
  {
    id: "primary_catalog",
    header: t("sources.columns.primaryCatalog"),
    accessorKey: "primary_catalog",
    cell: ({ value }) => (
      <Badge
        variant="outline"
        className="border-slate-500/80 bg-slate-800/70 text-slate-100"
      >
        {typeof value === "string" ? value : t("sources.columns.unknown")}
      </Badge>
    ),
    sortable: true
  },
  {
    id: "ra",
    header: t("sources.columns.ra"),
    accessorKey: "ra",
    cell: ({ value }) => formatFixed(value, 2),
    sortable: true
  },
  {
    id: "dec",
    header: t("sources.columns.dec"),
    accessorKey: "dec",
    cell: ({ value }) => formatFixed(value, 2),
    sortable: true
  },
  {
    id: "catalog_count",
    header: t("sources.columns.catalogCount"),
    accessorKey: "catalog_count",
    sortable: true
  },
  {
    id: "source_class",
    header: t("sources.columns.sourceClass"),
    accessorKey: "source_class",
    cell: ({ value }) => formatText(value),
    sortable: true
  },
  {
    id: "associated_name",
    header: t("sources.columns.associatedName"),
    accessorKey: "associated_name",
    cell: ({ value }) => formatText(value),
    sortable: true
  },
  {
    id: "discovery_method",
    header: t("sources.columns.discoveryMethod"),
    accessorKey: "discovery_method",
    cell: ({ value }) => formatText(value),
    sortable: true
  },
  {
    id: "significance",
    header: t("sources.columns.significance"),
    accessorKey: "significance",
    cell: ({ value }) => formatFixed(value, 2),
    sortable: true
  },
  {
    id: "flux1000",
    header: t("sources.columns.flux1000"),
    accessorKey: "flux1000",
    cell: ({ value }) => formatExponential(value, 2),
    sortable: true
  },
  {
    id: "spectral_index",
    header: t("sources.columns.spectralIndex"),
    accessorKey: "spectral_index",
    cell: ({ value }) => formatFixed(value, 3),
    sortable: true
  },
  {
    id: "avg_confidence",
    header: t("sources.columns.avgConfidence"),
    accessorKey: "avg_confidence",
    cell: ({ value }) => formatFixed(value, 3),
    sortable: true
  },
  {
    id: "best_confidence",
    header: t("sources.columns.bestConfidence"),
    accessorKey: "best_confidence",
    cell: ({ value }) => formatFixed(value, 3),
    sortable: true
  }
];
