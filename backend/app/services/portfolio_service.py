from sqlalchemy.orm import Session

from app.models import FlashMetricRow
from app.repositories.report_repository import count_unique_report_dates, get_latest_report
from app.schemas.portfolio import PortfolioOperationalResponse


def build_portfolio_operational(session: Session) -> PortfolioOperationalResponse:
    total = count_unique_report_dates(session)
    latest = get_latest_report(session)

    if not latest or not latest.metrics:
        return PortfolioOperationalResponse(
            total_reports=total,
            latest_report_id=None,
            latest_report_date=None,
            latest_filename=None,
            metric=None,
            rows=[],
        )

    rows = [
        FlashMetricRow(
            hotel=m.hotel_name,
            metric=m.metric,
            forecast=m.forecast,
            budget=m.budget,
            variance_percent=m.variance_percent,
        )
        for m in latest.metrics
    ]

    return PortfolioOperationalResponse(
        total_reports=total,
        latest_report_id=latest.id,
        latest_report_date=latest.report_date,
        latest_filename=latest.file_name,
        metric=latest.metrics[0].metric if latest.metrics else "Revenue",
        rows=rows,
    )
