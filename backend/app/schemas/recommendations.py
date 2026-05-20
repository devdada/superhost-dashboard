from enum import Enum

from pydantic import BaseModel, Field


class OperationalCategory(str, Enum):
    REVENUE = "Revenue"
    OCCUPANCY = "Occupancy"
    ADR = "ADR"
    REVPAR = "RevPAR"


class PriorityLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RiskSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"


class TriggerType(str, Enum):
    CRITICAL_RISK = "critical_risk"
    PERSISTENT_RISK = "persistent_risk"
    DECLINING_PROPERTY = "declining_property"
    STRONG_PERFORMER = "strong_performer"


class ActionChecklistItem(BaseModel):
    id: str
    label: str


class ExecutiveRecommendation(BaseModel):
    hotel_name: str
    trigger_type: TriggerType
    issue_summary: str
    operational_categories: list[OperationalCategory]
    priority: PriorityLevel
    suggested_owner: str
    risk_severity: RiskSeverity
    recommended_actions: list[str]
    action_checklist: list[ActionChecklistItem]
    variance_percent: float | None = None
    consecutive_misses: int | None = None


class PortfolioExecutiveSummary(BaseModel):
    biggest_portfolio_risk: str
    strongest_performer: str
    emerging_concern: str
    portfolio_health_score: int = Field(ge=0, le=100)
    health_label: str
    health_narrative: str


class ExecutiveIntelligenceResponse(BaseModel):
    report_id: int | None
    report_date: str | None
    metric: str | None
    executive_summary: PortfolioExecutiveSummary
    recommendations: list[ExecutiveRecommendation]
