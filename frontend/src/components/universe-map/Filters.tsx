import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { getCategoryMeta, type CosmicCategory } from "./types";

const ALL_CATEGORIES: CosmicCategory[] = ["star", "galaxy", "nebula", "pulsar", "quasar", "black-hole", "planet", "cluster"];

interface Props {
  activeCategories: Set<CosmicCategory>;
  onToggle: (category: CosmicCategory) => void;
}

export function Filters({ activeCategories, onToggle }: Props) {
  const { t } = useTranslation();
  const categoryMeta = getCategoryMeta(t);

  return (
    <div className="absolute top-4 right-4 z-10 rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl p-4 space-y-2.5">
      <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-semibold mb-2">
        {t("universeMap.filters")}
      </h3>
      {ALL_CATEGORIES.map((cat) => {
        const meta = categoryMeta[cat];
        const checked = activeCategories.has(cat);
        return (
          <label
            key={cat}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() => onToggle(cat)}
              className="border-white/20 data-[state=checked]:bg-(--cat-color) data-[state=checked]:border-(--cat-color)"
              style={
                checked
                  ? ({ "--cat-color": meta.color } as React.CSSProperties)
                  : undefined
              }
            />
            <span
              className={`text-xs transition-colors ${checked ? "text-(--cat-color)" : "text-white/45"}`}
              style={
                checked
                  ? ({ "--cat-color": meta.color } as React.CSSProperties)
                  : undefined
              }
            >
              {meta.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
