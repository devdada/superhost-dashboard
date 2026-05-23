"""Defensive checks for operational insights and alerts."""

from __future__ import annotations

import math

# Metrics suitable for ownership alerts (exclude noisy F&B unless fully valid).
ALERT_METRICS: frozenset[str] = frozenset({"Revenue", "Occupancy", "ADR", "RevPAR"})

MAX_REASONABLE_VARIANCE = 150.0
MIN_ALERT_CONFIDENCE = 0.65
MIN_FORECAST_ACCURACY_REPORTS = 5


def is_finite_number(value: float | None) -> bool:
    return value is not None and math.isfinite(value)


def is_valid_metric_row(row) -> bool:
    if row is None:
        return False
    actual = getattr(row, "forecast", None)
    budget = getattr(row, "budget", None)
    if not is_finite_number(actual) or not is_finite_number(budget):
        return False
    if abs(budget) < 1e-6 and abs(actual) < 1e-6:
        return False
    return True


def is_valid_variance(variance: float | None) -> bool:
    if not is_finite_number(variance):
        return False
    if abs(variance) > MAX_REASONABLE_VARIANCE:
        return False
    return True


def safe_incremental_variance(delta_actual: float, delta_budget: float) -> float | None:
    if not math.isfinite(delta_actual) or not math.isfinite(delta_budget):
        return None
    if abs(delta_budget) < 1e-6:
        return None
    variance = (delta_actual / delta_budget - 1) * 100
    return variance if is_valid_variance(variance) else None


def alert_confidence(
    *,
    metric: str,
    row,
    reports_in_period: int,
) -> float:
    score = 0.0
    if metric in ALERT_METRICS:
        score += 0.2
    if is_valid_metric_row(row):
        score += 0.4
    if is_valid_variance(getattr(row, "variance_percent", None)):
        score += 0.25
    if reports_in_period >= 2:
        score += 0.15
    return min(1.0, score)


def passes_alert_threshold(confidence: float) -> bool:
    return confidence >= MIN_ALERT_CONFIDENCE


def forecast_accuracy_is_meaningful(
    *,
    reports_in_period: int,
    revenue_variance: float | None,
) -> bool:
    if reports_in_period < MIN_FORECAST_ACCURACY_REPORTS:
        return False
    if not is_finite_number(revenue_variance):
        return False
    if abs(revenue_variance) < 0.5:
        return False
    accuracy = 100.0 - abs(revenue_variance)
    if accuracy >= 99.5 and reports_in_period < 10:
        return False
    return True
