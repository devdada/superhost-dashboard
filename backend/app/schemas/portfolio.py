from datetime import date

from pydantic import BaseModel

from app.models import FlashMetricRow


class PortfolioOperationalResponse(BaseModel):
    total_reports: int
    period: str
    range_start: date | None
    range_end: date | None
    metric: str
    available_metrics: list[str]
    latest_report_id: int | None
    latest_report_date: date | None
    latest_filename: str | None
    rows: list[FlashMetricRow]
