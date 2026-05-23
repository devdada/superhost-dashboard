"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { statusTone } from "@/lib/ingestion/duplicateDetection";
import {
  fetchAdminIngestion,
  pdfViewUrl,
  reprocessReport,
} from "@/lib/ingestion/pdfIngestionService";
import type { AdminIngestionData } from "@/lib/ingestion/types";

export default function AdminIngestionPage() {
  const [data, setData] = useState<AdminIngestionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await fetchAdminIngestion());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onReprocess = async (reportId: number) => {
    setBusyId(reportId);
    try {
      await reprocessReport(reportId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reprocess failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell
      title="Ingestion"
      subtitle="Inbound email pipeline — received reports, parse confidence, duplicates, and failures."
    >
      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {error}
        </p>
      )}

      {data && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sh-terminal-panel p-4">
              <p className="sh-label text-[10px]">Dashboard revision</p>
              <p className="mt-1 text-sm font-mono sh-heading">
                {data.dashboard_revision ?? "—"}
              </p>
            </div>
            <div className="sh-terminal-panel p-4">
              <p className="sh-label text-[10px]">Last successful sync</p>
              <p className="mt-1 text-sm sh-heading">
                {data.last_success_at
                  ? new Date(data.last_success_at).toLocaleString()
                  : "—"}
              </p>
            </div>
            <div className="sh-terminal-panel p-4">
              <p className="sh-label text-[10px]">Ingestion logs</p>
              <p className="mt-1 text-2xl font-semibold sh-heading">{data.logs.length}</p>
            </div>
          </div>

          <section className="sh-terminal-panel overflow-hidden">
            <div className="border-b border-slate-200/80 px-3 py-2 dark:border-slate-700/80">
              <h2 className="text-base font-semibold sh-heading">Latest ingestion logs</h2>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900">
                  <tr>
                    <th className="px-3 py-2 text-left sh-label">Received</th>
                    <th className="px-3 py-2 text-left sh-label">Sender</th>
                    <th className="px-3 py-2 text-left sh-label">File</th>
                    <th className="px-3 py-2 text-left sh-label">Status</th>
                    <th className="px-3 py-2 text-right sh-label">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((log) => (
                    <tr key={log.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 tabular-nums">
                        {new Date(log.received_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 max-w-[140px] truncate">{log.sender ?? "—"}</td>
                      <td className="px-3 py-2 max-w-[160px] truncate">
                        {log.attachment_filename ?? "—"}
                      </td>
                      <td className={`px-3 py-2 font-semibold ${statusTone(log.status)}`}>
                        {log.status}
                        {log.duplicate_detected ? " · dup" : ""}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {log.parse_confidence != null
                          ? `${(log.parse_confidence * 100).toFixed(0)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="sh-terminal-panel overflow-hidden">
            <div className="border-b border-slate-200/80 px-3 py-2 dark:border-slate-700/80">
              <h2 className="text-base font-semibold sh-heading">Received reports</h2>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900">
                  <tr>
                    <th className="px-3 py-2 text-left sh-label">Date</th>
                    <th className="px-3 py-2 text-left sh-label">File</th>
                    <th className="px-3 py-2 text-left sh-label">Source</th>
                    <th className="px-3 py-2 text-left sh-label">Status</th>
                    <th className="px-3 py-2 text-right sh-label">Metrics</th>
                    <th className="px-3 py-2 text-right sh-label">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reports.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">{r.report_date}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate">{r.file_name}</td>
                      <td className="px-3 py-2">{r.source_type}</td>
                      <td className={`px-3 py-2 font-semibold ${statusTone(r.ingestion_status)}`}>
                        {r.ingestion_status}
                      </td>
                      <td className="px-3 py-2 text-right">{r.metrics_count}</td>
                      <td className="px-3 py-2 text-right space-x-2">
                        {r.pdf_url && (
                          <a
                            href={pdfViewUrl(r.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            PDF
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={busyId === r.id || !r.pdf_url}
                          onClick={() => onReprocess(r.id)}
                          className="text-indigo-600 hover:underline disabled:opacity-40 dark:text-indigo-400"
                        >
                          {busyId === r.id ? "…" : "Reprocess"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
