import type { TrendMover } from "@/lib/trends";
import { HotelLink } from "@/components/ui/HotelLink";

type Props = {
  title: string;
  movers: TrendMover[];
  variant: "improving" | "declining";
};

const VARIANT_STYLES = {
  improving: {
    border: "border-emerald-200 dark:border-emerald-900",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/30",
    dot: "bg-emerald-500",
    item: "bg-white/80 dark:bg-slate-900/90 dark:border dark:border-emerald-900/40",
  },
  declining: {
    border: "border-amber-200 dark:border-amber-900",
    bg: "bg-amber-50/50 dark:bg-amber-950/30",
    dot: "bg-amber-500",
    item: "bg-white/80 dark:bg-slate-900/90 dark:border dark:border-amber-900/40",
  },
};

export function TrendMovers({ title, movers, variant }: Props) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} p-4`}>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
        <h3 className="text-sm font-semibold sh-heading">{title}</h3>
      </div>
      <p className="mt-1 text-xs sh-subtext">
        Strict trend over the last 3 reports (each period better or worse than the prior).
      </p>
      {movers.length === 0 ? (
        <p className="mt-4 text-sm sh-subtext">No properties match this pattern yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {movers.map((mover) => (
            <li
              key={mover.hotel_name}
              className={`rounded-lg px-3 py-2 text-sm shadow-sm ${styles.item}`}
            >
              <span className="font-medium sh-heading">
                <HotelLink name={mover.hotel_name} />
              </span>
              <span className="mt-1 block sh-subtext">{mover.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
