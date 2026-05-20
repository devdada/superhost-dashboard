from datetime import date

from pydantic import BaseModel, Field


class FlashMetricRow(BaseModel):
    hotel: str
    metric: str
    forecast: float
    budget: float
    variance_percent: float = Field(description="Budget variance as percent change")


class UploadResponse(BaseModel):
    report_id: int
    report_date: date
    filename: str
    metric: str
    rows: list[FlashMetricRow]
