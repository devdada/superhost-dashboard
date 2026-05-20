from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.database import HotelMetric, Report
from app.models import FlashMetricRow


def report_date_exists(session: Session, report_date: date) -> bool:
    stmt = select(Report.id).where(Report.report_date == report_date).limit(1)
    return session.scalar(stmt) is not None


def create_report_with_metrics(
    session: Session,
    *,
    report_date: date,
    file_name: str,
    rows: list[FlashMetricRow],
) -> Report:
    report = Report(report_date=report_date, file_name=file_name)
    session.add(report)
    session.flush()

    for row in rows:
        session.add(
            HotelMetric(
                report_id=report.id,
                hotel_name=row.hotel,
                metric=row.metric,
                forecast=row.forecast,
                budget=row.budget,
                variance_percent=row.variance_percent,
            )
        )

    session.commit()
    session.refresh(report)
    return report


def list_reports_chronological(session: Session) -> list[Report]:
    stmt = (
        select(Report)
        .options(joinedload(Report.metrics))
        .order_by(Report.report_date.asc(), Report.uploaded_at.asc())
    )
    return list(session.scalars(stmt).unique().all())


def list_reports_deduped_by_date(session: Session) -> list[Report]:
    """One report per calendar date (newest upload wins if legacy duplicates exist)."""
    by_date: dict[date, Report] = {}
    for report in list_reports_chronological(session):
        existing = by_date.get(report.report_date)
        if existing is None or report.uploaded_at > existing.uploaded_at:
            by_date[report.report_date] = report
    return sorted(by_date.values(), key=lambda r: (r.report_date, r.uploaded_at))


def count_unique_report_dates(session: Session) -> int:
    stmt = select(func.count(func.distinct(Report.report_date)))
    return int(session.scalar(stmt) or 0)


def get_latest_report(session: Session) -> Report | None:
    stmt = (
        select(Report)
        .options(joinedload(Report.metrics))
        .order_by(Report.report_date.desc(), Report.uploaded_at.desc())
        .limit(1)
    )
    return session.scalars(stmt).first()
