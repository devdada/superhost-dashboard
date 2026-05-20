const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type PortfolioVariancePoint = {
  report_id: number;
  report_date: string;
  file_name: string;
  average_variance_percent: number;
};

export type HotelVariancePoint = {
  report_date: string;
  variance_percent: number;
};

export type HotelTrendSeries = {
  hotel_name: string;
  points: HotelVariancePoint[];
};

export type HotelRanking = {
  hotel_name: string;
  report_count: number;
  average_variance_percent: number;
};

export type PersistentRisk = {
  hotel_name: string;
  consecutive_misses: number;
  message: string;
};

export type TrendMover = {
  hotel_name: string;
  report_count: number;
  first_variance_percent: number;
  latest_variance_percent: number;
  change_points: number;
  message: string;
};

export type HistoricalTrends = {
  total_reports: number;
  portfolio_variance_trend: PortfolioVariancePoint[];
  top_performers: HotelRanking[];
  worst_performers: HotelRanking[];
  hotel_variance_series: HotelTrendSeries[];
  persistent_risks: PersistentRisk[];
  improving_properties: TrendMover[];
  declining_properties: TrendMover[];
};

export async function fetchHistoricalTrends(): Promise<HistoricalTrends> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${API_BASE}/trends`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to load trends (${response.status})`);
    }
    return response.json();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `Cannot reach API at ${API_BASE}. Is the backend running on the same port as NEXT_PUBLIC_API_URL?`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function formatReportDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
