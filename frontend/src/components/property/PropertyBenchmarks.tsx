import { HotelLink } from "@/components/ui/HotelLink";
import type { BenchmarkRow, PropertyIntelligence } from "@/lib/property";

type Props = {
  data: PropertyIntelligence;
};

function formatValue(value: number, unit: string) {
  if (unit === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function PropertyBenchmarks({ data }: Props) {
  return (
    <section className="sh-card p-6">
      <h2 className="text-lg font-bold sh-heading">Benchmark comparison</h2>
      <p className="mt-1 text-sm sh-subtext">
        Latest report vs portfolio average, top performer, and worst performer.
      </p>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide sh-label dark:border-slate-700">
              <th className="px-3 py-2">Metric</th>
              <th className="px-3 py-2 text-right">This property</th>
              <th className="px-3 py-2 text-right">Portfolio avg</th>
              <th className="px-3 py-2">Top performer</th>
              <th className="px-3 py-2">Worst performer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.benchmarks.map((row) => (
              <BenchmarkTableRow key={row.label} row={row} hotelName={data.hotel_name} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BenchmarkTableRow({ row, hotelName }: { row: BenchmarkRow; hotelName: string }) {
  return (
    <tr className="text-slate-800 dark:text-slate-200">
      <td className="px-3 py-3 font-medium">{row.label}</td>
      <td className="px-3 py-3 text-right tabular-nums font-semibold text-indigo-700 dark:text-indigo-400">
        {formatValue(row.property_value, row.unit)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">
        {formatValue(row.portfolio_average, row.unit)}
      </td>
      <td className="px-3 py-3">
        <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
          {formatValue(row.top_performer_value, row.unit)}
        </span>
        <span className="mt-0.5 block text-xs sh-label">
          {row.top_performer_name === hotelName ? (
            "This property"
          ) : (
            <HotelLink name={row.top_performer_name} className="text-xs" />
          )}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="tabular-nums text-rose-700 dark:text-rose-400">
          {formatValue(row.worst_performer_value, row.unit)}
        </span>
        <span className="mt-0.5 block text-xs sh-label">
          {row.worst_performer_name === hotelName ? (
            "This property"
          ) : (
            <HotelLink name={row.worst_performer_name} className="text-xs" />
          )}
        </span>
      </td>
    </tr>
  );
}
