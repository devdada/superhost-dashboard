"""Normalize parser output into hotel_metrics rows."""

from __future__ import annotations

from dataclasses import dataclass

from app.models import FlashMetricRow
from app.parser import extract_flash_report


@dataclass
class ParseOutcome:
    report_date: object
    rows: list[FlashMetricRow]
    metrics_stored: int
    hotels_count: int
    parse_confidence: float
    warnings: list[str]


def compute_parse_confidence(rows: list[FlashMetricRow]) -> float:
    if not rows:
        return 0.0
    metrics = {r.metric for r in rows}
    core = {"Revenue", "Occupancy", "ADR", "RevPAR"}
    coverage = len(metrics & core) / len(core)
    hotels = len({r.hotel for r in rows})
    hotel_factor = min(1.0, hotels / 10.0) if hotels else 0.0
    return round(min(1.0, 0.55 * coverage + 0.45 * hotel_factor), 2)


def parse_pdf_file(pdf_path) -> ParseOutcome:
    warnings: list[str] = []
    report_date, rows = extract_flash_report(pdf_path)
    if not rows:
        warnings.append("No metric rows extracted from PDF")
    confidence = compute_parse_confidence(rows)
    hotels = len({r.hotel for r in rows})
    return ParseOutcome(
        report_date=report_date,
        rows=rows,
        metrics_stored=len(rows),
        hotels_count=hotels,
        parse_confidence=confidence,
        warnings=warnings,
    )
