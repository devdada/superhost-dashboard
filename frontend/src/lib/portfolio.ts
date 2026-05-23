import type { DashboardFilters } from "@/lib/dashboard-filters";
import { buildFilterQuery } from "@/lib/dashboard-filters";
import type { FlashMetricRow } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  const response = await fetch(`${API_BASE}/portfolio/operational?${qs}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load portfolio operational data");
  }
  return response.json();
}
