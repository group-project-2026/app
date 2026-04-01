import type { TFunction } from "i18next";
import type { ColumnDef } from "@/components/data-table-types";
import type { Source, SourceClass } from "./types";
import { Badge } from "@/components/ui/badge";

const isSourceClass = (value: unknown): value is SourceClass =>
  typeof value === "string" &&
  ["PSR", "BLL", "FSRQ", "AGN", "UNK", "BIN", "HMB", "SNR"].includes(value);

const formatFixed = (value: unknown, digits: number): string =>
  typeof value === "number" ? value.toFixed(digits) : "-";

const formatExponential = (value: unknown, digits: number): string =>
  typeof value === "number" ? value.toExponential(digits) : "-";

const getSourceClassLabel = (value: SourceClass, t: TFunction): string => {
  const labels: Record<SourceClass, string> = {
    PSR: t("sources.classes.pulsar"),
    BLL: t("sources.classes.blLac"),
    FSRQ: t("sources.classes.fsrq"),
    AGN: t("sources.classes.agn"),
    UNK: t("sources.classes.unknown"),
    BIN: t("sources.classes.binary"),
    HMB: t("sources.classes.hmb"),
    SNR: t("sources.classes.snr")
  };
  return labels[value];
};

export const getSourcesColumns = (t: TFunction): ColumnDef<Source>[] => [
  {
    id: "name",
    header: t("sources.columns.sourceName"),
    accessorKey: "name",
    sortable: true,
    className: "font-medium"
  },
  {
    id: "sourceClass",
    header: t("sources.columns.class"),
    accessorKey: "sourceClass",
    cell: ({ value }) => (
      <Badge
        variant="outline"
        className="border-slate-500/80 bg-slate-800/70 text-slate-100"
      >
        {isSourceClass(value) ? getSourceClassLabel(value, t) : t("sources.columns.unknown")}
      </Badge>
    ),
    sortable: false
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
    id: "glon",
    header: t("sources.columns.glon"),
    accessorKey: "glon",
    cell: ({ value }) => formatFixed(value, 2),
    sortable: true
  },
  {
    id: "glat",
    header: t("sources.columns.glat"),
    accessorKey: "glat",
    cell: ({ value }) => formatFixed(value, 2),
    sortable: true
  },
  {
    id: "flux",
    header: t("sources.columns.flux"),
    accessorKey: "flux",
    cell: ({ value }) => formatExponential(value, 2),
    sortable: true,
    className: "font-mono text-sm"
  },
  {
    id: "spectralIndex",
    header: t("sources.columns.spectralIndex"),
    accessorKey: "spectralIndex",
    cell: ({ value }) => formatFixed(value, 2),
    sortable: true
  },
  {
    id: "significance",
    header: t("sources.columns.significance"),
    accessorKey: "significance",
    cell: ({ value }) => formatFixed(value, 1),
    sortable: true
  }
];
