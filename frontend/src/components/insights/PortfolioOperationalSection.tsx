"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchPortfolioOperational, type PortfolioOperational } from "@/lib/portfolio";

import { PortfolioInsights } from "./PortfolioInsights";
import { SummaryCards } from "./SummaryCards";

type Props = {
  refreshKey?: number;
};

export function PortfolioOperationalSection({ refreshKey = 0 }: Props) {
  const [data, setData] = useState<PortfolioOperational | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPortfolioOperational());
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load portfolio insights");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <p className="sh-card px-4 py-10 text-center text-sm sh-subtext">
        Loading operational intelligence…
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
        {error}
      </p>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Operational intelligence
          </p>
          <h2 className="text-xl font-bold sh-heading">Portfolio snapshot</h2>
          <p className="mt-1 text-sm sh-subtext">
            Latest Daily Flash in the database — duplicate report dates are stored once.
          </p>
        </div>
        <div className="sh-card-muted px-4 py-3 text-right">
          <p className="text-3xl font-bold tabular-nums sh-heading">{data.total_reports}</p>
          <p className="text-xs font-medium sh-label">Reports uploaded</p>
        </div>
      </div>

      {data.rows.length === 0 ? (
        <p className="sh-card-muted px-4 py-8 text-center text-sm sh-subtext">
          No reports yet. Upload Daily Flash PDFs below to populate operational intelligence.
        </p>
      ) : (
        <>
          {data.latest_report_date && data.latest_filename && (
            <p className="text-sm sh-subtext">
              Latest report:{" "}
              <span className="font-medium sh-heading">{data.latest_report_date}</span>
              {" · "}
              {data.latest_filename}
            </p>
          )}
          <SummaryCards
            summary={{
              totalHotels: data.rows.length,
              positiveVarianceCount: data.rows.filter((r) => r.variance_percent > 0).length,
              negativeVarianceCount: data.rows.filter((r) => r.variance_percent < 0).length,
              averageVariancePercent:
                data.rows.reduce((s, r) => s + r.variance_percent, 0) / data.rows.length,
            }}
            metric={data.metric ?? "Revenue"}
          />
          <PortfolioInsights
            rows={data.rows}
            metric={data.metric ?? "Revenue"}
            totalReports={data.total_reports}
          />
        </>
      )}
    </section>
  );
}
