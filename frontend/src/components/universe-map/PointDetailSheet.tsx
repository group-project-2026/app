import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { CosmicPoint } from "./types";
import { CATEGORY_META } from "./types";

interface Props {
  point: CosmicPoint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PointDetailSheet({ point, open, onOpenChange }: Props) {
  if (!point) return null;

  const meta = CATEGORY_META[point.category];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="border-l-0 bg-[#0a0e1a]/95 backdrop-blur-xl text-white w-full sm:max-w-md"
        style={{
          borderLeft: `2px solid ${meta.color}20`,
          boxShadow: `inset 4px 0 30px ${meta.color}08`,
        }}
      >
        <SheetHeader className="gap-3 px-4 pt-4">
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{
                background: meta.color,
                boxShadow: `0 0 10px ${meta.color}80`,
              }}
            />
            <SheetTitle className="text-white text-xl font-bold tracking-tight">
              {point.name}
            </SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Details about {point.name}
          </SheetDescription>
          <Badge
            variant="outline"
            className="w-fit text-xs"
            style={{
              borderColor: `${meta.color}60`,
              color: meta.color,
              background: `${meta.color}10`,
            }}
          >
            {meta.label}
          </Badge>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 mt-4">
          <div className="space-y-5 pb-8">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Right Ascension" value={`${point.ra.toFixed(2)}°`} />
              <StatCard label="Declination" value={`${point.dec > 0 ? "+" : ""}${point.dec.toFixed(2)}°`} />
              <StatCard label="Distance" value={point.distance} />
              <StatCard label="Magnitude" value={point.magnitude.toFixed(1)} />
            </div>

            <Separator className="bg-white/10" />

            {/* Discovered by */}
            <div>
              <h4 className="text-xs uppercase tracking-wider text-white/40 mb-1.5">
                Discovered by
              </h4>
              <p className="text-sm text-white/80">{point.discoveredBy}</p>
            </div>

            <Separator className="bg-white/10" />

            {/* Description */}
            <div>
              <h4 className="text-xs uppercase tracking-wider text-white/40 mb-1.5">
                Description
              </h4>
              <p className="text-sm text-white/70 leading-relaxed">
                {point.description}
              </p>
            </div>

            <Separator className="bg-white/10" />

            {/* Additional mock data */}
            <div>
              <h4 className="text-xs uppercase tracking-wider text-white/40 mb-1.5">
                Observation Notes
              </h4>
              <p className="text-sm text-white/70 leading-relaxed">
                Vestibulum ante ipsum primis in faucibus orci luctus et ultrices
                posuere cubilia curae. Morbi lacinia molestie dui. Praesent blandit
                dolor. Sed non quam. In vel mi sit amet augue congue elementum.
                Morbi in ipsum sit amet pede facilisis laoreet.
              </p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
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
