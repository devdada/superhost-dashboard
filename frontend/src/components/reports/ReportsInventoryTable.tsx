"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchReportsInventory,
  formatUploadedAt,
  type ReportInventoryItem,
} from "@/lib/reports";

const STATUS_STYLES: Record<string, string> = {
  full: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  partial: "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200",
  revenue_only: "bg-orange-100 text-orange-900 dark:bg-orange-900/50 dark:text-orange-200",
  empty: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

type Props = {
  refreshKey?: number;
};

export function ReportsInventoryTable({ refreshKey = 0 }: Props) {
  const [data, setData] = useState<ReportInventoryItem[]>([]);
  const [summary, setSummary] = useState({ total: 0, full: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchReportsInventory();
      setData(res.reports);
      setSummary({ total: res.total, full: res.full_parse_count });
    } catch (err) {
      setData([]);
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <section className="sh-card overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <p className="sh-label">Ingestion log</p>
        <h2 className="sh-section-title">Uploaded reports</h2>
        <p className="mt-1 text-sm sh-subtext">
          {summary.total} report{summary.total === 1 ? "" : "s"} on file ·{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {summary.full} full parse
          </span>{" "}
          (Revenue, Room Revenue, Occupancy, ADR, RevPAR)
        </p>
      </div>

      {loading && (
        <p className="px-6 py-10 text-center text-sm sh-subtext">Loading reports…</p>
      )}

      {error && (
        <p className="mx-6 my-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {error}
        </p>
      )}

      {!loading && !error && data.length === 0 && (
        <p className="px-6 py-10 text-center text-sm sh-subtext">No reports uploaded yet.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="max-h-[480px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
              <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider sh-label dark:border-slate-800">
                <th className="px-6 py-3">Report date</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3 text-right">Hotels</th>
                <th className="px-4 py-3">Metrics</th>
                <th className="px-6 py-3">Parse status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.report_id}
                  className="border-b border-slate-100 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="px-6 py-3 font-semibold tabular-nums sh-heading">
                    {row.report_date}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 sh-subtext" title={row.file_name}>
                    {row.file_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs sh-subtext">
                    {formatUploadedAt(row.uploaded_at)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.hotel_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.metrics_present.map((m) => (
                        <span
                          key={m}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-slate-800"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[row.parse_status] ?? STATUS_STYLES.empty}`}
                    >
                      {row.parse_status.replace("_", " ")}
                    </span>
                    <p className="mt-1 text-xs sh-subtext">{row.parse_label}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
