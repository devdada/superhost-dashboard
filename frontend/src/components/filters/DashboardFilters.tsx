"use client";

import {
  DASHBOARD_METRICS,
  DASHBOARD_PERIODS,
  type DashboardFilters,
  type DashboardMetric,
  type DashboardPeriod,
} from "@/lib/dashboard-filters";

type Props = {
  value: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  reportCount?: number;
  className?: string;
};

export function DashboardFiltersBar({
  value,
  onChange,
  reportCount,
  className = "",
}: Props) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/60 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide sh-label">Metric</span>
          <select
            value={value.metric}
            onChange={(e) =>
              onChange({ ...value, metric: e.target.value as DashboardMetric })
            }
            className="min-w-[10rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sh-heading dark:border-slate-600 dark:bg-slate-800"
          >
            {DASHBOARD_METRICS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide sh-label">
            Timeline
          </span>
          <select
            value={value.period}
            onChange={(e) =>
              onChange({ ...value, period: e.target.value as DashboardPeriod })
            }
            className="min-w-[10rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sh-heading dark:border-slate-600 dark:bg-slate-800"
          >
            {DASHBOARD_PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {reportCount !== undefined && (
        <p className="text-sm sh-label">
          <span className="font-semibold tabular-nums sh-heading">{reportCount}</span>{" "}
          report{reportCount === 1 ? "" : "s"} in range
        </p>
      )}
    </div>
  );
}
