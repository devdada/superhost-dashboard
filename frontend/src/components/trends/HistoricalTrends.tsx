"use client";

import { useCallback, useEffect, useState } from "react";

import { formatPeriodRange, type DashboardFilters } from "@/lib/dashboard-filters";
import { fetchHistoricalTrends, type HistoricalTrends } from "@/lib/trends";

import { HotelRankings } from "./HotelRankings";
import { HotelVarianceChart } from "./HotelVarianceChart";
import { PersistentRisks } from "./PersistentRisks";
import { PortfolioVarianceChart } from "./PortfolioVarianceChart";
import { TrendMovers } from "./TrendMovers";
import { TrendSummaryCards } from "./TrendSummaryCards";

type Props = {
  refreshKey?: number;
  filters: DashboardFilters;
};

export function HistoricalTrendsSection({ refreshKey = 0, filters }: Props) {
  const [trends, setTrends] = useState<HistoricalTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHistoricalTrends(filters);
      setTrends(data);
    } catch (err) {
      setTrends(null);
      setError(err instanceof Error ? err.message : "Failed to load trends");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends, refreshKey]);

  return (
    <section className="space-y-6 sh-card p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          Historical intelligence
        </p>
        <h2 className="text-xl font-bold sh-heading">Historical Trends</h2>
        <p className="mt-1 text-sm sh-subtext">
          {filters.metric} ·{" "}
          {trends
            ? formatPeriodRange(filters.period, trends.range_start, trends.range_end)
            : formatPeriodRange(filters.period, null, null)}
          . Trends use all reports in the selected range.
        </p>
      </div>

      {loading && (
        <p className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-8 text-center text-sm sh-subtext">
          Loading historical trends…
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {error}
        </p>
      )}

      {!loading && !error && trends && (
        <div className="space-y-6">
          <TrendSummaryCards trends={trends} />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h3 className="text-sm font-semibold sh-heading">
                Portfolio average variance over time
              </h3>
              <p className="mb-4 text-xs sh-label">Mean variance % across all hotels per report</p>
              <PortfolioVarianceChart data={trends.portfolio_variance_trend} />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h3 className="text-sm font-semibold sh-heading">Hotel variance trend lines</h3>
              <p className="mb-4 text-xs sh-label">Top and bottom performers across uploads</p>
              <HotelVarianceChart series={trends.hotel_variance_series} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <HotelRankings
              title="Top performers over time"
              subtitle="Highest average variance % across all reports"
              hotels={trends.top_performers}
              variant="top"
            />
            <HotelRankings
              title="Worst performers over time"
              subtitle="Lowest average variance % across all reports"
              hotels={trends.worst_performers}
              variant="worst"
            />
          </div>

          <PersistentRisks risks={trends.persistent_risks} />

          <div className="grid gap-4 lg:grid-cols-2">
            <TrendMovers
              title="Improving properties"
              movers={trends.improving_properties}
              variant="improving"
            />
            <TrendMovers
              title="Declining properties"
              movers={trends.declining_properties}
              variant="declining"
            />
          </div>
        </div>
      )}
    </section>
  );
}
