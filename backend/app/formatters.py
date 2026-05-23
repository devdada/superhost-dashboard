"""Executive-grade number formatting for dashboard surfaces."""

from __future__ import annotations

import math


def fmt_currency(value: float) -> str:
    abs_v = abs(value)
    if abs_v >= 1_000_000:
        return f"${value / 1_000_000:.2f}M"
    if abs_v >= 1_000:
        return f"${value / 1_000:.0f}K"
    return f"${value:,.0f}"


def fmt_level_percent(value: float) -> str:
    """Occupancy-style level (not signed variance)."""
    return f"{value:.1f}%"


def fmt_variance_percent(value: float) -> str:
    prefix = "+" if value > 0 else ""
    return f"{prefix}{value:.1f}%"


def fmt_executive_currency_delta(delta: float | None) -> str | None:
    if delta is None or not math.isfinite(delta):
        return None
    if abs(delta) < 1:
        return None
    arrow = "↑" if delta > 0 else "↓" if delta < 0 else "→"
    return f"{arrow} {fmt_currency(abs(delta))}"


def fmt_points_delta(delta: float | None, *, label: str = "prior period") -> str | None:
    if delta is None or not math.isfinite(delta):
        return None
    if abs(delta) < 0.05:
        return f"→ flat vs {label}"
    arrow = "↑" if delta > 0 else "↓"
    signed = f"+{delta:.1f}" if delta > 0 else f"{delta:.1f}"
    return f"{arrow} {signed} pts vs {label}"
