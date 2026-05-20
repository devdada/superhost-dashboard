import type { PersistentRisk } from "@/lib/trends";
import { HotelLink } from "@/components/ui/HotelLink";

type Props = {
  risks: PersistentRisk[];
};

export function PersistentRisks({ risks }: Props) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-5 dark:border-rose-900 dark:bg-rose-950/30">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
        <h3 className="text-sm font-semibold sh-heading">Persistent Risks</h3>
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-900/50 dark:text-rose-200">
          {risks.length}
        </span>
      </div>
      <p className="mt-1 text-xs sh-subtext">
        Properties that missed budget in 3 or more consecutive reports.
      </p>
      {risks.length === 0 ? (
        <p className="mt-4 text-sm sh-subtext">No consecutive budget misses detected.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {risks.map((risk) => (
            <li
              key={risk.hotel_name}
              className="rounded-lg border border-rose-100 bg-white px-3 py-2.5 shadow-sm dark:border-rose-900/50 dark:bg-slate-900/90"
            >
              <p className="text-sm font-medium sh-heading">
                <HotelLink name={risk.hotel_name} />
              </p>
              <p className="mt-1 text-sm sh-subtext">{risk.message}</p>
              <p className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-400">
                {risk.consecutive_misses} consecutive misses
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
