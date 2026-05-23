"use client";

import Link from "next/link";

import type { ActionAlert } from "@/lib/command-center";
import { formatVariancePercent } from "@/lib/format";
import { propertyPath } from "@/lib/property";

const STYLES = {
  critical: {
    border: "border-rose-500/50",
    bg: "bg-rose-500/5 dark:bg-rose-950/30",
    badge: "bg-rose-600 text-white",
    accent: "border-l-rose-500",
  },
  watch: {
    border: "border-amber-500/50",
    bg: "bg-amber-500/5 dark:bg-amber-950/25",
    badge: "bg-amber-600 text-white",
    accent: "border-l-amber-500",
  },
  strong: {
    border: "border-emerald-500/50",
    bg: "bg-emerald-500/5 dark:bg-emerald-950/25",
    badge: "bg-emerald-600 text-white",
    accent: "border-l-emerald-500",
  },
};

function AlertCard({ alert }: { alert: ActionAlert }) {
  const s = STYLES[alert.severity];
  return (
    <article
      className={`w-[272px] shrink-0 rounded-lg border-l-[3px] px-3 py-2.5 shadow-sm ${s.border} ${s.bg} ${s.accent}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${s.badge}`}>
          {alert.severity}
        </span>
        <span className="text-xs font-bold tabular-nums sh-heading">
          {formatVariancePercent(alert.variance_percent)}
        </span>
      </div>
      <Link
        href={propertyPath(alert.hotel_name)}
        className="mt-1.5 block truncate text-sm font-semibold leading-tight text-indigo-600 hover:underline dark:text-indigo-400"
      >
        {alert.hotel_name}
      </Link>
      <p className="mt-0.5 text-xs font-medium leading-snug sh-heading">{alert.headline}</p>
      <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug sh-subtext">{alert.explanation}</p>
      <p className="mt-1.5 line-clamp-2 text-[10px] font-medium leading-snug text-indigo-700/90 dark:text-indigo-300/90">
        → {alert.recommended_action}
      </p>
    </article>
  );
}

export function ActionIntelligence({ alerts }: { alerts: ActionAlert[] }) {
  const critical = alerts.filter((a) => a.severity === "critical");
  const watch = alerts.filter((a) => a.severity === "watch");
  const strong = alerts.filter((a) => a.severity === "strong");

  if (alerts.length === 0) {
    return (
      <section className="sh-terminal-panel px-4 py-5 text-center sh-animate-in sh-stagger-2">
        <p className="sh-label text-[10px]">Action Intelligence</p>
        <p className="mt-1 text-sm sh-subtext">
          No high-confidence variances in this period. Portfolio within normal bands.
        </p>
      </section>
    );
  }

  const Row = ({
    title,
    items,
    tone,
  }: {
    title: string;
    items: ActionAlert[];
    tone: string;
  }) =>
    items.length > 0 ? (
      <div>
        <p className={`mb-1.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}>{title}</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {items.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      </div>
    ) : null;

  return (
    <section className="sh-terminal-panel sh-animate-in sh-stagger-2">
      <div className="border-b border-slate-200/80 px-3 py-2 dark:border-slate-700/80">
        <p className="sh-label text-[10px] text-indigo-600 dark:text-indigo-400">Priority layer</p>
        <h2 className="text-base font-semibold tracking-tight sh-heading">Action Intelligence</h2>
      </div>
      <div className="space-y-3 p-3">
        <Row title="Critical — act today" items={critical} tone="text-rose-600" />
        <Row title="Watch list" items={watch} tone="text-amber-600" />
        <Row title="Outperforming" items={strong} tone="text-emerald-600" />
      </div>
    </section>
  );
}
