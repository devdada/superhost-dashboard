from datetime import date

from pydantic import BaseModel

from app.models import FlashMetricRow


class PortfolioOperationalResponse(BaseModel):
    total_reports: int
    latest_report_id: int | None
    latest_report_date: date | None
    latest_filename: str | None
    metric: str | None
    rows: list[FlashMetricRow]
