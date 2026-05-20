import { analyzePortfolio, type PortfolioAnalytics } from "@/lib/analytics";
import type { FlashMetricRow } from "@/lib/api";

import { InsightList } from "./InsightList";

type Props = {
  rows: FlashMetricRow[];
  metric: string;
  analytics?: PortfolioAnalytics;
  totalReports?: number;
};

export function PortfolioInsights({ rows, metric, analytics: provided, totalReports }: Props) {
  const analytics = provided ?? analyzePortfolio(rows);
  const actionCount =
    analytics.criticalRisks.length +
    analytics.watchList.length +
    analytics.strongPerformers.length;

  return (
    <section className="sh-card p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Operational intelligence
          </p>
          <h2 className="text-xl font-bold sh-heading">Portfolio Insights</h2>
          <p className="mt-1 max-w-2xl text-sm sh-subtext">
            Rule-based analysis of {metric} variance vs budget. Critical risks (≤ -10%),
            watch list (-10% to -5%), and strong performers (≥ +10%).
          </p>
        </div>
        <p className="text-sm sh-label">
          <span className="font-semibold sh-heading">{actionCount}</span> flagged hotels
          {totalReports !== undefined && (
            <span className="text-slate-400 dark:text-slate-500">
              {" "}
              · {totalReports} unique report{totalReports === 1 ? "" : "s"} on file
            </span>
          )}
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <InsightList category="critical_risk" insights={analytics.criticalRisks} />
        <InsightList category="watch_list" insights={analytics.watchList} />
        <InsightList category="strong_performer" insights={analytics.strongPerformers} />
      </div>
    </section>
  );
}
