"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchExecutiveIntelligence, type ExecutiveIntelligence } from "@/lib/executive";

import { ExecutiveRecommendations } from "./ExecutiveRecommendations";
import { ExecutiveSummary } from "./ExecutiveSummary";

type Props = {
  refreshKey?: number;
};

export function ExecutiveIntelligenceSection({ refreshKey = 0 }: Props) {
  const [data, setData] = useState<ExecutiveIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchExecutiveIntelligence());
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load executive intelligence");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <section className="space-y-6">
      {loading && (
        <p className="sh-card px-4 py-8 text-center text-sm sh-subtext">
          Generating executive intelligence…
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {error}
        </p>
      )}

      {!loading && !error && data && (
        <>
          <ExecutiveSummary summary={data.executive_summary} />

          <div className="sh-card p-6">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
                Action intelligence
              </p>
              <h2 className="text-xl font-bold sh-heading">Executive Recommendations</h2>
              <p className="mt-1 text-sm sh-subtext">
                Deterministic operating analyst — what is wrong, why it matters, who owns the
                response, and what to do next.
                {data.report_date && (
                  <span className="text-slate-500">
                    {" "}
                    · Latest report: {data.report_date}
                  </span>
                )}
              </p>
            </div>
            <ExecutiveRecommendations recommendations={data.recommendations} />
          </div>
        </>
      )}
    </section>
  );
}
