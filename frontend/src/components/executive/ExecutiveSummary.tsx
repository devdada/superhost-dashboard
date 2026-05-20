import { healthScoreRing, type PortfolioExecutiveSummary } from "@/lib/executive";

type Props = {
  summary: PortfolioExecutiveSummary;
};

export function ExecutiveSummary({ summary }: Props) {
  const score = summary.portfolio_health_score;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  const scoreTextClass =
    score >= 80
      ? "text-emerald-300"
      : score >= 60
        ? "text-amber-300"
        : score >= 40
          ? "text-orange-300"
          : "text-rose-300";

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-lg">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
            Portfolio executive summary
          </p>
          <h2 className="mt-1 text-2xl font-bold">Ownership Command Brief</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300">{summary.health_narrative}</p>
          <span className="mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            Status: {summary.health_label}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative h-24 w-24 shrink-0">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                className="text-white/10"
                strokeWidth="8"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className={healthScoreRing(score)}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${scoreTextClass}`}>{score}</span>
              <span className="text-[10px] uppercase text-slate-400">Health</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SummaryTile
          label="Biggest portfolio risk"
          value={summary.biggest_portfolio_risk}
          accent="border-rose-400/50"
        />
        <SummaryTile
          label="Strongest performer"
          value={summary.strongest_performer}
          accent="border-emerald-400/50"
        />
        <SummaryTile
          label="Emerging concern"
          value={summary.emerging_concern}
          accent="border-amber-400/50"
        />
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className={`rounded-lg border-l-4 ${accent} bg-white/5 px-4 py-3`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium leading-snug text-white">{value}</p>
    </div>
  );
}
