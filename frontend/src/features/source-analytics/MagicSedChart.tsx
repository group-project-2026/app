import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  CartesianGrid,
  ErrorBar,
  Legend,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis
} from "recharts";

import {
  fetchSourceMagicSimulation,
  type MagicSimulationResponse
} from "../sources/api";
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
  type ChartConfig
} from "@/components/ui/chart";

function SedTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
}) {
  const { t } = useTranslation();

  if (!active || !payload || payload.length === 0) return null;

  const rawPoint = payload[0]?.payload as Record<string, unknown> | undefined;
  if (!rawPoint) return null;

  const getNumber = (
    obj: Record<string, unknown> | undefined,
    key: string
  ): number => {
    const v = obj?.[key];
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
  };

  const energy = getNumber(rawPoint, "energy");
  const flux = getNumber(rawPoint, "flux");
  const fluxLow = getNumber(rawPoint, "fluxLow");
  const fluxHigh = getNumber(rawPoint, "fluxHigh");
  const significance = getNumber(rawPoint, "significance");

  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md text-foreground">
      <div className="font-medium text-foreground">
        {formatEnergyLabel(energy)}
      </div>
      <div className="text-foreground">
        {t("analytics.magic.simulation.flux")}:
        <span className="ml-2 font-mono">{formatScientific(flux)}</span>
      </div>
      <div className="text-foreground">
        {t("analytics.magic.simulation.sed.fluxLow")}:
        <span className="ml-2 font-mono">{formatScientific(fluxLow)}</span>
      </div>
      <div className="text-foreground">
        {t("analytics.magic.simulation.sed.fluxHigh")}:
        <span className="ml-2 font-mono">{formatScientific(fluxHigh)}</span>
      </div>
      <div className="text-foreground">
        σ:{" "}
        <span className="ml-2 font-mono">{formatNumber(significance, 1)}</span>
      </div>
    </div>
  );
}

type MagicSedChartProps = {
  sourceId: string | number;
};

function formatEnergyLabel(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  if (value >= 1000) {
    const tev = value / 1000;
    return `${formatNumber(tev, tev < 10 ? 1 : 0)} TeV`;
  }

  return `${formatNumber(value, value < 100 ? 0 : 0)} GeV`;
}

function formatNumber(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

function formatScientific(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return value.toExponential(2);
}

function toSuperscript(value: number): string {
  const superscripts: Record<string, string> = {
    "-": "⁻",
    0: "⁰",
    1: "¹",
    2: "²",
    3: "³",
    4: "⁴",
    5: "⁵",
    6: "⁶",
    7: "⁷",
    8: "⁸",
    9: "⁹"
  };

  return String(value)
    .split("")
    .map((char) => superscripts[char] ?? char)
    .join("");
}

function formatLogTick(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  const exponent = Math.round(Math.log10(value));
  if (Math.abs(value - 10 ** exponent) / value < 0.02) {
    return `10${toSuperscript(exponent)}`;
  }

  return formatScientific(value);
}

function buildEnergyTicks(minValue: number, maxValue: number): number[] {
  if (
    !Number.isFinite(minValue) ||
    !Number.isFinite(maxValue) ||
    minValue <= 0 ||
    maxValue <= 0
  ) {
    return [];
  }

  const ticks: number[] = [];
  const minExponent = Math.floor(Math.log10(minValue));
  const maxExponent = Math.ceil(Math.log10(maxValue));

  for (let exponent = minExponent; exponent <= maxExponent; exponent += 1) {
    const decade = 10 ** exponent;
    if (decade >= minValue && decade <= maxValue) {
      ticks.push(decade);
    }

    const halfDecade = 10 ** (exponent + 0.5);
    if (halfDecade >= minValue && halfDecade <= maxValue) {
      ticks.push(halfDecade);
    }
  }

  return Array.from(new Set(ticks)).sort((a, b) => a - b);
}

function buildPowerTicks(minValue: number, maxValue: number): number[] {
  if (
    !Number.isFinite(minValue) ||
    !Number.isFinite(maxValue) ||
    minValue <= 0 ||
    maxValue <= 0
  ) {
    return [];
  }

  const ticks: number[] = [];
  const minExponent = Math.floor(Math.log10(minValue));
  const maxExponent = Math.ceil(Math.log10(maxValue));

  for (let exponent = minExponent; exponent <= maxExponent; exponent += 1) {
    const tickValue = 10 ** exponent;
    if (tickValue >= minValue && tickValue <= maxValue) {
      ticks.push(tickValue);
    }
  }

  return ticks;
}

function circleShape(props: { cx?: number; cy?: number }) {
  if (typeof props.cx !== "number" || typeof props.cy !== "number") {
    return null;
  }

  return (
    <circle
      cx={props.cx}
      cy={props.cy}
      r={4}
      fill="#3266ad"
      stroke="#3266ad"
      strokeWidth={1.5}
    />
  );
}

function triangleDownShape(props: { cx?: number; cy?: number }) {
  if (typeof props.cx !== "number" || typeof props.cy !== "number") {
    return null;
  }

  const size = 5;
  const points = [
    `${props.cx - size} ${props.cy - size}`,
    `${props.cx + size} ${props.cy - size}`,
    `${props.cx} ${props.cy + size}`
  ].join(" ");

  return (
    <polygon
      points={points}
      fill="#888780"
      stroke="#888780"
      strokeWidth={1.5}
    />
  );
}

function errorBarAccessor(d: unknown): [number | null, number | null] {
  const dd = d as Record<string, unknown>;
  const low = dd["fluxLow"] as number | null | undefined;
  const high = dd["fluxHigh"] as number | null | undefined;
  return [low ?? null, high ?? null];
}

// Use shared ChartTooltip + ChartTooltipContent for consistent i18n & styling

export function MagicSedChart({ sourceId }: MagicSedChartProps) {
  const { t } = useTranslation();
  const normalizedSourceId = String(sourceId);

  const simulationQuery = useQuery<MagicSimulationResponse, Error>({
    queryKey: ["magic-sed", normalizedSourceId],
    queryFn: () => fetchSourceMagicSimulation(normalizedSourceId),
    enabled: normalizedSourceId.length > 0,
    staleTime: 5 * 60 * 1000
  });

  const simulationData = simulationQuery.data;

  const points = useMemo(() => {
    const spectralPoints = simulationData?.spectral_points ?? [];

    return spectralPoints
      .map((point) => ({
        energy: point.energy_gev,
        flux: point.flux_sed_tev_cm2_s ?? point.flux ?? 0,
        fluxError: point.flux_sed_error ?? point.flux_err ?? 0,
        fluxLow:
          (point.flux_sed_tev_cm2_s ?? point.flux ?? 0) -
          (point.flux_sed_error ?? point.flux_err ?? 0),
        fluxHigh:
          (point.flux_sed_tev_cm2_s ?? point.flux ?? 0) +
          (point.flux_sed_error ?? point.flux_err ?? 0),
        significance: point.significance_sigma ?? 0,
        isDetected: Boolean(point.is_detected)
      }))
      .filter(
        (point) =>
          Number.isFinite(point.energy) &&
          point.energy > 0 &&
          Number.isFinite(point.flux) &&
          point.flux > 0
      )
      .sort((left, right) => left.energy - right.energy);
  }, [simulationData?.spectral_points]);

  const detectedPoints = points.filter((point) => point.isDetected);
  const upperLimitPoints = points.filter(
    (point) => !point.isDetected && point.flux > 0
  );

  const xTicks = useMemo(() => {
    const energies = points.map((point) => point.energy);
    if (energies.length === 0) {
      return [];
    }

    return buildEnergyTicks(Math.min(...energies), Math.max(...energies));
  }, [points]);

  const yTicks = useMemo(() => {
    const fluxes = points
      .map((point) => point.flux)
      .filter((value) => value > 0);
    if (fluxes.length === 0) {
      return [];
    }

    return buildPowerTicks(Math.min(...fluxes), Math.max(...fluxes));
  }, [points]);

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      detected: {
        label: t("analytics.magic.simulation.sed.detectedSeries"),
        color: "#3266ad"
      },
      upperLimit: {
        label: t("analytics.magic.simulation.sed.upperLimitSeries"),
        color: "#888780"
      }
    }),
    [t]
  );

  const stats = simulationData?.aggregate_stats;
  const observationTimeHours =
    simulationData?.parameters?.observation_time_hours ??
    simulationData?.observation_parameters?.observation_time_hours;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {simulationData?.source.unified_name ??
            t("analytics.magic.simulation.title")}
        </CardTitle>
        <CardDescription>
          {t("analytics.magic.simulation.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {simulationQuery.isLoading ? (
          <div className="flex min-h-60 items-center justify-center rounded-lg border border-white/10 bg-slate-950/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("analytics.magic.simulation.loading")}
            </div>
          </div>
        ) : null}

        {simulationQuery.isError ? (
          <div className="flex min-h-60 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 px-4 text-sm text-red-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {simulationQuery.error instanceof Error
                  ? simulationQuery.error.message
                  : t("analytics.magic.simulation.error")}
              </span>
            </div>
          </div>
        ) : null}

        {simulationQuery.data ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t("analytics.magic.simulation.metrics.totalSignificance")}
                  </CardDescription>
                  <CardTitle>
                    {formatNumber(stats?.total_significance ?? 0, 1)} σ
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t("analytics.magic.simulation.metrics.detectedBins")}
                  </CardDescription>
                  <CardTitle>
                    {stats?.detected_bins ?? 0} /{" "}
                    {stats?.total_bins_evaluated ?? points.length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t("analytics.magic.simulation.metrics.observationTime")}
                  </CardDescription>
                  <CardTitle>
                    {formatNumber(observationTimeHours ?? 0, 0)} h
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription>
                    {t(
                      "analytics.magic.simulation.metrics.detectionProbability"
                    )}
                  </CardDescription>
                  <CardTitle>
                    {formatNumber((stats?.detection_probability ?? 0) * 100, 0)}{" "}
                    %
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <ChartContainer config={chartConfig} className="h-105 w-full">
              <ScatterChart
                margin={{ top: 12, right: 20, bottom: 80, left: 12 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  type="number"
                  dataKey="energy"
                  scale="log"
                  domain={["auto", "auto"]}
                  ticks={xTicks}
                  tickFormatter={(value) => formatEnergyLabel(Number(value))}
                  tickMargin={8}
                  label={{
                    value: t("analytics.magic.simulation.sed.xAxis"),
                    position: "insideBottom",
                    offset: -6
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="flux"
                  scale="log"
                  domain={["auto", "auto"]}
                  ticks={yTicks}
                  tickFormatter={(value) => formatLogTick(Number(value))}
                  width={90}
                  label={{
                    angle: -90,
                    value: t("analytics.magic.simulation.sed.yAxis"),
                    position: "insideLeft"
                  }}
                />
                <ChartTooltip
                  content={<SedTooltip />}
                  labelFormatter={(label) => formatEnergyLabel(Number(label))}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ paddingTop: 8 }}
                />
                <Scatter
                  name={t("analytics.magic.simulation.sed.detectedSeries")}
                  data={detectedPoints}
                  fill="#3266ad"
                  stroke="#3266ad"
                  shape={circleShape}
                  line={{
                    stroke: "#3266ad",
                    strokeDasharray: "6 4",
                    strokeWidth: 2
                  }}
                >
                  <ErrorBar
                    dataKey={errorBarAccessor}
                    direction="y"
                    width={6}
                    stroke="#3266ad"
                  />
                </Scatter>
                <Scatter
                  name={t("analytics.magic.simulation.sed.upperLimitSeries")}
                  data={upperLimitPoints}
                  fill="#888780"
                  stroke="#888780"
                  shape={triangleDownShape}
                  line={false}
                />
              </ScatterChart>
            </ChartContainer>

            {/* Simulation parameters */}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
              {(() => {
                const paramList: Array<{ key: string; labelKey: string }> = [
                  {
                    key: "observation_time_hours",
                    labelKey: "observationTime"
                  },
                  { key: "zenith_angle", labelKey: "zenithAngle" },
                  { key: "psf", labelKey: "psf" },
                  { key: "extension", labelKey: "extension" },
                  { key: "offset", labelKey: "offset" },
                  { key: "off_regions", labelKey: "offRegions" },
                  { key: "min_events", labelKey: "minEvents" },
                  { key: "min_sbr", labelKey: "minSbr" },
                  { key: "pulsar_mode", labelKey: "pulsarMode" }
                ];

                const formatParam = (raw: unknown, key: string) => {
                  if (raw === null || raw === undefined) return "-";
                  const num = typeof raw === "number" ? raw : Number(raw);
                  if (Number.isFinite(num)) {
                    if (key === "observation_time_hours")
                      return `${formatNumber(num, 0)} h`;
                    if (
                      key === "zenith_angle" ||
                      key === "psf" ||
                      key === "extension" ||
                      key === "offset"
                    )
                      return `${formatNumber(num, 2)}°`;
                    if (key === "min_sbr") return `${formatNumber(num, 1)} %`;
                    if (key === "min_events" || key === "off_regions")
                      return String(num);
                    return String(raw);
                  }
                  return String(raw);
                };

                const getParam = (key: string): unknown => {
                  return (
                    (
                      simulationData?.parameters as unknown as Record<
                        string,
                        unknown
                      >
                    )?.[key] ??
                    (
                      simulationData?.observation_parameters as unknown as Record<
                        string,
                        unknown
                      >
                    )?.[key]
                  );
                };

                return paramList.map((p) => {
                  const raw = getParam(p.key);

                  return (
                    <div
                      key={p.key}
                      className="flex items-center justify-between"
                    >
                      <div className="text-muted-foreground">
                        {t(
                          `analytics.magic.simulation.parameters.${p.labelKey}`
                        )}
                      </div>
                      <div className="font-mono">{formatParam(raw, p.key)}</div>
                    </div>
                  );
                });
              })()}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
