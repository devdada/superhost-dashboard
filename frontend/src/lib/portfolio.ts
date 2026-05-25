import type { DashboardFilters } from "@/lib/dashboard-filters";
import { buildFilterQuery } from "@/lib/dashboard-filters";
import { apiFetch } from "@/lib/auth";
import type { FlashMetricRow } from "@/lib/api";

export type PortfolioOperational = {
  total_reports: number;
  period: string;
  range_start: string | null;
  range_end: string | null;
  metric: string;
  available_metrics: string[];
  latest_report_id: number | null;
  latest_report_date: string | null;
  latest_filename: string | null;
  rows: FlashMetricRow[];
};

export async function fetchPortfolioOperational(
  filters: DashboardFilters,
): Promise<PortfolioOperational> {
  const qs = buildFilterQuery(filters);
  const response = await apiFetch(`/portfolio/operational?${qs}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load portfolio operational data");
  }
  return response.json();
}
