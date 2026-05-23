"""Report inventory and parse completeness for the Reports page."""

from __future__ import annotations

from collections import Counter

from sqlalchemy.orm import Session

from app.repositories.report_repository import list_reports_chronological
from app.schemas.reports import CORE_METRICS, ReportInventoryItem, ReportInventoryResponse


def _assess_parse(
    metric_counts: dict[str, int],
) -> tuple[str, str, bool]:
    present = [m for m in CORE_METRICS if metric_counts.get(m, 0) > 0]
    if not present:
        return "empty", "No metrics parsed", False

    if len(present) < len(CORE_METRICS):
        if present == ["Revenue"]:
            return (
                "revenue_only",
                "Revenue only — re-import with Replace existing dates",
                False,
            )
        return (
            "partial",
            f"{len(present)} of {len(CORE_METRICS)} core metrics",
            False,
        )

    counts = [metric_counts[m] for m in CORE_METRICS]
    if min(counts) != max(counts):
        return (
            "partial",
            f"Uneven hotel counts ({min(counts)}–{max(counts)} per metric)",
            False,
        )

    return ("full", "Full parse (5 metrics)", True)


def build_reports_inventory(session: Session) -> ReportInventoryResponse:
    reports = list_reports_chronological(session)
    items: list[ReportInventoryItem] = []
    full_count = 0

    for report in reversed(reports):
        metric_counts: dict[str, int] = dict(Counter(m.metric for m in report.metrics))
        hotels = {m.hotel_name for m in report.metrics}
        status, label, is_complete = _assess_parse(metric_counts)
        if is_complete:
            full_count += 1

        items.append(
            ReportInventoryItem(
                report_id=report.id,
                report_date=report.report_date,
                file_name=report.file_name,
                uploaded_at=report.uploaded_at,
                hotel_count=len(hotels),
                metrics_present=sorted(metric_counts.keys()),
                metric_row_counts=metric_counts,
                parse_status=status,
                parse_label=label,
                is_complete=is_complete,
            )
        )

    return ReportInventoryResponse(
        total=len(items),
        full_parse_count=full_count,
        reports=items,
    )
