import { getInsightCategory } from "@/lib/analytics";
import type { FlashMetricRow } from "@/lib/api";
import { HotelLink } from "@/components/ui/HotelLink";

const ROW_ACCENT: Record<string, string> = {
  critical_risk:
    "border-l-4 border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/25",
  watch_list:
    "border-l-4 border-l-amber-400 bg-amber-50/30 dark:bg-amber-950/25",
  strong_performer:
    "border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/25",
};

type Props = {
  rows: FlashMetricRow[];
  metric: string;
  filename: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function FlashDataTable({ rows, metric, filename }: Props) {
  const isOccupancy = metric.toLowerCase() === "occupancy";

  return (
    <div className="overflow-hidden sh-card">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-semibold sh-heading">{filename}</p>
        <p className="text-xs sh-label">
          {metric} · {rows.length} hotels · PTD primary forecast vs budget · row colors match
          insights
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Hotel</th>
              <th className="px-4 py-3">Metric</th>
              <th className="px-4 py-3 text-right">Forecast</th>
              <th className="px-4 py-3 text-right">Budget</th>
              <th className="px-4 py-3 text-right">Variance %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-800 dark:text-slate-200">
            {rows.map((row) => {
              const category = getInsightCategory(row.variance_percent);
              const rowClass = category ? ROW_ACCENT[category] : "border-l-4 border-l-transparent";
              return (
              <tr key={row.hotel} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/80 ${rowClass}`}>
                <td className="px-4 py-3">
                  <HotelLink name={row.hotel} />
                </td>
                <td className="px-4 py-3 text-slate-600">{row.metric}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {isOccupancy ? formatPercent(row.forecast) : formatCurrency(row.forecast)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {isOccupancy ? formatPercent(row.budget) : formatCurrency(row.budget)}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums font-medium ${
                    row.variance_percent >= 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {formatPercent(row.variance_percent)}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
