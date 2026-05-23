/** Executive-grade number formatting for operational dashboards. */

export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatLevelPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatVariancePercent(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

export function formatExecutiveCurrencyDelta(delta: number | null | undefined): string | null {
  if (delta == null || !Number.isFinite(delta) || Math.abs(delta) < 1) return null;
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  return `${arrow} ${formatCurrency(Math.abs(delta))}`;
}

export function formatPointsDelta(
  delta: number | null | undefined,
  label = "prior period",
): string | null {
  if (delta == null || !Number.isFinite(delta)) return null;
  if (Math.abs(delta) < 0.05) return `→ flat vs ${label}`;
  const arrow = delta > 0 ? "↑" : "↓";
  const signed = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  return `${arrow} ${signed} pts vs ${label}`;
}

export function formatKpiDelta(
  unit: string,
  delta: number | null | undefined,
  deltaDisplay?: string | null,
): string | null {
  if (deltaDisplay) return deltaDisplay;
  if (delta == null || !Number.isFinite(delta)) return null;
  if (unit === "currency") return formatExecutiveCurrencyDelta(delta);
  if (unit === "level_percent") return formatPointsDelta(delta);
  if (unit === "variance_percent") return formatPointsDelta(delta, "start of period");
  return null;
}
