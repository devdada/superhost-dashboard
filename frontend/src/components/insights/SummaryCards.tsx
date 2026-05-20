import type { PortfolioSummary } from "@/lib/analytics";

type Props = {
  summary: PortfolioSummary;
  metric: string;
};

type CardConfig = {
  label: string;
  value: string;
  sub: string;
  accent: string;
  valueClass?: string;
};

export function SummaryCards({ summary, metric }: Props) {
  const avgSign = summary.averageVariancePercent >= 0 ? "+" : "";
  const avgColor =
    summary.averageVariancePercent >= 0
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-rose-700 dark:text-rose-400";

  const cards: CardConfig[] = [
    {
      label: "Total Hotels",
      value: String(summary.totalHotels),
      sub: "In portfolio report",
      accent: "border-l-indigo-500",
    },
    {
      label: "Positive Variance",
      value: String(summary.positiveVarianceCount),
      sub: "Beating budget",
      accent: "border-l-emerald-500",
    },
    {
      label: "Negative Variance",
      value: String(summary.negativeVarianceCount),
      sub: "Below budget",
      accent: "border-l-rose-500",
    },
    {
      label: "Average Variance",
      value: `${avgSign}${summary.averageVariancePercent.toFixed(1)}%`,
      sub: `${metric} · portfolio-wide`,
      accent: "border-l-slate-500",
      valueClass: avgColor,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`sh-card border-l-4 p-5 ${card.accent}`}>
          <p className="text-xs font-semibold uppercase tracking-wide sh-label">{card.label}</p>
          <p className={`mt-2 text-3xl font-bold tabular-nums sh-heading ${card.valueClass ?? ""}`}>
            {card.value}
          </p>
          <p className="mt-1 text-xs sh-label">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
