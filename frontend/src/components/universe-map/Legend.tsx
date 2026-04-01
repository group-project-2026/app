import { useTranslation } from "react-i18next";
import { getCategoryMeta, type CosmicCategory } from "./types";

const CATEGORIES: CosmicCategory[] = ["star", "galaxy", "nebula", "pulsar", "quasar", "black-hole", "planet", "cluster"];

export function Legend() {
  const { t } = useTranslation();
  const categoryMeta = getCategoryMeta(t);

  return (
    <div
      className="absolute top-4 left-4 z-10 rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl p-4 space-y-2 min-w-[140px]"
    >
      <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-semibold mb-2">
        {t("universeMap.legend")}
      </h3>
      {CATEGORIES.map((cat) => {
        const meta = categoryMeta[cat];
        return (
          <div key={cat} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0 bg-[var(--cat-color)] shadow-[0_0_6px_var(--cat-color-dim)]"
              style={
                {
                  "--cat-color": meta.color,
                  "--cat-color-dim": meta.color + "60",
                } as React.CSSProperties
              }
            />
            <span className="text-xs text-white/70">{meta.label}</span>
          </div>
        );
      })}
    </div>
  );
}
