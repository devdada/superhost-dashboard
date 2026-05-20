import type { HotelRanking } from "@/lib/trends";
import { HotelLink } from "@/components/ui/HotelLink";

type Props = {
  title: string;
  subtitle: string;
  hotels: HotelRanking[];
  variant: "top" | "worst";
};

const VARIANT_STYLES = {
  top: {
    border: "border-emerald-200 dark:border-emerald-900",
    bg: "bg-emerald-50/60 dark:bg-emerald-950/30",
    badge: "text-emerald-800 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/50",
    item: "bg-white/80 dark:bg-slate-900/90 dark:border dark:border-emerald-900/40",
  },
  worst: {
    border: "border-rose-200 dark:border-rose-900",
    bg: "bg-rose-50/60 dark:bg-rose-950/30",
    badge: "text-rose-800 bg-rose-100 dark:text-rose-200 dark:bg-rose-900/50",
    item: "bg-white/80 dark:bg-slate-900/90 dark:border dark:border-rose-900/40",
  },
};

export function HotelRankings({ title, subtitle, hotels, variant }: Props) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} p-4`}>
      <h3 className="text-sm font-semibold sh-heading">{title}</h3>
      <p className="mt-0.5 text-xs sh-subtext">{subtitle}</p>
      {hotels.length === 0 ? (
        <p className="mt-4 text-sm sh-subtext">No historical data yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {hotels.map((hotel, index) => (
            <li
              key={hotel.hotel_name}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm shadow-sm ${styles.item}`}
            >
              <span className="font-medium sh-heading">
                <span className="mr-2 sh-label">{index + 1}.</span>
                <HotelLink name={hotel.hotel_name} />
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${styles.badge}`}>
                {hotel.average_variance_percent >= 0 ? "+" : ""}
                {hotel.average_variance_percent.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
