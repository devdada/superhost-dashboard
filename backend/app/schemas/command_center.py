from datetime import date

from pydantic import BaseModel, Field


class KpiSparklinePoint(BaseModel):
    report_date: str
    value: float


class ExecutiveKpiCard(BaseModel):
    id: str
    label: str
    value: str
    raw_value: float | None = None
    unit: str = ""  # currency | variance_percent | level_percent | count
    delta: float | None = None
    delta_display: str | None = None
    delta_label: str | None = None
    trend: list[KpiSparklinePoint] = Field(default_factory=list)
    direction: str | None = None  # up | down | flat | none


class ActionAlert(BaseModel):
    id: str
    severity: str  # critical | watch | strong
    hotel_name: str
    metric: str
    variance_percent: float
    confidence: float = 1.0
    headline: str
    explanation: str
    recommended_action: str


class HeatmapRow(BaseModel):
    hotel_name: str
    revenue: float | None = None
    occupancy: float | None = None
    adr: float | None = None
    revpar: float | None = None
    fnb_variance: float | None = None
    variance_vs_budget: float | None = None
    variance_vs_forecast: float | None = None
    status_score: int
    status: str  # outperforming | watch | critical | neutral


class RevenueTrendPoint(BaseModel):
    report_date: str
    actual: float
    budget: float
    forecast: float


class RevparTrendPoint(BaseModel):
    report_date: str
    current: float
    budget: float
    prior_period: float | None = None


class OccupancyAdrBubble(BaseModel):
    hotel_name: str
    occupancy: float
    adr: float
    revenue: float
    variance_percent: float


class PerformerCard(BaseModel):
    rank: int
    hotel_name: str
    revpar: float | None = None
    revenue_variance: float | None = None
    revpar_change: float | None = None
    badge: str
    trend_direction: str | None = None
    sparkline: list[float] = Field(default_factory=list)


class CommandCenterResponse(BaseModel):
    period: str
    range_start: date | None
    range_end: date | None
    reports_in_period: int
    latest_report_date: date | None
    prior_report_date: date | None
    available_properties: list[str] = Field(default_factory=list)
    selected_properties: list[str] = Field(
        default_factory=list,
        description="Empty means all properties; otherwise active hotel names",
    )
    available_report_dates: list[str] = Field(default_factory=list)
    stored_metrics: list[str]
    kpis: list[ExecutiveKpiCard]
    action_alerts: list[ActionAlert]
    heatmap: list[HeatmapRow]
    revenue_trend: list[RevenueTrendPoint]
    revpar_trend: list[RevparTrendPoint]
    occupancy_adr_scatter: list[OccupancyAdrBubble]
    top_performers: list[PerformerCard]
    worst_performers: list[PerformerCard]
