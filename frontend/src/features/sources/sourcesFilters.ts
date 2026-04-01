import type { TFunction } from "i18next";
import type { FilterConfig } from "@/components/data-table-types";
import type { SourceClass } from "./types";

export const getSourcesFilters = (t: TFunction): FilterConfig[] => {
  const sourceClassOptions: Array<{ value: SourceClass; label: string }> = [
    { value: "PSR", label: t("sources.classes.pulsar") },
    { value: "BLL", label: t("sources.classes.blLac") },
    { value: "FSRQ", label: t("sources.classes.fsrq") },
    { value: "AGN", label: t("sources.classes.agn") },
    { value: "UNK", label: t("sources.classes.unknown") },
    { value: "BIN", label: t("sources.classes.binary") },
    { value: "HMB", label: t("sources.classes.hmb") },
    { value: "SNR", label: t("sources.classes.snr") }
  ];

  return [
    {
      id: "search",
      type: "text",
      label: t("sources.filterLabels.search"),
      field: "search",
      placeholder: t("sources.filterLabels.searchPlaceholder")
    },
    {
      id: "sourceClass",
      type: "multiselect",
      label: t("sources.filterLabels.sourceClass"),
      field: "sourceClass",
      options: sourceClassOptions
    },
    {
      id: "raRange",
      type: "range",
      label: t("sources.filterLabels.raRange"),
      field: "ra",
      min: 0,
      max: 360,
      step: 1
    },
    {
      id: "decRange",
      type: "range",
      label: t("sources.filterLabels.decRange"),
      field: "dec",
      min: -90,
      max: 90,
      step: 1
    },
    {
      id: "fluxRange",
      type: "number",
      label: t("sources.filterLabels.minFlux"),
      field: "fluxMin",
      min: 0,
      step: 0.0000000001,
      placeholder: t("sources.filterLabels.fluxPlaceholder")
    },
    {
      id: "significance",
      type: "number",
      label: t("sources.filterLabels.minSignificance"),
      field: "significanceMin",
      min: 0,
      step: 0.1,
      placeholder: t("sources.filterLabels.sigPlaceholder")
    }
  ];
};
