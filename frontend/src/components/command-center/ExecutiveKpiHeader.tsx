"use client";

import type { ExecutiveKpiCard } from "@/lib/command-center";
import { formatKpiDelta } from "@/lib/format";

import { KpiSparkline } from "./KpiSparkline";

/** Hidden on mobile so six core KPIs fit above the fold without scrolling. */
const MOBILE_EXCLUDED_IDS = new Set(["fnb", "at_risk", "forecast_accuracy"]);

const MOBILE_KPI_ORDER = [
  "portfolio_revenue",
  "rev_vs_budget",
  "rev_vs_forecast",
  "occupancy",
  "adr",
  "revpar",
] as const;

type Props = {
  kpis: ExecutiveKpiCard[];
  reportsInPeriod: number;
  periodLabel: string;
  isLoading?: boolean;
};

function sortForMobile(kpis: ExecutiveKpiCard[]): ExecutiveKpiCard[] {
  const order = new Map(MOBILE_KPI_ORDER.map((id, i) => [id, i]));
  return [...kpis].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

function KpiCard({ kpi, compact }: { kpi: ExecutiveKpiCard; compact?: boolean }) {
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
  const hasComparison = deltaText != null || kpi.delta != null || Boolean(kpi.delta_display);
  const belowValueText = deltaText ?? (hasComparison && kpi.delta_label ? kpi.delta_label : null);

  const deltaColor =
    deltaText && kpi.direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : deltaText && kpi.direction === "down"
        ? "text-rose-600 dark:text-rose-400"
        : "sh-subtext";

  if (compact) {
    return (
      <div className="flex min-h-0 flex-col rounded-md border border-slate-200/70 bg-slate-50/50 px-2 py-1.5 dark:border-slate-800/80 dark:bg-slate-950/50">
        <p className="text-[9px] font-semibold uppercase leading-tight tracking-wide text-slate-500 line-clamp-2 dark:text-slate-400">
          {kpi.label}
        </p>
        <p className="mt-0.5 text-lg font-semibold leading-none tracking-tight tabular-nums sh-heading">
          {kpi.value}
        </p>
        {showDeltaBelow && belowValueText && (
          <p className={`mt-0.5 truncate text-[10px] font-semibold leading-tight tabular-nums ${deltaColor}`}>
            {belowValueText}
          </p>
        )}
        {!showDeltaBelow && (deltaText || kpi.delta_label) && (
          <p className="mt-0.5 truncate text-[10px] font-semibold leading-tight tabular-nums sh-subtext">
            {deltaText ?? kpi.delta_label}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200/70 bg-slate-50/40 px-3 py-2.5 dark:border-slate-800/90 dark:bg-slate-950/40">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {kpi.label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sh-heading">{kpi.value}</p>
      {showDeltaBelow && belowValueText && (
        <p className={`mt-0.5 text-[11px] font-semibold tabular-nums ${deltaColor}`}>{belowValueText}</p>
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
        <KpiSparkline data={kpi.trend.map((t) => ({ value: t.value }))} positive={positive} />
      </div>
    </div>
  );
}

export function ExecutiveKpiHeader({ kpis, reportsInPeriod, periodLabel, isLoading }: Props) {
  const mobileKpis = sortForMobile(kpis.filter((k) => !MOBILE_EXCLUDED_IDS.has(k.id)));

  return (
    <section
      className={`sh-terminal-panel transition-opacity ${isLoading ? "opacity-60" : ""}`}
    >
      {/* Mobile header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 px-2 py-1.5 sm:hidden dark:border-slate-700/80">
        <p className="min-w-0 truncate text-[9px] font-semibold uppercase tracking-wide sh-label">
          KPIs ·{" "}
          <span className="normal-case text-slate-700 dark:text-slate-200">{periodLabel}</span>
        </p>
        <p className="shrink-0 text-[9px] sh-subtext">
          {reportsInPeriod}r{isLoading ? " …" : ""}
        </p>
      </div>

      {/* Desktop header */}
      <div className="mb-2 hidden flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2 sm:flex dark:border-slate-700/80">
        <p className="sh-label text-[10px]">
          Executive KPIs ·{" "}
          <span className="normal-case text-slate-700 dark:text-slate-200">{periodLabel}</span>
        </p>
        <p className="text-[10px] sh-subtext">
          {reportsInPeriod} report{reportsInPeriod === 1 ? "" : "s"} in range
          {isLoading ? " · updating…" : ""}
        </p>
      </div>

      {/* Mobile: 2×3 compact grid, no sparklines */}
      <div className="grid grid-cols-2 gap-1.5 p-1.5 sm:hidden">
        {mobileKpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} compact />
        ))}
      </div>

      {/* Desktop: full cards */}
      <div className="hidden gap-2 p-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </section>
  );
}
