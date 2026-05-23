"use client";

import { useRef, useState } from "react";

import {
  uploadDailyFlashBatch,
  type BatchUploadResponse,
  type UploadResponse,
} from "@/lib/api";

import { DashboardView } from "./DashboardView";

type Props = {
  onUploadSuccess?: () => void;
};

function toUploadResponse(item: BatchUploadResponse["imported"][0]): UploadResponse {
  return {
    report_id: item.report_id,
    report_date: String(item.report_date),
    filename: item.filename,
    metric: item.metric,
    rows: item.rows,
  };
}

export function UploadPanel({ onUploadSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<BatchUploadResponse | null>(null);
  const [latestResult, setLatestResult] = useState<UploadResponse | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
    setError(null);
    setBatchResult(null);
    setLatestResult(null);
  };

  const onUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Choose one or more PDF files first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await uploadDailyFlashBatch(selectedFiles, {
        replaceExisting,
      });
      setBatchResult(response);

      if (response.imported.length > 0) {
        const latest = response.imported[response.imported.length - 1];
        setLatestResult(toUploadResponse(latest));
        onUploadSuccess?.();
      } else {
        setLatestResult(null);
        if (response.skipped_duplicates.length > 0 && response.failed.length === 0) {
          setError("All files were skipped — those report dates already exist.");
        } else if (response.failed.length > 0 && response.imported.length === 0) {
          setError("No files were imported. See details below.");
        }
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setSelectedFiles([]);
    } catch (err) {
      setBatchResult(null);
      setLatestResult(null);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const fileLabel =
    selectedFiles.length === 0
      ? null
      : selectedFiles.length === 1
        ? selectedFiles[0].name
        : `${selectedFiles.length} files selected`;

  return (
    <div className="space-y-8">
      <section className="sh-card border-dashed p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          Current report
        </p>
        <h2 className="text-lg font-semibold sh-heading">Upload Daily Flash PDFs</h2>
        <p className="mt-1 text-sm sh-subtext">
          Each PDF ingests five metrics (Revenue, Room Revenue, Occupancy, ADR, RevPAR). By default,
          duplicate report dates are skipped.
        </p>

        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm sh-subtext">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(e) => setReplaceExisting(e.target.checked)}
            className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            <strong className="sh-heading">Replace existing dates</strong> — re-import PDFs that
            share a report date already in the database (use after upgrading ingestion to load
            Occupancy and other metrics).
          </span>
        </label>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            ref={inputRef}
            id="daily-flash-pdf"
            type="file"
            accept="application/pdf,.pdf"
            multiple
            onChange={onFileChange}
            className="block w-full min-w-0 text-sm text-slate-700 dark:text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800 dark:file:bg-slate-700"
          />
          <button
            type="button"
            onClick={onUpload}
            disabled={loading || selectedFiles.length === 0}
            className="shrink-0 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-700"
          >
            {loading
              ? `Parsing ${selectedFiles.length || ""} PDF${selectedFiles.length === 1 ? "" : "s"}…`
              : `Upload & Parse${selectedFiles.length > 1 ? ` (${selectedFiles.length})` : ""}`}
          </button>
        </div>

        {fileLabel && !loading && (
          <ul className="mt-3 space-y-1 text-xs sh-label">
            <li>{fileLabel}</li>
            {selectedFiles.length > 1 &&
              selectedFiles.map((f) => (
                <li key={f.name} className="truncate pl-2 text-slate-400 dark:text-slate-500">
                  · {f.name}
                </li>
              ))}
          </ul>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
            {error}
          </p>
        )}

        {batchResult && (
          <BatchUploadSummary result={batchResult} />
        )}
      </section>

      {latestResult && (
        <section className="space-y-4">
          <p className="text-sm sh-subtext">
            Showing latest imported report
            {batchResult && batchResult.imported.length > 1
              ? ` (${batchResult.imported.length} total imported)`
              : ""}
            .
          </p>
          <DashboardView result={latestResult} />
          <details className="sh-card-muted p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
              Raw JSON response
            </summary>
            <pre className="mt-3 overflow-x-auto text-xs text-slate-800 dark:text-slate-200">
              {JSON.stringify(latestResult.rows, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </div>
  );
}

function BatchUploadSummary({ result }: { result: BatchUploadResponse }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <p className="text-sm font-semibold sh-heading">Upload summary</p>
      <ul className="mt-2 space-y-1 text-sm sh-subtext">
        <li>
          <span className="font-medium text-emerald-700 dark:text-emerald-400">
            {result.imported.length} imported
          </span>
          {" · "}
          <span className="font-medium text-amber-700 dark:text-amber-400">
            {result.skipped_duplicates.length} skipped (duplicate dates)
          </span>
          {" · "}
          <span className="font-medium text-rose-700 dark:text-rose-400">
            {result.failed.length} failed
          </span>
        </li>
      </ul>

      {result.skipped_duplicates.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs sh-label dark:border-slate-700">
          {result.skipped_duplicates.map((item) => (
            <li key={`${item.filename}-${item.report_date}`}>
              Skipped <span className="font-medium">{item.filename}</span> — {item.report_date} (
              {item.reason})
            </li>
          ))}
        </ul>
      )}

      {result.failed.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs text-rose-700 dark:border-slate-700 dark:text-rose-300">
          {result.failed.map((item) => (
            <li key={item.filename}>
              Failed {item.filename}: {item.error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
