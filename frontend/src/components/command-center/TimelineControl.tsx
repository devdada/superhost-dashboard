"use client";

import { DASHBOARD_PERIODS, type DashboardPeriod } from "@/lib/dashboard-filters";

type Props = {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
  disabled?: boolean;
  dimmed?: boolean;
};

export function TimelineControl({ value, onChange, disabled, dimmed }: Props) {
  return (
    <div
      className={`inline-flex rounded-lg border border-slate-300/90 bg-slate-100/80 p-0.5 transition-opacity dark:border-slate-600 dark:bg-slate-900/80 ${
        dimmed ? "opacity-50" : ""
      }`}
      role="tablist"
      aria-label="Timeline"
    >
      {DASHBOARD_PERIODS.map((p) => {
        const active = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(p.id)}
            className={`min-w-[3rem] rounded-md px-3 py-1.5 text-xs font-bold tracking-wide transition ${
              active
                ? "bg-slate-900 text-white shadow-sm dark:bg-indigo-500 dark:text-white"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            } disabled:opacity-50`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
