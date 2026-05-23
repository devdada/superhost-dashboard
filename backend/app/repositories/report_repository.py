from datetime import date, timedelta

from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session, joinedload

from app.database import HotelMetric, Report
from app.models import FlashMetricRow
from app.query_filters import resolve_period_range


def report_date_exists(session: Session, report_date: date) -> bool:
    stmt = select(Report.id).where(Report.report_date == report_date).limit(1)
    return session.scalar(stmt) is not None


def delete_reports_for_date(session: Session, report_date: date) -> int:
    """Remove all reports (and metrics via cascade) for a calendar date."""
    stmt = select(Report).where(Report.report_date == report_date)
    reports = list(session.scalars(stmt).all())
    for report in reports:
        session.delete(report)
    if reports:
        session.commit()
    return len(reports)


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


def get_baseline_report_for_range(
    session: Session,
    *,
    range_start: date | None,
    period_end: date,
) -> Report | None:
    """
    Report immediately before the period start, used to subtract PTD totals.

    Only used when that report is in the same calendar month as period_end (flash
    PTD resets each month; April PTD must not baseline May).
    """
    if range_start is None:
        return None
    day_before = range_start - timedelta(days=1)
    baseline: Report | None = None
    for report in list_reports_deduped_by_date(session):
        if report.report_date <= day_before:
            baseline = report
        else:
            break
    if baseline is None:
        return None
    if (
        baseline.report_date.month == period_end.month
        and baseline.report_date.year == period_end.year
    ):
        return baseline
    return None


def get_report_before_date(session: Session, before: date) -> Report | None:
    """Most recent report strictly before the given calendar date."""
    candidate: Report | None = None
    for report in list_reports_deduped_by_date(session):
        if report.report_date < before:
            candidate = report
        else:
            break
    return candidate


def list_report_dates(session: Session) -> list[date]:
    reports = list_reports_deduped_by_date(session)
    return [r.report_date for r in reports]


def list_reports_in_period(
    session: Session,
    period: str,
    *,
    reference: date | None = None,
    range_start: date | None = None,
    range_end: date | None = None,
) -> list[Report]:
    if range_start is None and range_end is None:
        start, end = resolve_period_range(period, reference=reference)
    else:
        start, end = range_start, range_end
    reports = list_reports_deduped_by_date(session)
    if start is None and end is None:
        return reports
    filtered: list[Report] = []
    for report in reports:
        if start and report.report_date < start:
            continue
        if end and report.report_date > end:
            continue
        filtered.append(report)
    return filtered


def count_reports_in_period(
    session: Session,
    period: str,
    *,
    reference: date | None = None,
) -> int:
    return len(list_reports_in_period(session, period, reference=reference))


def count_unique_report_dates(session: Session) -> int:
    stmt = select(func.count(func.distinct(Report.report_date)))
    return int(session.scalar(stmt) or 0)


def list_distinct_metrics(session: Session) -> list[str]:
    stmt = select(distinct(HotelMetric.metric)).order_by(HotelMetric.metric.asc())
    return [row for row in session.scalars(stmt).all() if row]


def list_distinct_hotel_names(session: Session) -> list[str]:
    stmt = select(distinct(HotelMetric.hotel_name)).order_by(HotelMetric.hotel_name.asc())
    return [row for row in session.scalars(stmt).all() if row]


def filter_metrics_by_name(metrics: list[HotelMetric], metric: str) -> list[HotelMetric]:
    target = metric.strip().lower()
    return [m for m in metrics if m.metric.strip().lower() == target]


def get_latest_report(session: Session) -> Report | None:
    stmt = (
        select(Report)
        .options(joinedload(Report.metrics))
        .order_by(Report.report_date.desc(), Report.uploaded_at.desc())
        .limit(1)
    )
    return session.scalars(stmt).first()


def get_latest_report_in_period(
    session: Session,
    period: str,
    metric: str,
    *,
    reference: date | None = None,
) -> Report | None:
    reports = list_reports_in_period(session, period, reference=reference)
    for report in reversed(reports):
        if filter_metrics_by_name(report.metrics, metric):
            return report
    return None
