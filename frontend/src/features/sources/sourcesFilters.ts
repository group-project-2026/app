import type { TFunction } from "i18next";
import type { FilterConfig } from "@/components/data-table-types";
import type { CatalogName } from "./types";

export const getSourcesFilters = (t: TFunction): FilterConfig[] => {
  const primaryCatalogOptions: Array<{ value: CatalogName; label: string }> = [
    { value: "FERMI", label: "FERMI" },
    { value: "LHAASO", label: "LHAASO" },
    { value: "HAWC", label: "HAWC" },
    { value: "TEVCAT", label: "TEVCAT" },
    { value: "NED", label: "NED" }
  ];
  const sourceClassOptions = [
    { value: "PSR", label: "PSR" },
    { value: "PWN", label: "PWN" },
    { value: "SNR", label: "SNR" },
    { value: "AGN", label: "AGN" },
    { value: "FSRQ", label: "FSRQ" },
    { value: "BLL", label: "BLL" },
    { value: "BCU", label: "BCU" },
    { value: "UNK", label: "UNK" }
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
      id: "primaryCatalog",
      type: "multiselect",
      label: t("sources.filterLabels.primaryCatalog"),
      field: "primaryCatalog",
      options: primaryCatalogOptions
    },
    {
      id: "sourceClasses",
      type: "multiselect",
      label: t("sources.filterLabels.sourceClass"),
      field: "sourceClasses",
      options: sourceClassOptions
    },
    {
      id: "raRange",
      type: "range",
      label: t("sources.filterLabels.raRange"),
      field: "ra",
      min: 0,
      max: 360,
      step: 0.1
    },
    {
      id: "decRange",
      type: "range",
      label: t("sources.filterLabels.decRange"),
      field: "dec",
      min: -90,
      max: 90,
      step: 0.1
    },
    {
      id: "confidenceMin",
      type: "number",
      label: t("sources.filterLabels.minConfidence"),
      field: "confidenceMin",
      min: 0,
      max: 1,
      step: 0.01,
      placeholder: t("sources.filterLabels.confidencePlaceholder")
    },
    {
      id: "confidenceMax",
      type: "number",
      label: t("sources.filterLabels.maxConfidence"),
      field: "confidenceMax",
      min: 0,
      max: 1,
      step: 0.01,
      placeholder: t("sources.filterLabels.confidencePlaceholder")
    },
    {
      id: "significanceMin",
      type: "number",
      label: t("sources.filterLabels.minSignificance"),
      field: "significanceMin",
      step: 0.1,
      placeholder: t("sources.filterLabels.significancePlaceholder")
    },
    {
      id: "significanceMax",
      type: "number",
      label: t("sources.filterLabels.maxSignificance"),
      field: "significanceMax",
      step: 0.1,
      placeholder: t("sources.filterLabels.significancePlaceholder")
    },
    {
      id: "fluxMin",
      type: "number",
      label: t("sources.filterLabels.minFlux"),
      field: "fluxMin",
      step: 0.0000001,
      placeholder: t("sources.filterLabels.fluxPlaceholder")
    },
    {
      id: "fluxMax",
      type: "number",
      label: t("sources.filterLabels.maxFlux"),
      field: "fluxMax",
      step: 0.0000001,
      placeholder: t("sources.filterLabels.fluxPlaceholder")
    },
    {
      id: "minCatalogCount",
      type: "number",
      label: t("sources.filterLabels.minCatalogCount"),
      field: "minCatalogCount",
      min: 1,
      step: 1,
      placeholder: t("sources.filterLabels.minCatalogCountPlaceholder")
    }
  ];
};
