export const DASHBOARD_METRICS = [
  "Revenue",
  "Room Revenue",
  "Occupancy",
  "ADR",
  "RevPAR",
] as const;

export type DashboardMetric = (typeof DASHBOARD_METRICS)[number];

/** Segmented timeline controls (maps to API period ids). */
export const DASHBOARD_PERIODS = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "mtd", label: "MTD" },
  { id: "ytd", label: "YTD" },
  { id: "all", label: "All" },
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]["id"];

export const DEFAULT_METRIC: DashboardMetric = "Revenue";
export const DEFAULT_PERIOD: DashboardPeriod = "7d";

export type DashboardFilters = {
  metric: DashboardMetric;
  period: DashboardPeriod;
};

export function buildFilterQuery(filters: DashboardFilters): string {
  const params = new URLSearchParams({
    metric: filters.metric,
    period: filters.period,
  });
  return params.toString();
}

const fmtIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export function formatPeriodRange(
  period: DashboardPeriod | string,
  rangeStart: string | null,
  rangeEnd: string | null,
  options?: { customActive?: boolean },
): string {
  if (options?.customActive && rangeStart) {
    if (!rangeEnd || rangeStart === rangeEnd) {
      return fmtIso(rangeStart);
    }
    return `${fmtIso(rangeStart)} – ${fmtIso(rangeEnd)}`;
  }

  const preset = DASHBOARD_PERIODS.find((p) => p.id === period)?.label ?? period;
  if (!rangeStart || !rangeEnd) {
    return preset;
  }
  if (rangeStart === rangeEnd) {
    return `${preset} · ${fmtIso(rangeStart)}`;
  }
  return `${preset} · ${fmtIso(rangeStart)} – ${fmtIso(rangeEnd)}`;
}
