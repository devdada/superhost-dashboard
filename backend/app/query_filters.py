"""Shared metric and date-range filters for dashboard APIs."""

from __future__ import annotations

from datetime import date, timedelta

SUPPORTED_METRICS: tuple[str, ...] = (
    "Revenue",
    "Room Revenue",
    "Occupancy",
    "ADR",
    "RevPAR",
    "F&B",
)

DEFAULT_METRIC = "Revenue"
DEFAULT_PERIOD = "all"

# Daily flash reports are uploaded for the prior calendar day — anchor ranges on that date.
REPORT_LAG_DAYS = 1

PERIOD_CHOICES: tuple[str, ...] = ("7d", "30d", "mtd", "ytd", "all")


def normalize_metric(metric: str | None) -> str:
    if not metric:
        return DEFAULT_METRIC
    cleaned = metric.strip()
    for supported in SUPPORTED_METRICS:
        if cleaned.lower() == supported.lower():
            return supported
    return cleaned


def normalize_period(period: str | None) -> str:
    if not period:
        return DEFAULT_PERIOD
    cleaned = period.strip().lower()
    legacy = {
        "today": "7d",
        "yesterday": "7d",
        "week": "7d",
        "month": "mtd",
    }
    cleaned = legacy.get(cleaned, cleaned)
    return cleaned if cleaned in PERIOD_CHOICES else DEFAULT_PERIOD


def reporting_as_of(reference: date | None = None) -> date:
    """Latest calendar date a daily flash report represents (always prior day)."""
    return (reference or date.today()) - timedelta(days=REPORT_LAG_DAYS)


def parse_date_param(value: str | None) -> date | None:
    if not value or not str(value).strip():
        return None
    try:
        return date.fromisoformat(str(value).strip()[:10])
    except ValueError:
        return None


def resolve_filter_range(
    period: str | None,
    *,
    reference: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[str, date | None, date | None]:
    """Return (period_label, inclusive start, inclusive end). Custom dates override presets."""
    if start_date is not None:
        end = end_date if end_date is not None else start_date
        if end < start_date:
            start_date, end = end, start_date
        return "custom", start_date, end

    period_name = normalize_period(period)
    return period_name, *resolve_period_range(period_name, reference=reference)


def resolve_period_range(
    period: str,
    *,
    reference: date | None = None,
) -> tuple[date | None, date | None]:
    """Return inclusive (start, end) for the period, or (None, None) for all time."""
    as_of = reporting_as_of(reference)
    period = normalize_period(period)

    if period == "all":
        return None, None
    if period == "7d":
        return as_of - timedelta(days=6), as_of
    if period == "30d":
        return as_of - timedelta(days=29), as_of
    if period == "mtd":
        return as_of.replace(day=1), as_of
    if period == "ytd":
        return as_of.replace(month=1, day=1), as_of
    return None, None
