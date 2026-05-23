"use client";

import type { DashboardMetric } from "@/lib/dashboard-filters";

type Props = {
  selectedMetric: DashboardMetric;
  storedMetrics: string[];
};

export function DataCoverageBanner({ selectedMetric, storedMetrics }: Props) {
  const hasSelection = storedMetrics.some(
    (m) => m.toLowerCase() === selectedMetric.toLowerCase(),
  );

  if (storedMetrics.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        No reports in the database yet. Upload Daily Flash PDFs below.
      </p>
    );
  }

  if (hasSelection) {
    const onlyRevenue =
      storedMetrics.length === 1 && storedMetrics[0].toLowerCase() === "revenue";
    if (!onlyRevenue) {
      return null;
    }
    return (
      <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
        Database has <strong>Revenue only</strong> from older uploads. To enable Room Revenue,
        Occupancy, ADR, and RevPAR, re-upload PDFs with{" "}
        <strong>Replace existing dates</strong> checked below.
      </p>
    );
  }

  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <strong>{selectedMetric}</strong> is not in your database yet. Stored metrics:{" "}
      <strong>{storedMetrics.join(", ")}</strong>. Select <strong>Revenue</strong> to view
      existing data, or re-upload PDFs with <strong>Replace existing dates</strong> to import all
      five metrics per file.
    </p>
  );
}
