from pydantic import BaseModel, Field

from app.schemas.recommendations import ExecutiveRecommendation


class TrendPoint(BaseModel):
    report_date: str
    report_id: int
    forecast: float
    budget: float
    variance_percent: float


class PlaceholderTrend(BaseModel):
    label: str
    message: str
    available: bool = False


class RiskDriver(BaseModel):
    code: str
    label: str
    description: str
    severity: str


class BenchmarkRow(BaseModel):
    label: str
    property_value: float
    portfolio_average: float
    top_performer_name: str
    top_performer_value: float
    worst_performer_name: str
    worst_performer_value: float
    unit: str = "percent"


class PropertyIntelligenceResponse(BaseModel):
    hotel_name: str
    metric: str
    risk_status: str
    risk_status_label: str
    portfolio_rank: int
    portfolio_total: int
    consecutive_misses: int
    consecutive_wins: int
    operational_summary: str
    health_score: int = Field(ge=0, le=100)
    health_label: str
    variance_trend: list[TrendPoint]
    revenue_trend: list[TrendPoint]
    occupancy_trend: PlaceholderTrend
    revpar_trend: PlaceholderTrend
    risk_drivers: list[RiskDriver]
    recommendations: list[ExecutiveRecommendation]
    benchmarks: list[BenchmarkRow]
