from datetime import date

from sqlalchemy.orm import Session

from app.models import FlashMetricRow
from app.query_filters import normalize_metric, normalize_period, resolve_period_range
from app.repositories.report_repository import (
    count_reports_in_period,
    filter_metrics_by_name,
    get_latest_report_in_period,
    list_distinct_metrics,
)
from app.schemas.portfolio import PortfolioOperationalResponse


def build_portfolio_operational(
    session: Session,
    *,
    metric: str | None = None,
    period: str | None = None,
    reference: date | None = None,
) -> PortfolioOperationalResponse:
    metric_name = normalize_metric(metric)
    period_name = normalize_period(period)
    range_start, range_end = resolve_period_range(period_name, reference=reference)

    total = count_reports_in_period(session, period_name, reference=reference)
    available = list_distinct_metrics(session)
    latest = get_latest_report_in_period(
        session, period_name, metric_name, reference=reference
    )

    if not latest:
        return PortfolioOperationalResponse(
            total_reports=total,
            period=period_name,
            range_start=range_start,
            range_end=range_end,
            metric=metric_name,
            available_metrics=available,
            latest_report_id=None,
            latest_report_date=None,
            latest_filename=None,
            rows=[],
        )

    filtered = filter_metrics_by_name(latest.metrics, metric_name)
    rows = [
        FlashMetricRow(
            hotel=m.hotel_name,
            metric=m.metric,
            forecast=m.forecast,
            budget=m.budget,
            variance_percent=m.variance_percent,
        )
        for m in filtered
    ]

    return PortfolioOperationalResponse(
        total_reports=total,
        period=period_name,
        range_start=range_start,
        range_end=range_end,
        metric=metric_name,
        available_metrics=available,
        latest_report_id=latest.id,
        latest_report_date=latest.report_date,
        latest_filename=latest.file_name,
        rows=rows,
    )
