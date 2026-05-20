import type { FlashMetricRow } from "@/lib/api";

export type InsightCategory = "critical_risk" | "strong_performer" | "watch_list";

export type HotelInsight = {
  hotel: string;
  metric: string;
  forecast: number;
  budget: number;
  variance_percent: number;
  category: InsightCategory;
  message: string;
};

export type PortfolioSummary = {
  totalHotels: number;
  positiveVarianceCount: number;
  negativeVarianceCount: number;
  averageVariancePercent: number;
};

export type PortfolioAnalytics = {
  summary: PortfolioSummary;
  criticalRisks: HotelInsight[];
  strongPerformers: HotelInsight[];
  watchList: HotelInsight[];
};

const CRITICAL_THRESHOLD = -10;
const STRONG_THRESHOLD = 10;
const WATCH_LOW = -10;
const WATCH_HIGH = -5;

function formatPercent(value: number): string {
  return `${Math.abs(value).toFixed(1)}%`;
}

export function getInsightCategory(variancePercent: number): InsightCategory | null {
  if (variancePercent <= CRITICAL_THRESHOLD) {
    return "critical_risk";
  }
  if (variancePercent >= STRONG_THRESHOLD) {
    return "strong_performer";
  }
  if (variancePercent >= WATCH_LOW && variancePercent <= WATCH_HIGH) {
    return "watch_list";
  }
  return null;
}

function buildInsightMessage(row: FlashMetricRow, category: InsightCategory): string {
  const pct = formatPercent(row.variance_percent);

  switch (category) {
    case "critical_risk":
      return `${row.hotel} is underperforming budget by ${pct} — critical risk requiring immediate review.`;
    case "strong_performer":
      return `${row.hotel} is outperforming budget by ${pct}.`;
    case "watch_list":
      return `${row.hotel} is underperforming budget by ${pct} — on watch list for operational follow-up.`;
  }
}

function toInsight(row: FlashMetricRow, category: InsightCategory): HotelInsight {
  return {
    hotel: row.hotel,
    metric: row.metric,
    forecast: row.forecast,
    budget: row.budget,
    variance_percent: row.variance_percent,
    category,
    message: buildInsightMessage(row, category),
  };
}

function computeSummary(rows: FlashMetricRow[]): PortfolioSummary {
  const totalHotels = rows.length;
  const positiveVarianceCount = rows.filter((r) => r.variance_percent > 0).length;
  const negativeVarianceCount = rows.filter((r) => r.variance_percent < 0).length;
  const averageVariancePercent =
    totalHotels === 0
      ? 0
      : rows.reduce((sum, r) => sum + r.variance_percent, 0) / totalHotels;

  return {
    totalHotels,
    positiveVarianceCount,
    negativeVarianceCount,
    averageVariancePercent,
  };
}

/**
 * Deterministic portfolio analytics from parsed Daily Flash rows.
 * Rules: critical ≤ -10%, strong ≥ +10%, watch -10% to -5% (inclusive).
 */
export function analyzePortfolio(rows: FlashMetricRow[]): PortfolioAnalytics {
  const criticalRisks: HotelInsight[] = [];
  const strongPerformers: HotelInsight[] = [];
  const watchList: HotelInsight[] = [];

  for (const row of rows) {
    const category = getInsightCategory(row.variance_percent);
    if (!category) continue;

    const insight = toInsight(row, category);
    if (category === "critical_risk") criticalRisks.push(insight);
    else if (category === "strong_performer") strongPerformers.push(insight);
    else watchList.push(insight);
  }

  criticalRisks.sort((a, b) => a.variance_percent - b.variance_percent);
  watchList.sort((a, b) => a.variance_percent - b.variance_percent);
  strongPerformers.sort((a, b) => b.variance_percent - a.variance_percent);

  return {
    summary: computeSummary(rows),
    criticalRisks,
    strongPerformers,
    watchList,
  };
}
