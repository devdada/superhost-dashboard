import type { ExecutiveRecommendation } from "@/lib/executive";
import { apiFetch } from "@/lib/auth";

export type TrendPoint = {
  report_date: string;
  report_id: number;
  forecast: number;
  budget: number;
  variance_percent: number;
};

export type PlaceholderTrend = {
  label: string;
  message: string;
  available: boolean;
};

export type RiskDriver = {
  code: string;
  label: string;
  description: string;
  severity: string;
};

export type BenchmarkRow = {
  label: string;
  property_value: number;
  portfolio_average: number;
  top_performer_name: string;
  top_performer_value: number;
  worst_performer_name: string;
  worst_performer_value: number;
  unit: "percent" | "currency" | string;
};

export type PropertyIntelligence = {
  hotel_name: string;
  metric: string;
  risk_status: string;
  risk_status_label: string;
  portfolio_rank: number;
  portfolio_total: number;
  consecutive_misses: number;
  consecutive_wins: number;
  operational_summary: string;
  health_score: number;
  health_label: string;
  variance_trend: TrendPoint[];
  revenue_trend: TrendPoint[];
  occupancy_trend: PlaceholderTrend;
  revpar_trend: PlaceholderTrend;
  risk_drivers: RiskDriver[];
  recommendations: ExecutiveRecommendation[];
  benchmarks: BenchmarkRow[];
};

export function hotelToSlug(hotelName: string): string {
  return encodeURIComponent(hotelName);
}

export function slugToHotel(slug: string): string {
  return decodeURIComponent(slug);
}

export function propertyPath(hotelName: string): string {
  return `/properties/${hotelToSlug(hotelName)}`;
}

export async function fetchPropertyIntelligence(
  hotelSlug: string,
): Promise<PropertyIntelligence> {
  const response = await apiFetch(`/properties/${hotelSlug}`, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.detail ?? `Property not found (${response.status})`;
    throw new Error(typeof detail === "string" ? detail : "Property not found");
  }
  return response.json();
}

export const RISK_STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  critical: {
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    dot: "bg-rose-500",
  },
  watch: {
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  elevated: {
    badge: "bg-orange-100 text-orange-900 dark:bg-orange-900/50 dark:text-orange-200",
    dot: "bg-orange-500",
  },
  healthy: {
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    dot: "bg-slate-400",
  },
  outperforming: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
    dot: "bg-emerald-500",
  },
  unknown: {
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};
