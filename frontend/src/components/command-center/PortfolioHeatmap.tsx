"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { HeatmapRow } from "@/lib/command-center";
import { formatCurrency, formatLevelPercent, formatVariancePercent } from "@/lib/format";
import { propertyPath } from "@/lib/property";

type SortKey = keyof Pick<
  HeatmapRow,
  | "hotel_name"
  | "revenue"
  | "occupancy"
  | "adr"
  | "revpar"
  | "variance_vs_budget"
  | "variance_vs_forecast"
  | "status_score"
>;

function fmtVariance(v: number | null) {
  if (v === null || !Number.isFinite(v)) return "—";
  return formatVariancePercent(v);
}

function rowHeat(variance: number | null): string {
  if (variance === null) return "";
  if (variance <= -10) return "bg-rose-500/10 dark:bg-rose-500/18";
  if (variance <= -5) return "bg-amber-500/8 dark:bg-amber-500/12";
  if (variance >= 10) return "bg-emerald-500/8 dark:bg-emerald-500/12";
  return "";
}

function riskTone(score: number, status: string): string {
  if (status === "critical") return "text-rose-700 dark:text-rose-300";
  if (status === "watch") return "text-amber-700 dark:text-amber-300";
  if (status === "outperforming") return "text-emerald-700 dark:text-emerald-300";
  return "text-slate-600 dark:text-slate-400";
}

export function PortfolioHeatmap({ rows }: { rows: HeatmapRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("variance_vs_budget");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortAsc ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
  }, [rows, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === "hotel_name");
    }
  };

  const Th = ({ label, k, align = "left" }: { label: string; k: SortKey; align?: "left" | "right" }) => (
    <th
      className={`cursor-pointer px-3 py-2 text-[10px] font-bold uppercase tracking-wider sh-label ${
        align === "right" ? "text-right" : "text-left"
      }`}
      onClick={() => toggleSort(k)}
    >
      {label}
      {sortKey === k ? (sortAsc ? " ↑" : " ↓") : ""}
    </th>
  );

  if (rows.length === 0) {
    return (
      <section className="sh-terminal-panel p-6 text-center">
        <p className="sh-section-title">Portfolio Command Grid</p>
        <p className="mt-1 text-sm sh-subtext">Upload reports to populate the command grid.</p>
      </section>
    );
  }

  return (
    <section className="sh-terminal-panel overflow-hidden sh-animate-in sh-stagger-3">
      <div className="border-b border-slate-200/80 px-3 py-2 dark:border-slate-700/80">
        <p className="sh-label text-[10px]">Primary operational layer</p>
        <h2 className="text-base font-semibold tracking-tight sh-heading">Portfolio Command Grid</h2>
        <p className="text-[11px] sh-subtext">Sortable · heat-ranked · click hotel for drilldown</p>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 dark:border-slate-700 dark:bg-slate-900/95">
            <tr>
              <Th label="Hotel" k="hotel_name" />
              <Th label="Revenue" k="revenue" align="right" />
              <Th label="Occ" k="occupancy" align="right" />
              <Th label="ADR" k="adr" align="right" />
              <Th label="RevPAR" k="revpar" align="right" />
              <Th label="vs Budget" k="variance_vs_budget" align="right" />
              <Th label="vs Forecast" k="variance_vs_forecast" align="right" />
              <Th label="Risk" k="status_score" align="right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.hotel_name}
                className={`border-b border-slate-100/80 transition hover:bg-indigo-500/5 dark:border-slate-800/80 ${rowHeat(row.variance_vs_budget)}`}
              >
                <td className="px-3 py-2">
                  <Link
                    href={propertyPath(row.hotel_name)}
                    className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {row.hotel_name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {row.revenue != null ? formatCurrency(row.revenue) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.occupancy != null ? formatLevelPercent(row.occupancy) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.adr != null ? formatCurrency(row.adr) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.revpar != null ? formatCurrency(row.revpar) : "—"}
                </td>
                <td
                  className={`px-3 py-2 text-right font-semibold tabular-nums ${
                    (row.variance_vs_budget ?? 0) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {fmtVariance(row.variance_vs_budget)}
                </td>
                <td
                  className={`px-3 py-2 text-right font-semibold tabular-nums ${
                    (row.variance_vs_forecast ?? 0) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {fmtVariance(row.variance_vs_forecast)}
                </td>
                <td className={`px-3 py-2 text-right font-semibold tabular-nums ${riskTone(row.status_score, row.status)}`}>
                  {row.status_score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
