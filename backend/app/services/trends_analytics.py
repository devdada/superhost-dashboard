"""Historical trend intelligence from stored reports."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date

from sqlalchemy.orm import Session

from app.query_filters import normalize_metric, normalize_period, resolve_period_range
from app.repositories.report_repository import (
    count_reports_in_period,
    filter_metrics_by_name,
    list_reports_in_period,
)
from app.schemas.trends import (
    HistoricalTrendsResponse,
    HotelRanking,
    HotelTrendSeries,
    HotelVariancePoint,
    PersistentRisk,
    PortfolioVariancePoint,
    TrendMover,
)

CONSECUTIVE_MISS_THRESHOLD = 3
TREND_WINDOW = 3
MAX_CHART_HOTELS = 6


@dataclass
class _HotelPoint:
    report_date: str
    variance_percent: float


def _consecutive_negative_trail(variances: list[float]) -> int:
    """Count consecutive negative variances from most recent report backward."""
    count = 0
    for value in reversed(variances):
        if value < 0:
            count += 1
        else:
            break
    return count


def _is_strictly_improving(values: list[float]) -> bool:
    return len(values) >= TREND_WINDOW and all(
        values[i] < values[i + 1] for i in range(len(values) - 1)
    )


def _is_strictly_declining(values: list[float]) -> bool:
    return len(values) >= TREND_WINDOW and all(
        values[i] > values[i + 1] for i in range(len(values) - 1)
    )


def build_historical_trends(
    session: Session,
    *,
    metric: str | None = None,
    period: str | None = None,
    reference: date | None = None,
) -> HistoricalTrendsResponse:
    metric_name = normalize_metric(metric)
    period_name = normalize_period(period)
    range_start, range_end = resolve_period_range(period_name, reference=reference)

    reports = list_reports_in_period(session, period_name, reference=reference)
    total_reports = count_reports_in_period(session, period_name, reference=reference)

    if total_reports == 0:
        return HistoricalTrendsResponse(
            total_reports=0,
            period=period_name,
            range_start=range_start,
            range_end=range_end,
            metric=metric_name,
            portfolio_variance_trend=[],
            top_performers=[],
            worst_performers=[],
            hotel_variance_series=[],
            persistent_risks=[],
            improving_properties=[],
            declining_properties=[],
        )

    portfolio_trend: list[PortfolioVariancePoint] = []
    hotel_history: dict[str, list[_HotelPoint]] = defaultdict(list)
    hotel_variance_lists: dict[str, list[float]] = defaultdict(list)

    for report in reports:
        metric_rows = filter_metrics_by_name(report.metrics, metric_name)
        if not metric_rows:
            continue

        avg_variance = sum(m.variance_percent for m in metric_rows) / len(metric_rows)
        date_str = report.report_date.isoformat()

        portfolio_trend.append(
            PortfolioVariancePoint(
                report_id=report.id,
                report_date=date_str,
                file_name=report.file_name,
                average_variance_percent=round(avg_variance, 2),
            )
        )

        for row in metric_rows:
            hotel_history[row.hotel_name].append(
                _HotelPoint(report_date=date_str, variance_percent=row.variance_percent)
            )
            hotel_variance_lists[row.hotel_name].append(row.variance_percent)

    rankings: list[HotelRanking] = []
    for hotel_name, variances in hotel_variance_lists.items():
        rankings.append(
            HotelRanking(
                hotel_name=hotel_name,
                report_count=len(variances),
                average_variance_percent=round(sum(variances) / len(variances), 2),
            )
        )

    rankings.sort(key=lambda r: r.average_variance_percent, reverse=True)
    top_performers = rankings[:8]
    worst_performers = sorted(rankings, key=lambda r: r.average_variance_percent)[:8]

    persistent_risks: list[PersistentRisk] = []
    for hotel_name, variances in hotel_variance_lists.items():
        streak = _consecutive_negative_trail(variances)
        if streak >= CONSECUTIVE_MISS_THRESHOLD:
            plural = "reports" if streak != 1 else "report"
            persistent_risks.append(
                PersistentRisk(
                    hotel_name=hotel_name,
                    consecutive_misses=streak,
                    message=(
                        f"{hotel_name} missed budget on {metric_name} "
                        f"in {streak} consecutive {plural}."
                    ),
                )
            )
    persistent_risks.sort(key=lambda r: r.consecutive_misses, reverse=True)

    improving: list[TrendMover] = []
    declining: list[TrendMover] = []

    for hotel_name, variances in hotel_variance_lists.items():
        if len(variances) < TREND_WINDOW:
            continue

        window = variances[-TREND_WINDOW:]
        first_v, last_v = window[0], window[-1]
        change = round(last_v - first_v, 2)

        if _is_strictly_improving(window):
            improving.append(
                TrendMover(
                    hotel_name=hotel_name,
                    report_count=len(variances),
                    first_variance_percent=first_v,
                    latest_variance_percent=last_v,
                    change_points=change,
                    message=(
                        f"{hotel_name} is improving on {metric_name} — variance rose "
                        f"{first_v:.1f}% to {last_v:.1f}% over the last {TREND_WINDOW} reports."
                    ),
                )
            )
        elif _is_strictly_declining(window):
            declining.append(
                TrendMover(
                    hotel_name=hotel_name,
                    report_count=len(variances),
                    first_variance_percent=first_v,
                    latest_variance_percent=last_v,
                    change_points=change,
                    message=(
                        f"{hotel_name} is declining on {metric_name} — variance fell "
                        f"{first_v:.1f}% to {last_v:.1f}% over the last {TREND_WINDOW} reports."
                    ),
                )
            )

    improving.sort(key=lambda m: m.change_points, reverse=True)
    declining.sort(key=lambda m: m.change_points)

    chart_hotels = {r.hotel_name for r in top_performers[:4]} | {
        r.hotel_name for r in worst_performers[:4]
    }
    hotel_variance_series: list[HotelTrendSeries] = []
    for hotel_name in sorted(chart_hotels)[:MAX_CHART_HOTELS]:
        points = hotel_history.get(hotel_name, [])
        hotel_variance_series.append(
            HotelTrendSeries(
                hotel_name=hotel_name,
                points=[
                    HotelVariancePoint(
                        report_date=p.report_date,
                        variance_percent=p.variance_percent,
                    )
                    for p in points
                ],
            )
        )

    return HistoricalTrendsResponse(
        total_reports=total_reports,
        period=period_name,
        range_start=range_start,
        range_end=range_end,
        metric=metric_name,
        portfolio_variance_trend=portfolio_trend,
        top_performers=top_performers,
        worst_performers=worst_performers,
        hotel_variance_series=hotel_variance_series,
        persistent_risks=persistent_risks,
        improving_properties=improving,
        declining_properties=declining,
    )
