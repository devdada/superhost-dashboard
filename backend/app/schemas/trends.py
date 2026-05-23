from datetime import date

from pydantic import BaseModel, Field


class PortfolioVariancePoint(BaseModel):
    report_id: int
    report_date: str
    file_name: str
    average_variance_percent: float


class HotelVariancePoint(BaseModel):
    report_date: str
    variance_percent: float


class HotelTrendSeries(BaseModel):
    hotel_name: str
    points: list[HotelVariancePoint]


class HotelRanking(BaseModel):
    hotel_name: str
    report_count: int
    average_variance_percent: float


class PersistentRisk(BaseModel):
    hotel_name: str
    consecutive_misses: int
    message: str


class TrendMover(BaseModel):
    hotel_name: str
    report_count: int
    first_variance_percent: float
    latest_variance_percent: float
    change_points: float
    message: str


class HistoricalTrendsResponse(BaseModel):
    total_reports: int
    period: str
    range_start: date | None
    range_end: date | None
    metric: str
    portfolio_variance_trend: list[PortfolioVariancePoint]
    top_performers: list[HotelRanking]
    worst_performers: list[HotelRanking]
    hotel_variance_series: list[HotelTrendSeries] = Field(
        description="Variance lines for selected hotels (charts)"
    )
    persistent_risks: list[PersistentRisk]
    improving_properties: list[TrendMover]
    declining_properties: list[TrendMover]
