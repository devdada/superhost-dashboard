import { KpiLineChart } from "@/components/kpi/KpiLineChart";
import type { PropertyIntelligence } from "@/lib/property";

type Props = {
  data: PropertyIntelligence;
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

export function PropertyKpiSection({ data }: Props) {
  const isOccupancy = data.metric.toLowerCase() === "occupancy";

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold sh-heading">KPI trend charts</h2>
        <p className="text-sm sh-subtext">
          Historical performance from uploaded Daily Flash reports · {data.metric}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <KpiLineChart
          title="Variance vs budget"
          subtitle="Period-over-period variance %"
          data={data.variance_trend}
          valueKey="variance_percent"
          yFormat={(v) => `${v.toFixed(1)}%`}
          stroke="#4f46e5"
        />
        <KpiLineChart
          title={`${data.metric} forecast trend`}
          subtitle="Primary forecast amount by report date"
          data={data.revenue_trend}
          valueKey="forecast"
          yFormat={(v) => (isOccupancy ? `${v.toFixed(1)}%` : formatCurrency(v))}
          stroke="#059669"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PlaceholderCard trend={data.occupancy_trend} />
        <PlaceholderCard trend={data.revpar_trend} />
      </div>
    </section>
  );
}

function PlaceholderCard({ trend }: { trend: { label: string; message: string } }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-600 dark:bg-slate-800/50">
      <h3 className="text-sm font-semibold sh-heading">{trend.label} trend</h3>
      <p className="mt-2 text-sm sh-subtext">{trend.message}</p>
      <span className="mt-4 inline-block rounded-md bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        Coming soon
      </span>
    </div>
  );
}
