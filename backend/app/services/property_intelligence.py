"""Per-property operational intelligence from SQLite history."""

from __future__ import annotations

import statistics
from collections import defaultdict
from urllib.parse import unquote

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import HotelMetric, Report
from app.repositories.report_repository import list_reports_chronological
from app.schemas.property import (
    BenchmarkRow,
    PlaceholderTrend,
    PropertyIntelligenceResponse,
    RiskDriver,
    TrendPoint,
)
from app.schemas.recommendations import ExecutiveRecommendation
from app.services.recommendation_engine import (
    CONSECUTIVE_MISS_THRESHOLD,
    CRITICAL_VARIANCE,
    STRONG_PERFORMER_VARIANCE,
    WATCH_HIGH,
    WATCH_LOW,
    _critical_recommendation,
    _declining_recommendation,
    _persistent_recommendation,
    _strong_performer_recommendation,
    build_historical_trends,
)
from app.services.recommendation_engine import _MetricRow as RecRow

OCCUPANCY_PLACEHOLDER = PlaceholderTrend(
    label="Occupancy",
    message="Occupancy time series will populate when Daily Flash occupancy tables are ingested.",
    available=False,
)
REVPAR_PLACEHOLDER = PlaceholderTrend(
    label="RevPAR",
    message="RevPAR trend requires ADR and occupancy feeds — coming in a future ingestion phase.",
    available=False,
)


def _decode_hotel_name(hotel_name: str) -> str:
    return unquote(hotel_name).strip()


def _consecutive_negative_trail(variances: list[float]) -> int:
    count = 0
    for value in reversed(variances):
        if value < 0:
            count += 1
        else:
            break
    return count


def _consecutive_positive_trail(variances: list[float]) -> int:
    count = 0
    for value in reversed(variances):
        if value > 0:
            count += 1
        else:
            break
    return count


def _risk_status(latest_variance: float | None, consecutive_misses: int) -> tuple[str, str]:
    if latest_variance is None:
        return "unknown", "Insufficient data"
    if consecutive_misses >= CONSECUTIVE_MISS_THRESHOLD:
        return "critical", "Critical — persistent budget misses"
    if latest_variance <= CRITICAL_VARIANCE:
        return "critical", "Critical — severe underperformance"
    if WATCH_LOW < latest_variance <= WATCH_HIGH:
        return "watch", "Watch — trailing budget"
    if latest_variance >= STRONG_PERFORMER_VARIANCE:
        return "outperforming", "Outperforming — above benchmark"
    if latest_variance >= 0:
        return "healthy", "Healthy — at or above budget"
    return "elevated", "Elevated — below budget"


def _property_health_score(
    variances: list[float],
    consecutive_misses: int,
    portfolio_rank: int,
    portfolio_total: int,
) -> tuple[int, str]:
    if not variances:
        return 0, "No Data"

    score = 72.0
    latest = variances[-1]
    avg = sum(variances) / len(variances)

    score += min(latest * 0.8, 15)
    score += min(avg * 0.4, 8)
    score -= consecutive_misses * 8

    if len(variances) >= 3:
        volatility = statistics.pstdev(variances[-3:])
        score -= min(volatility * 0.5, 12)

    if portfolio_total > 0:
        percentile = portfolio_rank / portfolio_total
        score += (1 - percentile) * 10

    score = int(max(0, min(100, round(score))))

    if score >= 80:
        return score, "Strong"
    if score >= 60:
        return score, "Stable"
    if score >= 40:
        return score, "Watch"
    return score, "At Risk"


def _build_operational_summary(
    hotel: str,
    latest: TrendPoint | None,
    rank: int,
    total: int,
    misses: int,
    wins: int,
    risk_label: str,
) -> str:
    if not latest:
        return f"{hotel} has no historical reports in the portfolio database."

    direction = "above" if latest.variance_percent >= 0 else "below"
    streak = ""
    if misses >= 3:
        streak = f" The asset has missed budget in {misses} consecutive reports — systemic recovery required."
    elif wins >= 3:
        streak = (
            f" The asset has beaten budget for {wins} consecutive reports — "
            "capture operating playbook."
        )

    return (
        f"{hotel} is currently {risk_label}. Latest period variance is "
        f"{latest.variance_percent:+.1f}% ({direction} budget), ranking {rank} of {total} "
        f"properties by average variance performance.{streak}"
    )


def _risk_drivers(
    hotel: str,
    variances: list[float],
    consecutive_misses: int,
    consecutive_wins: int,
) -> list[RiskDriver]:
    drivers: list[RiskDriver] = []

    if not variances:
        return drivers

    latest = variances[-1]

    if consecutive_misses >= CONSECUTIVE_MISS_THRESHOLD:
        drivers.append(
            RiskDriver(
                code="persistent_underperformance",
                label="Persistent underperformance",
                description=(
                    f"{hotel} has missed budget in {consecutive_misses} consecutive reports — "
                    "pattern indicates structural, not one-time, variance pressure."
                ),
                severity="critical",
            )
        )

    if latest <= CRITICAL_VARIANCE:
        drivers.append(
            RiskDriver(
                code="revenue_gap",
                label="Revenue / forecast gap",
                description=(
                    f"Latest variance of {latest:.1f}% signals material revenue shortfall vs budget."
                ),
                severity="critical",
            )
        )

    if WATCH_LOW < latest <= WATCH_HIGH:
        drivers.append(
            RiskDriver(
                code="adr_compression",
                label="ADR compression risk",
                description="Variance in watch band often reflects rate weakness — review ADR positioning.",
                severity="high",
            )
        )

    if len(variances) >= 3 and statistics.pstdev(variances[-3:]) > 8:
        drivers.append(
            RiskDriver(
                code="volatility",
                label="Performance volatility",
                description="High variance swing across recent reports — unstable operating trajectory.",
                severity="moderate",
            )
        )

    if latest < 0 and latest > WATCH_LOW:
        drivers.append(
            RiskDriver(
                code="occupancy_softness",
                label="Occupancy softness (inferred)",
                description=(
                    "Negative variance with moderate severity may reflect demand or occupancy pacing gaps."
                ),
                severity="moderate",
            )
        )

    if consecutive_wins >= 3 and latest >= STRONG_PERFORMER_VARIANCE:
        drivers.append(
            RiskDriver(
                code="momentum_positive",
                label="Positive momentum",
                description=f"Sustained outperformance — {consecutive_wins} consecutive beats.",
                severity="low",
            )
        )

    return drivers


def _portfolio_rankings(
    reports: list[Report],
) -> dict[str, tuple[int, float, int]]:
    """hotel -> (rank ascending 1=best, avg_variance, count)."""
    hotel_variances: dict[str, list[float]] = defaultdict(list)

    for report in reports:
        for m in report.metrics:
            hotel_variances[m.hotel_name].append(m.variance_percent)

    averages = {
        hotel: sum(v) / len(v) for hotel, v in hotel_variances.items() if v
    }
    sorted_hotels = sorted(averages.items(), key=lambda x: x[1], reverse=True)
    total = len(sorted_hotels)

    result: dict[str, tuple[int, float, int]] = {}
    for rank, (hotel, avg) in enumerate(sorted_hotels, start=1):
        result[hotel] = (rank, avg, total)
    return result


def _latest_snapshot_by_hotel(reports: list[Report]) -> dict[str, HotelMetric]:
    latest: dict[str, HotelMetric] = {}
    for report in reports:
        for m in report.metrics:
            latest[m.hotel_name] = m
    return latest


def _build_benchmarks(
    hotel_name: str,
    latest_metrics: dict[str, HotelMetric],
    rankings: dict[str, tuple[int, float, int]],
) -> list[BenchmarkRow]:
    if hotel_name not in latest_metrics:
        return []

    prop = latest_metrics[hotel_name]
    all_variances = [m.variance_percent for m in latest_metrics.values()]
    portfolio_avg = sum(all_variances) / len(all_variances) if all_variances else 0

    sorted_by_var = sorted(
        latest_metrics.items(),
        key=lambda x: x[1].variance_percent,
        reverse=True,
    )
    top_name, top_m = sorted_by_var[0]
    worst_name, worst_m = sorted_by_var[-1]

    rows = [
        BenchmarkRow(
            label="Variance vs budget",
            property_value=round(prop.variance_percent, 2),
            portfolio_average=round(portfolio_avg, 2),
            top_performer_name=top_name,
            top_performer_value=round(top_m.variance_percent, 2),
            worst_performer_name=worst_name,
            worst_performer_value=round(worst_m.variance_percent, 2),
            unit="percent",
        ),
    ]

    if prop.metric.lower() != "occupancy":
        forecasts = [m.forecast for m in latest_metrics.values()]
        avg_forecast = sum(forecasts) / len(forecasts) if forecasts else 0
        rows.append(
            BenchmarkRow(
                label="Primary forecast",
                property_value=round(prop.forecast, 0),
                portfolio_average=round(avg_forecast, 0),
                top_performer_name=top_name,
                top_performer_value=round(top_m.forecast, 0),
                worst_performer_name=worst_name,
                worst_performer_value=round(worst_m.forecast, 0),
                unit="currency",
            )
        )

    return rows


def _property_recommendations(
    row: RecRow,
    consecutive_misses: int,
    trends,
) -> list[ExecutiveRecommendation]:
    recs: list[ExecutiveRecommendation] = []

    if row.variance_percent <= CRITICAL_VARIANCE:
        recs.append(_critical_recommendation(row))

    if consecutive_misses >= CONSECUTIVE_MISS_THRESHOLD:
        recs.append(
            _persistent_recommendation(row.hotel, consecutive_misses, row.metric)
        )

    for mover in trends.declining_properties:
        if mover.hotel_name == row.hotel:
            recs.append(
                _declining_recommendation(
                    row.hotel,
                    mover.first_variance_percent,
                    mover.latest_variance_percent,
                    row.metric,
                )
            )

    if row.variance_percent >= STRONG_PERFORMER_VARIANCE:
        recs.append(_strong_performer_recommendation(row))

    return recs


def build_property_intelligence(session: Session, hotel_name: str) -> PropertyIntelligenceResponse:
    decoded = _decode_hotel_name(hotel_name)
    reports = list_reports_chronological(session)

    trend_points: list[TrendPoint] = []
    metric_name = "Revenue"

    for report in reports:
        for m in report.metrics:
            if m.hotel_name == decoded:
                metric_name = m.metric
                trend_points.append(
                    TrendPoint(
                        report_date=report.report_date.isoformat(),
                        report_id=report.id,
                        forecast=m.forecast,
                        budget=m.budget,
                        variance_percent=m.variance_percent,
                    )
                )

    if not trend_points:
        raise ValueError(f"No historical data found for property: {decoded}")

    variances = [p.variance_percent for p in trend_points]
    consecutive_misses = _consecutive_negative_trail(variances)
    consecutive_wins = _consecutive_positive_trail(variances)
    latest = trend_points[-1]

    rankings = _portfolio_rankings(reports)
    if decoded in rankings:
        rank, _avg, total = rankings[decoded]
    else:
        total = max(len(rankings), 1)
        rank = total

    risk_code, risk_label = _risk_status(latest.variance_percent, consecutive_misses)
    health_score, health_label = _property_health_score(
        variances, consecutive_misses, rank, total
    )

    trends = build_historical_trends(session)
    latest_row = RecRow(
        hotel=decoded,
        metric=metric_name,
        forecast=latest.forecast,
        budget=latest.budget,
        variance_percent=latest.variance_percent,
    )
    recommendations = _property_recommendations(
        latest_row, consecutive_misses, trends
    )

    latest_by_hotel = _latest_snapshot_by_hotel(reports)

    return PropertyIntelligenceResponse(
        hotel_name=decoded,
        metric=metric_name,
        risk_status=risk_code,
        risk_status_label=risk_label,
        portfolio_rank=rank,
        portfolio_total=total,
        consecutive_misses=consecutive_misses,
        consecutive_wins=consecutive_wins,
        operational_summary=_build_operational_summary(
            decoded, latest, rank, total, consecutive_misses, consecutive_wins, risk_label
        ),
        health_score=health_score,
        health_label=health_label,
        variance_trend=trend_points,
        revenue_trend=trend_points,
        occupancy_trend=OCCUPANCY_PLACEHOLDER,
        revpar_trend=REVPAR_PLACEHOLDER,
        risk_drivers=_risk_drivers(
            decoded, variances, consecutive_misses, consecutive_wins
        ),
        recommendations=recommendations,
        benchmarks=_build_benchmarks(decoded, latest_by_hotel, rankings),
    )
