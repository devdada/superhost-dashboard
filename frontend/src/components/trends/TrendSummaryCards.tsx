import type { HistoricalTrends } from "@/lib/trends";

type Props = {
  trends: HistoricalTrends;
};

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TrendSummaryCards({ trends }: Props) {
  const latest = trends.portfolio_variance_trend.at(-1);
  const previous = trends.portfolio_variance_trend.at(-2);
  const delta =
    latest && previous
      ? latest.average_variance_percent - previous.average_variance_percent
      : null;

  const cards = [
    {
      label: "Reports Uploaded",
      value: String(trends.total_reports),
      sub: "Unique report dates (duplicates excluded)",
      accent: "border-l-indigo-500",
    },
    {
      label: "Latest Portfolio Variance",
      value: latest
        ? `${latest.average_variance_percent >= 0 ? "+" : ""}${latest.average_variance_percent.toFixed(1)}%`
        : "—",
      sub: latest ? formatShortDate(latest.report_date) : "Upload a report",
      accent: "border-l-violet-500",
    },
    {
      label: "Persistent Risks",
      value: String(trends.persistent_risks.length),
      sub: "3+ consecutive budget misses",
      accent: "border-l-rose-500",
    },
    {
      label: "Trend vs Prior Report",
      value: delta === null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pts`,
      sub: delta === null ? "Needs 2+ reports" : "Portfolio avg variance change",
      accent: delta !== null && delta >= 0 ? "border-l-emerald-500" : "border-l-amber-500",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`sh-card p-5 border-l-4 ${card.accent}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide sh-label">
            {card.label}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums sh-heading">{card.value}</p>
          <p className="mt-1 text-xs sh-label">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
