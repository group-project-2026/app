import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CosmicPoint } from "./types";
import { CATEGORY_META } from "./types";

interface Props {
  point: CosmicPoint | null;
  onClose: () => void;
}

export function PointDetailPanel({ point, onClose }: Props) {
  if (!point) return null;

  const { t } = useTranslation();
  const meta = CATEGORY_META[point.category];

  return (
    <div
      className="h-full flex flex-col bg-[#0a0e1a] text-white border-l border-[var(--panel-border)]"
      style={{ "--panel-border": `${meta.color}15` } as React.CSSProperties}
    >
      <div className="shrink-0 p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-3.5 w-3.5 rounded-full shrink-0 bg-[var(--cat-color)] shadow-[0_0_12px_var(--cat-color-shadow)]"
              style={
                {
                  "--cat-color": meta.color,
                  "--cat-color-shadow": `${meta.color}80`,
                } as React.CSSProperties
              }
            />
            <h2 className="text-xl font-bold tracking-tight truncate">
              {point.name}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 text-white/40 hover:text-white hover:bg-white/10 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Badge
          variant="outline"
          className="text-xs border-[var(--badge-border)] text-[var(--badge-color)] bg-[var(--badge-bg)]"
          style={
            {
              "--badge-border": `${meta.color}60`,
              "--badge-color": meta.color,
              "--badge-bg": `${meta.color}10`,
            } as React.CSSProperties
          }
        >
          {meta.label}
        </Badge>
      </div>

      <Separator className="bg-white/10 shrink-0" />

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label={t("pointDetail.rightAscension")}
              value={`${point.ra.toFixed(2)}°`}
            />
            <StatCard
              label={t("pointDetail.declination")}
              value={`${point.dec > 0 ? "+" : ""}${point.dec.toFixed(2)}°`}
            />
            <StatCard label={t("pointDetail.distance")} value={point.distance} />
            <StatCard label={t("pointDetail.magnitude")} value={point.magnitude.toFixed(1)} />
          </div>

          <Separator className="bg-white/10" />

          <Section title={t("pointDetail.discoveredBy")}>
            <p className="text-sm text-white/80">{point.discoveredBy}</p>
          </Section>

          <Separator className="bg-white/10" />

          <Section title={t("pointDetail.description")}>
            <p className="text-sm text-white/70 leading-relaxed">
              {point.description}
            </p>
          </Section>

          <Separator className="bg-white/10" />

          <Section title={t("pointDetail.observationNotes")}>
            <p className="text-sm text-white/70 leading-relaxed">
              Vestibulum ante ipsum primis in faucibus orci luctus et ultrices
              posuere cubilia curae. Morbi lacinia molestie dui. Praesent
              blandit dolor. Sed non quam. In vel mi sit amet augue congue
              elementum. Morbi in ipsum sit amet pede facilisis laoreet.
            </p>
          </Section>

          <Separator className="bg-white/10" />

          <Section title={t("pointDetail.spectralAnalysis")}>
            <div className="rounded-lg bg-white/5 border border-white/5 p-6 flex items-center justify-center">
              <p className="text-xs text-white/30 italic">
                {t("pointDetail.chartPlaceholder")}
              </p>
            </div>
          </Section>

          <Separator className="bg-white/10" />

          <Section title={t("pointDetail.angularPosition")}>
            <div className="rounded-lg bg-white/5 border border-white/5 p-6 flex items-center justify-center">
              <p className="text-xs text-white/30 italic">
                {t("pointDetail.angularPlaceholder")}
              </p>
            </div>
          </Section>

          <Separator className="bg-white/10" />

          <Section title={t("pointDetail.fluxEnergy")}>
            <div className="rounded-lg bg-white/5 border border-white/5 p-6 flex items-center justify-center">
              <p className="text-xs text-white/30 italic">
                {t("pointDetail.fluxPlaceholder")}
              </p>
            </div>
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-[11px] uppercase tracking-wider text-white/40 font-semibold mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/5 p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold text-white/90">{value}</p>
    </div>
  );
}
