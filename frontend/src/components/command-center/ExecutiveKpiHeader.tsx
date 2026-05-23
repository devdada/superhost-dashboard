"use client";

import type { ExecutiveKpiCard } from "@/lib/command-center";
import { formatKpiDelta } from "@/lib/format";

import { KpiSparkline } from "./KpiSparkline";

type Props = {
  kpis: ExecutiveKpiCard[];
  reportsInPeriod: number;
  periodLabel: string;
  isLoading?: boolean;
};

export function ExecutiveKpiHeader({ kpis, reportsInPeriod, periodLabel, isLoading }: Props) {
  return (
    <section
      className={`sh-terminal-panel transition-opacity ${isLoading ? "opacity-60" : ""}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-slate-700/80">
        <p className="sh-label text-[10px]">
          Executive KPIs · <span className="normal-case text-slate-700 dark:text-slate-200">{periodLabel}</span>
        </p>
        <p className="text-[10px] sh-subtext">
          {reportsInPeriod} report{reportsInPeriod === 1 ? "" : "s"} in range
          {isLoading ? " · updating…" : ""}
        </p>
      </div>
      <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => {
          const positive =
            kpi.direction === "up" && kpi.id !== "at_risk"
              ? true
              : kpi.direction === "down" && kpi.id === "at_risk"
                ? true
                : kpi.direction === "up"
                  ? true
                  : kpi.direction === "down"
                    ? false
                    : undefined;

          const deltaText = formatKpiDelta(kpi.unit, kpi.delta, kpi.delta_display);
          const showDeltaBelow = kpi.unit === "level_percent" || kpi.unit === "currency";
          const hasComparison =
            deltaText != null || kpi.delta != null || Boolean(kpi.delta_display);
          const belowValueText =
            deltaText ?? (hasComparison && kpi.delta_label ? kpi.delta_label : null);

          return (
            <div
              key={kpi.id}
              className="rounded-lg border border-slate-200/70 bg-slate-50/40 px-3 py-2.5 dark:border-slate-800/90 dark:bg-slate-950/40"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {kpi.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sh-heading">
                {kpi.value}
              </p>
              {showDeltaBelow && belowValueText && (
                <p
                  className={`mt-0.5 text-[11px] font-semibold tabular-nums ${
                    deltaText
                      ? kpi.direction === "up"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : kpi.direction === "down"
                          ? "text-rose-600 dark:text-rose-400"
                          : "sh-subtext"
                      : "sh-subtext"
                  }`}
                >
                  {belowValueText}
                </p>
              )}
              {!showDeltaBelow && (deltaText || kpi.delta_label) && (
                <p className="mt-0.5 text-[11px] font-semibold tabular-nums sh-subtext">
                  {deltaText ?? kpi.delta_label}
                </p>
              )}
              {kpi.delta_label && showDeltaBelow && deltaText && (
                <p className="mt-0.5 truncate text-[10px] sh-subtext">{kpi.delta_label}</p>
              )}
              <div className="mt-1.5">
                <KpiSparkline
                  data={kpi.trend.map((t) => ({ value: t.value }))}
                  positive={positive}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
