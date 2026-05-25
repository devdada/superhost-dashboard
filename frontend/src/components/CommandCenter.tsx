"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardFiltersBar } from "@/components/filters/DashboardFilters";
import { DataCoverageBanner } from "@/components/filters/DataCoverageBanner";
import { PortfolioOperationalSection } from "@/components/insights/PortfolioOperationalSection";
import { HistoricalTrendsSection } from "@/components/trends/HistoricalTrends";
import { UploadPanel } from "@/components/UploadPanel";
import { apiFetch } from "@/lib/auth";
import {
  DEFAULT_METRIC,
  DEFAULT_PERIOD,
  type DashboardFilters,
} from "@/lib/dashboard-filters";

export function CommandCenter() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [storedMetrics, setStoredMetrics] = useState<string[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>({
    metric: DEFAULT_METRIC,
    period: DEFAULT_PERIOD,
  });

  const loadStoredMetrics = useCallback(async () => {
    try {
      const response = await apiFetch("/filters/options", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const stored: string[] = data.stored_metrics ?? [];
      setStoredMetrics(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadStoredMetrics();
  }, [loadStoredMetrics, refreshKey]);

  const onUploadSuccess = () => setRefreshKey((k) => k + 1);

  const onMetricsLoaded = useCallback((available: string[]) => {
    setStoredMetrics(available);
  }, []);

  return (
    <div className="space-y-6">
      <DashboardFiltersBar value={filters} onChange={setFilters} />
      <DataCoverageBanner selectedMetric={filters.metric} storedMetrics={storedMetrics} />
      <PortfolioOperationalSection
        refreshKey={refreshKey}
        filters={filters}
        onMetricsLoaded={onMetricsLoaded}
      />
      <HistoricalTrendsSection refreshKey={refreshKey} filters={filters} />
      <UploadPanel onUploadSuccess={onUploadSuccess} />
    </div>
  );
}
