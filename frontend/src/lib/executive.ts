const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type OperationalCategory = "Revenue" | "Occupancy" | "ADR" | "RevPAR";
export type PriorityLevel = "critical" | "high" | "medium" | "low";
export type RiskSeverity = "critical" | "high" | "moderate" | "low";
export type TriggerType =
  | "critical_risk"
  | "persistent_risk"
  | "declining_property"
  | "strong_performer";

export type ActionChecklistItem = {
  id: string;
  label: string;
};

export type ExecutiveRecommendation = {
  hotel_name: string;
  trigger_type: TriggerType;
  issue_summary: string;
  operational_categories: OperationalCategory[];
  priority: PriorityLevel;
  suggested_owner: string;
  risk_severity: RiskSeverity;
  recommended_actions: string[];
  action_checklist: ActionChecklistItem[];
  variance_percent?: number | null;
  consecutive_misses?: number | null;
};

export type PortfolioExecutiveSummary = {
  biggest_portfolio_risk: string;
  strongest_performer: string;
  emerging_concern: string;
  portfolio_health_score: number;
  health_label: string;
  health_narrative: string;
};

export type ExecutiveIntelligence = {
  report_id: number | null;
  report_date: string | null;
  metric: string | null;
  executive_summary: PortfolioExecutiveSummary;
  recommendations: ExecutiveRecommendation[];
};

export async function fetchExecutiveIntelligence(): Promise<ExecutiveIntelligence> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${API_BASE}/executive-intelligence`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to load executive intelligence (${response.status})`);
    }
    return response.json();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Cannot reach API at ${API_BASE}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function healthScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-rose-600 dark:text-rose-400";
}

export function healthScoreRing(score: number): string {
  if (score >= 80) return "stroke-emerald-500";
  if (score >= 60) return "stroke-amber-500";
  if (score >= 40) return "stroke-orange-500";
  return "stroke-rose-500";
}

export const PRIORITY_STYLES: Record<
  PriorityLevel,
  { badge: string; border: string; label: string }
> = {
  critical: {
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    border: "border-rose-200 dark:border-rose-800",
    label: "Critical",
  },
  high: {
    badge: "bg-orange-100 text-orange-900 dark:bg-orange-900/50 dark:text-orange-200",
    border: "border-orange-200 dark:border-orange-800",
    label: "High",
  },
  medium: {
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200",
    border: "border-amber-200 dark:border-amber-800",
    label: "Medium",
  },
  low: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
    border: "border-emerald-200 dark:border-emerald-800",
    label: "Low",
  },
};

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  critical_risk: "Critical risk",
  persistent_risk: "Persistent risk",
  declining_property: "Declining trend",
  strong_performer: "Best practice opportunity",
};
