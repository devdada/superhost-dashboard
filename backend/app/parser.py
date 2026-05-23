"""Extract Daily Flash tables from a Superhost portfolio PDF."""

from __future__ import annotations

import re
from datetime import date, datetime
from pathlib import Path

import pdfplumber

from app.models import FlashMetricRow

# PTD block column indices (Primary Forecast AMT, Budget AMT, Budget variance %Change)
PTD_FORECAST_COL = 3
PTD_BUDGET_COL = 10
PTD_VARIANCE_PCT_COL = 13

DATA_START_ROW = 4
SKIP_NAMES = frozenset({"total", "superhost hospitality"})
MAX_INGEST_PAGES = 6


def _parse_number(value: str | None) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text in {"-", "—"}:
        return None
    text = text.replace(",", "").replace("$", "").replace("%", "")
    if text.startswith("(") and text.endswith(")"):
        text = f"-{text[1:-1]}"
    try:
        return float(text)
    except ValueError:
        return None


def _metric_from_title(title_cell: str | None) -> str:
    if not title_cell:
        return "Revenue"
    text = str(title_cell).upper()
    match = re.search(
        r"-\s*Superhost Portfolio \(Current\)\s*-\s*(.+)$",
        str(title_cell),
        re.IGNORECASE,
    )
    label = match.group(1).strip().upper() if match else text

    if "OPERATING REVENUE" in label or (
        "REVENUE" in label and "ROOM" not in label and "F&B" not in label
    ):
        return "Revenue"
    if "ROOMS REVENUE" in label or "ROOM REVENUE" in label:
        return "Room Revenue"
    if "OCCUPANCY" in label:
        return "Occupancy"
    if "REV PAR" in label or "REVPAR" in label:
        return "RevPAR"
    if "TOTAL F&B" in label and "EMBASSY" not in label:
        return "F&B"
    if re.search(r"\bADR\b", label):
        return "ADR"
    if "revenue" in str(title_cell).lower():
        return "Revenue"
    return "Revenue"


def _is_hotel_row(row: list) -> bool:
    if not row or not row[0]:
        return False
    name = str(row[0]).strip()
    if not name or name.lower() in SKIP_NAMES:
        return False
    return True


def _parse_report_date(table: list[list]) -> date:
    """Read report date from row 1 (e.g. 'May 18, 2026')."""
    if len(table) > 1 and table[1]:
        for cell in table[1][:4]:
            if not cell:
                continue
            text = str(cell).strip()
            for fmt in ("%B %d, %Y", "%b %d, %Y", "%m/%d/%Y"):
                try:
                    return datetime.strptime(text, fmt).date()
                except ValueError:
                    continue
    return date.today()


def _extract_rows_from_table(table: list[list], metric: str) -> list[FlashMetricRow]:
    rows: list[FlashMetricRow] = []
    for raw in table[DATA_START_ROW:]:
        if not _is_hotel_row(raw):
            continue

        hotel = str(raw[0]).strip()
        forecast = _parse_number(raw[PTD_FORECAST_COL] if len(raw) > PTD_FORECAST_COL else None)
        budget = _parse_number(raw[PTD_BUDGET_COL] if len(raw) > PTD_BUDGET_COL else None)
        variance_pct = _parse_number(
            raw[PTD_VARIANCE_PCT_COL] if len(raw) > PTD_VARIANCE_PCT_COL else None
        )

        if forecast is None or budget is None or variance_pct is None:
            continue

        rows.append(
            FlashMetricRow(
                hotel=hotel,
                metric=metric,
                forecast=forecast,
                budget=budget,
                variance_percent=variance_pct,
            )
        )
    return rows


def extract_flash_report(pdf_path: Path) -> tuple[date, list[FlashMetricRow]]:
    """Parse pages 1–6: Revenue, Room Revenue, Occupancy, ADR, RevPAR, F&B."""
    all_rows: list[FlashMetricRow] = []
    report_date: date | None = None

    with pdfplumber.open(pdf_path) as pdf:
        if not pdf.pages:
            raise ValueError("PDF has no pages")

        page_count = min(MAX_INGEST_PAGES, len(pdf.pages))
        for page_idx in range(page_count):
            tables = pdf.pages[page_idx].extract_tables()
            if not tables or not tables[0]:
                continue

            table = tables[0]
            title_cell = table[0][1] if len(table[0]) > 1 else None
            metric = _metric_from_title(title_cell)

            if report_date is None:
                report_date = _parse_report_date(table)

            all_rows.extend(_extract_rows_from_table(table, metric))

    if not all_rows:
        raise ValueError("Could not parse any hotel rows from the PDF table")

    return report_date or date.today(), all_rows


def extract_flash_table(pdf_path: Path) -> tuple[str, date, list[FlashMetricRow]]:
    """Backward-compatible wrapper returning primary metric label."""
    report_date, rows = extract_flash_report(pdf_path)
    metrics = sorted({row.metric for row in rows})
    primary = metrics[0] if metrics else "Revenue"
    return primary, report_date, rows
