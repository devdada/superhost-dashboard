"""Deterministic executive recommendations and portfolio health scoring."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import Report
from app.schemas.recommendations import (
    ActionChecklistItem,
    ExecutiveIntelligenceResponse,
    ExecutiveRecommendation,
    OperationalCategory,
    PortfolioExecutiveSummary,
    PriorityLevel,
    RiskSeverity,
    TriggerType,
)
from app.schemas.trends import HistoricalTrendsResponse
from app.services.trends_analytics import build_historical_trends

CRITICAL_VARIANCE = -10.0
STRONG_PERFORMER_VARIANCE = 15.0
WATCH_LOW = -10.0
WATCH_HIGH = -5.0
CONSECUTIVE_MISS_THRESHOLD = 3


@dataclass
class _MetricRow:
    hotel: str
    metric: str
    forecast: float
    budget: float
    variance_percent: float


def _map_operational_categories(metric: str, variance: float) -> list[OperationalCategory]:
    metric_upper = metric.upper()
    if "OCCUPANCY" in metric_upper:
        return [OperationalCategory.OCCUPANCY, OperationalCategory.REVPAR]
    if variance <= CRITICAL_VARIANCE:
        return [
            OperationalCategory.REVENUE,
            OperationalCategory.ADR,
            OperationalCategory.REVPAR,
            OperationalCategory.OCCUPANCY,
        ]
    return [OperationalCategory.REVENUE, OperationalCategory.REVPAR]


def _checklist_from_actions(actions: list[str], prefix: str) -> list[ActionChecklistItem]:
    return [
        ActionChecklistItem(id=f"{prefix}-{i}", label=label)
        for i, label in enumerate(actions)
    ]


def _critical_recommendation(row: _MetricRow) -> ExecutiveRecommendation:
    actions = [
        "Conduct pricing strategy review",
        "Review occupancy pacing and demand forecast",
        "Initiate labor cost audit vs productivity benchmarks",
    ]
    return ExecutiveRecommendation(
        hotel_name=row.hotel,
        trigger_type=TriggerType.CRITICAL_RISK,
        issue_summary=(
            f"{row.hotel} is underperforming budget by {abs(row.variance_percent):.1f}% "
            f"on {row.metric} — immediate intervention required."
        ),
        operational_categories=_map_operational_categories(row.metric, row.variance_percent),
        priority=PriorityLevel.CRITICAL,
        suggested_owner="Regional Director",
        risk_severity=RiskSeverity.CRITICAL,
        recommended_actions=actions,
        action_checklist=_checklist_from_actions(actions, f"crit-{row.hotel[:8]}"),
        variance_percent=row.variance_percent,
    )


def _persistent_recommendation(
    hotel_name: str,
    consecutive: int,
    metric: str,
) -> ExecutiveRecommendation:
    actions = [
        "Flag for regional management review",
        "Develop 30-day operational action plan",
        "Schedule weekly variance checkpoint with GM",
    ]
    return ExecutiveRecommendation(
        hotel_name=hotel_name,
        trigger_type=TriggerType.PERSISTENT_RISK,
        issue_summary=(
            f"{hotel_name} missed budget in {consecutive} consecutive reports — "
            "systemic underperformance pattern detected."
        ),
        operational_categories=_map_operational_categories(metric, -1),
        priority=PriorityLevel.HIGH,
        suggested_owner="Regional Director",
        risk_severity=RiskSeverity.HIGH,
        recommended_actions=actions,
        action_checklist=_checklist_from_actions(actions, f"pers-{hotel_name[:8]}"),
        consecutive_misses=consecutive,
    )


def _declining_recommendation(
    hotel_name: str,
    first_v: float,
    last_v: float,
    metric: str,
) -> ExecutiveRecommendation:
    actions = [
        "Investigate root cause of declining variance trend",
        "Reset weekly revenue and occupancy pacing targets",
        "Assign cross-functional recovery task force (RM + Ops)",
    ]
    return ExecutiveRecommendation(
        hotel_name=hotel_name,
        trigger_type=TriggerType.DECLINING_PROPERTY,
        issue_summary=(
            f"{hotel_name} variance declined from {first_v:.1f}% to {last_v:.1f}% "
            f"over the last 3 reports — momentum is negative."
        ),
        operational_categories=_map_operational_categories(metric, last_v),
        priority=PriorityLevel.HIGH,
        suggested_owner="General Manager",
        risk_severity=RiskSeverity.HIGH if last_v < 0 else RiskSeverity.MODERATE,
        recommended_actions=actions,
        action_checklist=_checklist_from_actions(actions, f"dec-{hotel_name[:8]}"),
        variance_percent=last_v,
    )


def _strong_performer_recommendation(row: _MetricRow) -> ExecutiveRecommendation:
    actions = [
        "Document operating best practices for portfolio rollout",
        "Benchmark underperforming assets against this property",
        "Present playbook at regional ops council",
    ]
    return ExecutiveRecommendation(
        hotel_name=row.hotel,
        trigger_type=TriggerType.STRONG_PERFORMER,
        issue_summary=(
            f"{row.hotel} is outperforming budget by {row.variance_percent:.1f}% — "
            "capture and replicate winning practices."
        ),
        operational_categories=[OperationalCategory.REVENUE, OperationalCategory.REVPAR],
        priority=PriorityLevel.LOW,
        suggested_owner="Asset Manager",
        risk_severity=RiskSeverity.LOW,
        recommended_actions=actions,
        action_checklist=_checklist_from_actions(actions, f"win-{row.hotel[:8]}"),
        variance_percent=row.variance_percent,
    )


def _health_label(score: int) -> tuple[str, str]:
    if score >= 80:
        return "Healthy", "Portfolio is largely on track with isolated attention areas."
    if score >= 60:
        return "Monitor", "Mixed performance — targeted interventions recommended."
    if score >= 40:
        return "At Risk", "Multiple properties require operational recovery plans."
    return "Critical", "Portfolio-wide intervention required — escalate to ownership."


def _compute_health_score(
    rows: list[_MetricRow],
    trends: HistoricalTrendsResponse,
) -> int:
    score = 100.0
    critical = [r for r in rows if r.variance_percent <= CRITICAL_VARIANCE]
    watch = [r for r in rows if WATCH_LOW < r.variance_percent <= WATCH_HIGH]
    strong = [r for r in rows if r.variance_percent >= STRONG_PERFORMER_VARIANCE]

    score -= len(critical) * 7
    score -= len(watch) * 3
    score -= len(trends.persistent_risks) * 5
    score -= len(trends.declining_properties) * 4

    if rows:
        avg = sum(r.variance_percent for r in rows) / len(rows)
        if avg < 0:
            score += avg * 1.5

    score += min(len(strong) * 2, 12)
    return int(max(0, min(100, round(score))))


def _build_executive_summary(
    rows: list[_MetricRow],
    trends: HistoricalTrendsResponse,
    health_score: int,
) -> PortfolioExecutiveSummary:
    label, narrative = _health_label(health_score)

    if not rows:
        return PortfolioExecutiveSummary(
            biggest_portfolio_risk="No report data — upload a Daily Flash PDF",
            strongest_performer="—",
            emerging_concern="—",
            portfolio_health_score=health_score,
            health_label=label,
            health_narrative=narrative,
        )

    worst = min(rows, key=lambda r: r.variance_percent)
    best = max(rows, key=lambda r: r.variance_percent)

    biggest_risk = worst.hotel
    if trends.persistent_risks:
        top_persistent = trends.persistent_risks[0]
        if worst.variance_percent < 0:
            biggest_risk = (
                f"{worst.hotel} ({worst.variance_percent:.1f}% latest; "
                f"{top_persistent.consecutive_misses} consecutive misses)"
            )
        else:
            biggest_risk = (
                f"{top_persistent.hotel_name} "
                f"({top_persistent.consecutive_misses} consecutive misses)"
            )

    strongest = (
        f"{best.hotel} (+{best.variance_percent:.1f}%)"
        if best.variance_percent >= STRONG_PERFORMER_VARIANCE
        else f"{best.hotel} (+{best.variance_percent:.1f}% — below +15% benchmark threshold)"
    )

    emerging = "No emerging concerns flagged"
    if trends.declining_properties:
        d = trends.declining_properties[0]
        emerging = f"{d.hotel_name} — declining trend ({d.first_variance_percent:.1f}% → {d.latest_variance_percent:.1f}%)"
    else:
        watch = [r for r in rows if WATCH_LOW < r.variance_percent <= WATCH_HIGH]
        if watch:
            w = min(watch, key=lambda r: r.variance_percent)
            emerging = f"{w.hotel} — watch list at {w.variance_percent:.1f}%"

    return PortfolioExecutiveSummary(
        biggest_portfolio_risk=biggest_risk,
        strongest_performer=strongest,
        emerging_concern=emerging,
        portfolio_health_score=health_score,
        health_label=label,
        health_narrative=narrative,
    )


def build_executive_intelligence(session: Session) -> ExecutiveIntelligenceResponse:
    trends = build_historical_trends(session)

    stmt = (
        select(Report)
        .options(joinedload(Report.metrics))
        .order_by(Report.report_date.desc(), Report.uploaded_at.desc())
        .limit(1)
    )
    latest = session.scalars(stmt).first()

    if not latest or not latest.metrics:
        empty_summary = PortfolioExecutiveSummary(
            biggest_portfolio_risk="Upload a Daily Flash report to begin",
            strongest_performer="—",
            emerging_concern="—",
            portfolio_health_score=0,
            health_label="No Data",
            health_narrative="Executive intelligence requires at least one parsed report.",
        )
        return ExecutiveIntelligenceResponse(
            report_id=None,
            report_date=None,
            metric=None,
            executive_summary=empty_summary,
            recommendations=[],
        )

    rows = [
        _MetricRow(
            hotel=m.hotel_name,
            metric=m.metric,
            forecast=m.forecast,
            budget=m.budget,
            variance_percent=m.variance_percent,
        )
        for m in latest.metrics
    ]
    metric = latest.metrics[0].metric if latest.metrics else "Revenue"

    recommendations: list[ExecutiveRecommendation] = []
    seen_hotels: set[str] = set()

    for row in sorted(rows, key=lambda r: r.variance_percent):
        if row.variance_percent <= CRITICAL_VARIANCE:
            recommendations.append(_critical_recommendation(row))
            seen_hotels.add(row.hotel)

    for risk in trends.persistent_risks:
        if risk.hotel_name not in seen_hotels:
            recommendations.append(
                _persistent_recommendation(risk.hotel_name, risk.consecutive_misses, metric)
            )
            seen_hotels.add(risk.hotel_name)

    for mover in trends.declining_properties:
        if mover.hotel_name not in seen_hotels:
            recommendations.append(
                _declining_recommendation(
                    mover.hotel_name,
                    mover.first_variance_percent,
                    mover.latest_variance_percent,
                    metric,
                )
            )
            seen_hotels.add(mover.hotel_name)

    for row in sorted(rows, key=lambda r: r.variance_percent, reverse=True):
        if row.variance_percent >= STRONG_PERFORMER_VARIANCE:
            recommendations.append(_strong_performer_recommendation(row))

    priority_order = {
        PriorityLevel.CRITICAL: 0,
        PriorityLevel.HIGH: 1,
        PriorityLevel.MEDIUM: 2,
        PriorityLevel.LOW: 3,
    }
    recommendations.sort(key=lambda r: priority_order[r.priority])

    health_score = _compute_health_score(rows, trends)
    summary = _build_executive_summary(rows, trends, health_score)

    return ExecutiveIntelligenceResponse(
        report_id=latest.id,
        report_date=latest.report_date.isoformat(),
        metric=metric,
        executive_summary=summary,
        recommendations=recommendations,
    )
