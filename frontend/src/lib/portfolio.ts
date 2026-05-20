import type { FlashMetricRow } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type PortfolioOperational = {
  total_reports: number;
  latest_report_id: number | null;
  latest_report_date: string | null;
  latest_filename: string | null;
  metric: string | null;
  rows: FlashMetricRow[];
};

export async function fetchPortfolioOperational(): Promise<PortfolioOperational> {
  const response = await fetch(`${API_BASE}/portfolio/operational`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load portfolio operational data");
  }
  return response.json();
}
