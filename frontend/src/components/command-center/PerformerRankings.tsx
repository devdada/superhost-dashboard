"use client";

import Link from "next/link";

import type { PerformerCard } from "@/lib/command-center";
import { propertyPath } from "@/lib/property";

import { KpiSparkline } from "./KpiSparkline";

function PerformerList({
  title,
  subtitle,
  performers,
  variant,
}: {
  title: string;
  subtitle: string;
  performers: PerformerCard[];
  variant: "top" | "worst";
}) {
  const border = variant === "top" ? "border-emerald-500/30" : "border-rose-500/30";

  return (
    <div className={`sh-card p-6 border-t-4 ${border}`}>
      <p className="sh-label">{subtitle}</p>
      <h3 className="mt-1 text-lg font-semibold sh-heading">{title}</h3>
      {performers.length === 0 ? (
        <p className="mt-6 text-sm sh-subtext">Insufficient data in range.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {performers.map((p) => (
            <li
              key={p.hotel_name}
              className="flex gap-4 rounded-xl border border-slate-100 p-4 dark:border-slate-800"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold dark:bg-slate-800">
                {p.rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={propertyPath(p.hotel_name)}
                    className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {p.hotel_name}
                  </Link>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase dark:bg-slate-800">
                    {p.badge}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs sh-subtext">
                  {p.revenue_variance !== null && (
                    <span>
                      Rev var{" "}
                      <strong
                        className={
                          p.revenue_variance >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }
                      >
                        {p.revenue_variance >= 0 ? "+" : ""}
                        {p.revenue_variance.toFixed(1)}%
                      </strong>
                    </span>
                  )}
                  {p.revpar !== null && (
                    <span>
                      RevPAR <strong className="sh-heading">${p.revpar.toFixed(0)}</strong>
                    </span>
                  )}
                  {p.revpar_change !== null && (
                    <span>
                      {p.trend_direction === "up" ? "↑" : p.trend_direction === "down" ? "↓" : "→"}{" "}
                      {p.revpar_change >= 0 ? "+" : ""}
                      {p.revpar_change} pts
                    </span>
                  )}
                </div>
                {p.sparkline.length >= 2 && (
                  <div className="mt-3 h-8">
                    <KpiSparkline
                      data={p.sparkline.map((v) => ({ value: v }))}
                      positive={variant === "top"}
                    />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PerformerRankings({
  top,
  worst,
}: {
  top: PerformerCard[];
  worst: PerformerCard[];
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <PerformerList
        title="Top performers"
        subtitle="Outperformance"
        performers={top}
        variant="top"
      />
      <PerformerList
        title="Worst performers"
        subtitle="Underperformance"
        performers={worst}
        variant="worst"
      />
    </section>
  );
}
