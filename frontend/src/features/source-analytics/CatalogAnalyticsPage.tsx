import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
  Tooltip,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { CatalogName } from "../sources/types";
import {
  buildAnalyticsGroupRows,
  fetchSourceAnalytics,
  fetchBackendAnalytics,
  SOURCE_CATALOGS,
  SOURCE_CATALOG_META,
  type GroupByDimension,
  type SourceAnalyticsData,
  type BackendAnalyticsResponse
} from "./api";
import { CatalogSkyMap } from "./CatalogSkyMap";

const GROUPING_OPTIONS_KEYS: Array<{
  value: GroupByDimension;
  translationKey: string;
}> = [
  { value: "catalog", translationKey: "analytics.groupingOptions.catalog" },
  {
    value: "sourceClass",
    translationKey: "analytics.groupingOptions.sourceClass"
  },
  {
    value: "discoveryMethod",
    translationKey: "analytics.groupingOptions.discoveryMethod"
  },
  {
    value: "confidenceBand",
    translationKey: "analytics.groupingOptions.confidenceBand"
  },
  {
    value: "catalogCountBand",
    translationKey: "analytics.groupingOptions.catalogCountBand"
  }
];

const CLASS_COLORS = [
  "#2A9D8F",
  "#E76F51",
  "#577590",
  "#F9C74F",
  "#9B5DE5",
  "#00BBF9"
];

function formatFlux(value: number | string | undefined): string {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return numeric.toExponential(2);
}

function formatFloat(value: number | string | undefined, digits = 2): string {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return numeric.toFixed(digits);
}

function formatCatalogLabel(catalog: string): string {
  if (catalog in SOURCE_CATALOG_META) {
    return SOURCE_CATALOG_META[catalog as CatalogName].label;
  }

  return catalog;
}

function formatGroupLabel(
  groupBy: GroupByDimension,
  value: string,
  t: (key: string) => string
): string {
  if (groupBy === "catalog") {
    return formatCatalogLabel(value);
  }

  if (groupBy === "confidenceBand") {
    return t(`analytics.confidenceBands.${value}`);
  }

  if (groupBy === "catalogCountBand") {
    return t(`analytics.catalogCountBands.${value}`);
  }

  return value;
}

function buildClassMixConfig(
  topClasses: string[],
  t: (key: string) => string
): ChartConfig {
  const config: ChartConfig = {
    Other: {
      label: t("analytics.other"),
      color: "#B8B8B8"
    }
  };

  topClasses.forEach((className, index) => {
    config[className] = {
      label: className,
      color: CLASS_COLORS[index % CLASS_COLORS.length]
    };
  });

  return config;
}

export function CatalogAnalyticsPage() {
  const { t } = useTranslation();
  const [selectedCatalogs, setSelectedCatalogs] =
    useState<CatalogName[]>(SOURCE_CATALOGS);
  const [groupBy, setGroupBy] = useState<GroupByDimension>("catalog");

  const analyticsQuery = useQuery<SourceAnalyticsData, Error>({
    queryKey: ["source-analytics", selectedCatalogs],
    queryFn: () => fetchSourceAnalytics(selectedCatalogs),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData
  });

  const backendAnalyticsQuery = useQuery<
    BackendAnalyticsResponse | null,
    Error
  >({
    queryKey: ["backend-analytics", selectedCatalogs],
    queryFn: () => fetchBackendAnalytics(selectedCatalogs),
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  const analyticsData = analyticsQuery.data;
  const sources = useMemo(
    () => analyticsData?.sources ?? [],
    [analyticsData?.sources]
  );
  const groupingRows = useMemo(
    () => buildAnalyticsGroupRows(sources, groupBy),
    [sources, groupBy]
  );
  const headlineMetrics = analyticsData?.headlineMetrics ?? {
    samples: 0,
    avgSignificance: 0,
    avgFlux1000: 0,
    avgConfidence: 0,
    multiCatalogShare: 0
  };
  const catalogComparison = analyticsData?.catalogComparison ?? [];
  const topSources = analyticsData?.topSources ?? [];
  const classMixRows = analyticsData?.classMixRows ?? [];
  const topClasses = useMemo(
    () => analyticsData?.topClasses ?? [],
    [analyticsData?.topClasses]
  );

  const catalogComparisonConfig = useMemo<ChartConfig>(
    () => ({
      scienceScore: {
        label: t("analytics.comparison.scienceScore"),
        color: "#2A9D8F"
      },
      multiCatalogShare: {
        label: t("analytics.comparison.multiCatalogShare"),
        color: "#E76F51"
      }
    }),
    [t]
  );

  const catalogCoverageConfig = useMemo<ChartConfig>(
    () => ({
      sampleCount: {
        label: t("analytics.coverageMetrics.sampleCount"),
        color: "#577590"
      },
      classDiversity: {
        label: t("analytics.coverageMetrics.classDiversity"),
        color: "#F9C74F"
      }
    }),
    [t]
  );
  const classMixConfig = useMemo(
    () => buildClassMixConfig(topClasses, t),
    [topClasses, t]
  );

  const significanceHistogram = analyticsData?.significanceHistogram;

  const histogramBins = useMemo(() => {
    if (!significanceHistogram)
      return [] as Array<{ label: string; edges: [number, number] }>;
    const edges = significanceHistogram.edges;
    const bins: Array<{ label: string; edges: [number, number] }> = [];
    for (let i = 0; i < edges.length - 1; i++) {
      const lo = edges[i];
      const hi = edges[i + 1];
      bins.push({
        label: `${lo.toExponential(1)}-${hi.toExponential(1)}`,
        edges: [lo, hi]
      });
    }
    return bins;
  }, [significanceHistogram]);

  const histogramChartConfig = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {};
    for (const cat of SOURCE_CATALOGS) {
      cfg[cat] = {
        label: SOURCE_CATALOG_META[cat].label,
        color: SOURCE_CATALOG_META[cat].color
      };
    }
    return cfg;
  }, []);

  const histogramCombinedData = useMemo(() => {
    if (!significanceHistogram) return [];
    const per = significanceHistogram.perCatalog || {};
    const bins = histogramBins;
    return bins.map((b, idx) => {
      const row: Record<string, string | number> = { bin: b.label };
      for (const cat of SOURCE_CATALOGS) {
        const catalogEntry = per[cat];
        row[cat] = catalogEntry?.bins?.[idx]?.count ?? 0;
      }
      return row;
    });
  }, [significanceHistogram, histogramBins]);

  const toggleCatalog = (catalog: CatalogName) => {
    setSelectedCatalogs((previous) => {
      if (previous.includes(catalog)) {
        if (previous.length === 1) {
          return previous;
        }

        return previous.filter((item) => item !== catalog);
      }

      return [...previous, catalog];
    });
  };

  const selectedGroupingLabel = t(
    GROUPING_OPTIONS_KEYS.find((item) => item.value === groupBy)
      ?.translationKey ?? "analytics.groupingOptions.catalog"
  );

  const selectedCatalogComparison = catalogComparison.filter((row) =>
    selectedCatalogs.includes(row.catalog)
  );

  // Prepare radar data
  const radarData =
    analyticsData?.radarComparison?.map((row) => ({
      catalog: SOURCE_CATALOG_META[row.catalog].label,
      Significance: row.significanceIndex,
      Flux: row.fluxIndex,
      Confidence: row.confidenceIndex,
      Connectivity: row.connectivityIndex,
      "Class Diversity": row.classDiversityIndex
    })) ?? [];

  const radarConfig = useMemo<ChartConfig>(
    () => ({
      Significance: {
        label: t("analytics.radarMetrics.significance"),
        color: "#2A9D8F"
      },
      Flux: {
        label: t("analytics.radarMetrics.flux"),
        color: "#E76F51"
      },
      Confidence: {
        label: t("analytics.radarMetrics.confidence"),
        color: "#F9C74F"
      },
      Connectivity: {
        label: t("analytics.radarMetrics.connectivity"),
        color: "#577590"
      },
      "Class Diversity": {
        label: t("analytics.radarMetrics.classDiversity"),
        color: "#B06CD5"
      }
    }),
    [t]
  );

  // Prepare emission trend data (by catalog)
  const emissionTrendData = selectedCatalogComparison.map((row) => ({
    catalog: SOURCE_CATALOG_META[row.catalog].label,
    avgFlux: row.avgFlux1000,
    peakFlux: row.avgFlux1000 * 1.5, // estimated peak
    avgSignificance: row.avgSignificance
  }));

  const emissionTrendConfig = useMemo<ChartConfig>(
    () => ({
      avgFlux: {
        label: t("analytics.emissionMetrics.avgFlux"),
        color: "#2E86AB"
      },
      peakFlux: {
        label: t("analytics.emissionMetrics.peakFlux"),
        color: "#A23B72"
      }
    }),
    [t]
  );

  return (
    <main className="min-h-screen w-full">
      <div className="container mx-auto py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("analytics.title")}
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            {t("analytics.description")}
          </p>
        </header>

        {analyticsQuery.isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.loadingTitle")}</CardTitle>
              <CardDescription>
                {t("analytics.loadingDescription")}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {analyticsQuery.isError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.errorTitle")}</CardTitle>
              <CardDescription>
                {analyticsQuery.error instanceof Error
                  ? analyticsQuery.error.message
                  : t("analytics.errorDescription")}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <section className="grid gap-6">
          <CatalogSkyMap selectedCatalogs={selectedCatalogs} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.analysisScope")}</CardTitle>
            <CardDescription>
              {t("analytics.analysisScopeDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {SOURCE_CATALOGS.map((catalog) => {
                const active = selectedCatalogs.includes(catalog);

                return (
                  <Button
                    key={catalog}
                    type="button"
                    variant={active ? "default" : "outline"}
                    onClick={() => toggleCatalog(catalog)}
                  >
                    {SOURCE_CATALOG_META[catalog].label}
                  </Button>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("analytics.groupingsTitle")}</CardTitle>
                <CardDescription>
                  {t("analytics.groupingsDescription", {
                    grouping: selectedGroupingLabel
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("analytics.tableColumns.group")}</TableHead>
                      <TableHead>
                        {t("analytics.tableColumns.samples")}
                      </TableHead>
                      <TableHead>
                        {t("analytics.tableColumns.avgEmission")}
                      </TableHead>
                      <TableHead>
                        {t("analytics.tableColumns.avgSigma")}
                      </TableHead>
                      <TableHead>
                        {t("analytics.tableColumns.avgConfidence")}
                      </TableHead>
                      <TableHead>
                        {t("analytics.tableColumns.avgCatalogCount")}
                      </TableHead>
                      <TableHead>
                        {t("analytics.tableColumns.multiCatalogPercent")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupingRows.map((row) => (
                      <TableRow key={row.group}>
                        <TableCell>
                          {formatGroupLabel(groupBy, row.group, t)}
                        </TableCell>
                        <TableCell>{row.sampleCount}</TableCell>
                        <TableCell>{formatFlux(row.avgFlux1000)}</TableCell>
                        <TableCell>
                          {formatFloat(row.avgSignificance, 2)}
                        </TableCell>
                        <TableCell>
                          {formatFloat(row.avgConfidence, 3)}
                        </TableCell>
                        <TableCell>
                          {formatFloat(row.avgCatalogCount, 2)}
                        </TableCell>
                        <TableCell>
                          {formatFloat(row.multiCatalogShare, 1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t("analytics.metrics.samples")}
                  </CardDescription>
                  <CardTitle>{headlineMetrics.samples}</CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t("analytics.metrics.avgSigma")}
                  </CardDescription>
                  <CardTitle>
                    {formatFloat(headlineMetrics.avgSignificance, 2)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t("analytics.metrics.avgFlux")}
                  </CardDescription>
                  <CardTitle>
                    {formatFlux(headlineMetrics.avgFlux1000)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t("analytics.metrics.avgConfidence")}
                  </CardDescription>
                  <CardTitle>
                    {formatFloat(headlineMetrics.avgConfidence, 3)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t("analytics.metrics.multiCatalogShare")}
                  </CardDescription>
                  <CardTitle>
                    {formatFloat(headlineMetrics.multiCatalogShare, 1)}%
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="max-w-sm space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("analytics.groupingLabel")}
              </p>
              <Select
                value={groupBy}
                onValueChange={(value) => setGroupBy(value as GroupByDimension)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUPING_OPTIONS_KEYS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.translationKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <section className="gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.catalogComparison")}</CardTitle>
              <CardDescription>
                {t("analytics.catalogComparisonDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={catalogComparisonConfig}>
                <BarChart
                  data={selectedCatalogComparison}
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="catalog"
                    tickFormatter={(value) => formatCatalogLabel(String(value))}
                  />
                  <YAxis
                    tickFormatter={(value) => formatFloat(value, 0)}
                    width={56}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) => formatFloat(value, 1)}
                      />
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="scienceScore"
                    fill="var(--color-scienceScore)"
                  />
                  <Bar
                    dataKey="multiCatalogShare"
                    fill="var(--color-multiCatalogShare)"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <section className="gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.catalogCoverage")}</CardTitle>
              <CardDescription>
                {t("analytics.catalogCoverageDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={catalogCoverageConfig}>
                <BarChart
                  data={selectedCatalogComparison}
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="catalog"
                    tickFormatter={(value) => formatCatalogLabel(String(value))}
                  />
                  <YAxis width={56} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) => formatFloat(value, 1)}
                      />
                    }
                  />
                  <Legend />
                  <Bar dataKey="sampleCount" fill="var(--color-sampleCount)" />
                  <Bar
                    dataKey="classDiversity"
                    fill="var(--color-classDiversity)"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <section className="gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.classMixTitle")}</CardTitle>
              <CardDescription>
                {t("analytics.classMixDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={classMixConfig}>
                <BarChart data={classMixRows} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="catalog"
                    tickFormatter={(value) => formatCatalogLabel(String(value))}
                  />
                  <YAxis width={48} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) => formatFloat(value, 0)}
                      />
                    }
                  />
                  <Legend />
                  {topClasses.map((className) => (
                    <Bar
                      key={className}
                      dataKey={className}
                      stackId="classes"
                      fill={`var(--color-${className})`}
                    />
                  ))}
                  <Bar
                    dataKey="Other"
                    stackId="classes"
                    fill="var(--color-Other)"
                  />
                </BarChart>
              </ChartContainer>

              <div className="flex flex-wrap gap-2 mt-4">
                {topClasses.map((className) => (
                  <Badge key={className} variant="secondary">
                    {className}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between w-full">
                <div>
                  <CardTitle>
                    {t("analytics.significanceHistogramTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("analytics.significanceHistogramDescription")}
                  </CardDescription>
                </div>
                {/* Facets mode removed — showing overlap histogram only */}
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={histogramChartConfig}>
                <BarChart
                  data={histogramCombinedData}
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
                  <YAxis width={56} />
                  <Tooltip
                    formatter={(value, name) => [String(value), String(name)]}
                  />
                  <Legend />
                  {selectedCatalogs.map((cat) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      fill={`var(--color-${cat})`}
                      fillOpacity={0.6}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <section className="gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.emissionTrendTitle")}</CardTitle>
              <CardDescription>
                {t("analytics.emissionTrendDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={emissionTrendConfig}>
                <LineChart
                  data={emissionTrendData}
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="catalog"
                    tickFormatter={(value) => formatCatalogLabel(String(value))}
                  />
                  <YAxis
                    tickFormatter={(value) => formatFloat(value, 3)}
                    width={56}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) => formatFloat(value, 3)}
                      />
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgFlux"
                    stroke="var(--color-avgFlux)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="peakFlux"
                    stroke="var(--color-peakFlux)"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <section className="gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.radarComparisonTitle")}</CardTitle>
              <CardDescription>
                {t("analytics.radarComparisonDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={radarConfig}>
                <RadarChart
                  data={radarData}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="catalog" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tickFormatter={(value) => formatFloat(value, 0)}
                  />
                  <Radar
                    name={radarConfig.Significance.label}
                    dataKey="Significance"
                    stroke="var(--color-Significance)"
                    fill="var(--color-Significance)"
                    fillOpacity={0.15}
                  />
                  <Radar
                    name={radarConfig.Flux.label}
                    dataKey="Flux"
                    stroke="var(--color-Flux)"
                    fill="var(--color-Flux)"
                    fillOpacity={0.15}
                  />
                  <Radar
                    name={radarConfig.Confidence.label}
                    dataKey="Confidence"
                    stroke="var(--color-Confidence)"
                    fill="var(--color-Confidence)"
                    fillOpacity={0.15}
                  />
                  <Radar
                    name={radarConfig.Connectivity.label}
                    dataKey="Connectivity"
                    stroke="var(--color-Connectivity)"
                    fill="var(--color-Connectivity)"
                    fillOpacity={0.15}
                  />
                  <Radar
                    name={radarConfig["Class Diversity"].label}
                    dataKey="Class Diversity"
                    stroke="var(--color-Class Diversity)"
                    fill="var(--color-Class Diversity)"
                    fillOpacity={0.15}
                  />
                  <Legend />
                  <Tooltip
                    formatter={(value) => {
                      if (
                        typeof value === "number" ||
                        typeof value === "string"
                      ) {
                        return formatFloat(value, 1);
                      }

                      return "-";
                    }}
                  />
                </RadarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.topSourcesTitle")}</CardTitle>
            <CardDescription>
              {t("analytics.topSourcesDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t("analytics.topSourcesColumns.sourceName")}
                  </TableHead>
                  <TableHead>
                    {t("analytics.topSourcesColumns.catalog")}
                  </TableHead>
                  <TableHead>
                    {t("analytics.topSourcesColumns.sourceClass")}
                  </TableHead>
                  <TableHead>
                    {t("analytics.topSourcesColumns.significance")}
                  </TableHead>
                  <TableHead>{t("analytics.topSourcesColumns.flux")}</TableHead>
                  <TableHead>
                    {t("analytics.topSourcesColumns.confidence")}
                  </TableHead>
                  <TableHead>
                    {t("analytics.topSourcesColumns.catalogCount")}
                  </TableHead>
                  <TableHead>
                    {t("analytics.topSourcesColumns.score")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSources.map((row) => (
                  <TableRow key={`${row.catalog}-${row.name}`}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{formatCatalogLabel(row.catalog)}</TableCell>
                    <TableCell>{row.sourceClass}</TableCell>
                    <TableCell>{formatFloat(row.significance, 2)}</TableCell>
                    <TableCell>{formatFlux(row.flux1000)}</TableCell>
                    <TableCell>{formatFloat(row.confidence, 3)}</TableCell>
                    <TableCell>{row.catalogCount}</TableCell>
                    <TableCell>{formatFloat(row.score, 1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ============ NEW BACKEND ANALYTICS SECTIONS ============ */}

        {backendAnalyticsQuery.data && (
          <>
            <section className="gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("analytics.sampleCountTitle")}</CardTitle>
                  <CardDescription>
                    {t("analytics.sampleCountDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      sampleCount: {
                        label: t("analytics.tableColumns.samples"),
                        color: "#2A9D8F"
                      }
                    }}
                  >
                    <BarChart
                      data={backendAnalyticsQuery.data.catalogRows}
                      margin={{ left: 8, right: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="catalog"
                        tickFormatter={(value) =>
                          formatCatalogLabel(String(value))
                        }
                      />
                      <YAxis scale="log" domain={[1, 10000]} width={56} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            valueFormatter={(value) => String(value)}
                          />
                        }
                      />
                      <Bar
                        dataKey="sampleCount"
                        fill="var(--color-sampleCount)"
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </section>

            <section className="gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("analytics.significanceComparisonTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("analytics.significanceComparisonDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      avgSignificance: {
                        label: t("analytics.tableColumns.avgSigma"),
                        color: "#2A9D8F"
                      },
                      peakSignificance: {
                        label: t("analytics.tableColumns.peakSignificance"),
                        color: "#E76F51"
                      }
                    }}
                  >
                    <BarChart
                      data={backendAnalyticsQuery.data.significanceComparison}
                      margin={{ left: 8, right: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="catalog"
                        tickFormatter={(value) =>
                          formatCatalogLabel(String(value))
                        }
                      />
                      <YAxis
                        tickFormatter={(value) => formatFloat(value, 0)}
                        width={56}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            valueFormatter={(value) => formatFloat(value, 2)}
                          />
                        }
                      />
                      <Legend />
                      <Bar
                        dataKey="avgSignificance"
                        fill="var(--color-avgSignificance)"
                      />
                      <Bar
                        dataKey="peakSignificance"
                        fill="var(--color-peakSignificance)"
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </section>

            <section className="gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("analytics.detectabilityMixTitle")}</CardTitle>
                  <CardDescription>
                    {t("analytics.detectabilityMixDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      high: {
                        label: t("analytics.detectabilityBands.high"),
                        color: "#81B29A"
                      },
                      medium: {
                        label: t("analytics.detectabilityBands.medium"),
                        color: "#F2CC8F"
                      },
                      low: {
                        label: t("analytics.detectabilityBands.low"),
                        color: "#E07A5F"
                      }
                    }}
                  >
                    <BarChart
                      data={backendAnalyticsQuery.data.detectabilityComparison}
                      margin={{ left: 8, right: 8 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="catalog"
                        tickFormatter={(value) =>
                          formatCatalogLabel(String(value))
                        }
                      />
                      <YAxis width={56} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            valueFormatter={(value) => String(value)}
                          />
                        }
                      />
                      <Legend />
                      <Bar
                        dataKey="high"
                        stackId="detectability"
                        fill="var(--color-high)"
                      />
                      <Bar
                        dataKey="medium"
                        stackId="detectability"
                        fill="var(--color-medium)"
                      />
                      <Bar
                        dataKey="low"
                        stackId="detectability"
                        fill="var(--color-low)"
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </section>

            {backendAnalyticsQuery.data.significanceHistogram && (
              <section className="gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t("analytics.histogramOverlapTitle")}
                    </CardTitle>
                    <CardDescription>
                      {t("analytics.histogramOverlapDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        FERMI: {
                          label: SOURCE_CATALOG_META.FERMI.label,
                          color: SOURCE_CATALOG_META.FERMI.color
                        },
                        LHAASO: {
                          label: SOURCE_CATALOG_META.LHAASO.label,
                          color: SOURCE_CATALOG_META.LHAASO.color
                        }
                      }}
                    >
                      <BarChart
                        data={(() => {
                          const edges =
                            backendAnalyticsQuery.data.significanceHistogram
                              ?.edges ?? [];
                          const perCatalog =
                            backendAnalyticsQuery.data.significanceHistogram
                              ?.perCatalog ?? {};
                          const bins = [];
                          for (let i = 0; i < edges.length - 1; i++) {
                            const lo = edges[i];
                            const hi = edges[i + 1];
                            const row: Record<string, string | number> = {
                              bin: `${lo.toExponential(1)}-${hi.toExponential(1)}`
                            };
                            const fermi = perCatalog.FERMI?.bins?.[i];
                            const lhaaso = perCatalog.LHAASO?.bins?.[i];
                            row.FERMI = fermi?.count ?? 0;
                            row.LHAASO = lhaaso?.count ?? 0;
                            bins.push(row);
                          }
                          return bins;
                        })()}
                        margin={{ left: 8, right: 8 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
                        <YAxis width={56} />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              valueFormatter={(value) => String(value)}
                            />
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey="FERMI"
                          fill="var(--color-FERMI)"
                          fillOpacity={0.7}
                        />
                        <Bar
                          dataKey="LHAASO"
                          fill="var(--color-LHAASO)"
                          fillOpacity={0.7}
                        />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </section>
            )}

            <section className="gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("analytics.radarMultiMetricTitle")}</CardTitle>
                  <CardDescription>
                    {t("analytics.radarMultiMetricDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      Significance: {
                        label: t("analytics.radarAxes.significance"),
                        color: "#2A9D8F"
                      },
                      Detectability: {
                        label: t("analytics.radarAxes.detectability"),
                        color: "#E76F51"
                      },
                      HighDetectability: {
                        label: t("analytics.radarAxes.highDetectability"),
                        color: "#F9C74F"
                      }
                    }}
                  >
                    <RadarChart
                      data={backendAnalyticsQuery.data.radarComparison.map(
                        (row) => ({
                          catalog: SOURCE_CATALOG_META[row.catalog]?.label,
                          Significance: row.significanceIndex,
                          Detectability: row.detectabilityIndex,
                          HighDetectability: row.highDetectabilityShare
                        })
                      )}
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <PolarGrid />
                      <PolarAngleAxis
                        dataKey="catalog"
                        tick={{ fontSize: 11 }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tickFormatter={(value) => formatFloat(value, 0)}
                      />
                      <Radar
                        name="Significance"
                        dataKey="Significance"
                        stroke="var(--color-Significance)"
                        fill="var(--color-Significance)"
                        fillOpacity={0.2}
                      />
                      <Radar
                        name="Detectability"
                        dataKey="Detectability"
                        stroke="var(--color-Detectability)"
                        fill="var(--color-Detectability)"
                        fillOpacity={0.2}
                      />
                      <Radar
                        name="HighDetectability"
                        dataKey="HighDetectability"
                        stroke="var(--color-HighDetectability)"
                        fill="var(--color-HighDetectability)"
                        fillOpacity={0.2}
                      />
                      <Legend />
                      <Tooltip
                        formatter={(value) => {
                          if (
                            typeof value === "number" ||
                            typeof value === "string"
                          ) {
                            return formatFloat(value, 1);
                          }
                          return "-";
                        }}
                      />
                    </RadarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
