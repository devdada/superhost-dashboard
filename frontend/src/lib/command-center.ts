import type { DashboardPeriod } from "@/lib/dashboard-filters";
import { apiFetch } from "@/lib/auth";

export type KpiSparklinePoint = { report_date: string; value: number };

export type ExecutiveKpiCard = {
  id: string;
  label: string;
  value: string;
  raw_value: number | null;
  unit: string;
  delta: number | null;
  delta_display: string | null;
  delta_label: string | null;
  trend: KpiSparklinePoint[];
  direction: string | null;
};

export type ActionAlert = {
  id: string;
  severity: "critical" | "watch" | "strong";
  hotel_name: string;
  metric: string;
  variance_percent: number;
  confidence: number;
  headline: string;
  explanation: string;
  recommended_action: string;
};

export type HeatmapRow = {
  hotel_name: string;
  revenue: number | null;
  occupancy: number | null;
  adr: number | null;
  revpar: number | null;
  fnb_variance: number | null;
  variance_vs_budget: number | null;
  variance_vs_forecast: number | null;
  status_score: number;
  status: string;
};

export type RevenueTrendPoint = {
  report_date: string;
  actual: number;
  budget: number;
  forecast: number;
};

export type RevparTrendPoint = {
  report_date: string;
  current: number;
  budget: number;
  prior_period: number | null;
};

export type OccupancyAdrBubble = {
  hotel_name: string;
  occupancy: number;
  adr: number;
  revenue: number;
  variance_percent: number;
};

export type PerformerCard = {
  rank: number;
  hotel_name: string;
  revpar: number | null;
  revenue_variance: number | null;
  revpar_change: number | null;
  badge: string;
  trend_direction: string | null;
  sparkline: number[];
};

export type CommandCenterData = {
  period: string;
  range_start: string | null;
  range_end: string | null;
  reports_in_period: number;
  latest_report_date: string | null;
  prior_report_date: string | null;
  available_properties: string[];
  selected_properties: string[];
  available_report_dates: string[];
  stored_metrics: string[];
  kpis: ExecutiveKpiCard[];
  action_alerts: ActionAlert[];
  heatmap: HeatmapRow[];
  revenue_trend: RevenueTrendPoint[];
  revpar_trend: RevparTrendPoint[];
  occupancy_adr_scatter: OccupancyAdrBubble[];
  top_performers: PerformerCard[];
  worst_performers: PerformerCard[];
};

export type CommandCenterQuery = {
  period: DashboardPeriod;
  properties?: string[];
  startDate?: string | null;
  endDate?: string | null;
};

export async function fetchCommandCenter(
  period: DashboardPeriod,
  properties?: string[],
  dates?: { startDate?: string | null; endDate?: string | null },
): Promise<CommandCenterData> {
  const params = new URLSearchParams({ period });
  if (dates?.startDate) {
    params.set("start_date", dates.startDate);
    if (dates.endDate && dates.endDate !== dates.startDate) {
      params.set("end_date", dates.endDate);
    }
  }
  if (properties && properties.length > 0) {
    for (const name of properties) {
      params.append("properties", name);
    }
  }
  const response = await apiFetch(`/dashboard/command-center?${params}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load analytics");
  }
  return response.json();
}
