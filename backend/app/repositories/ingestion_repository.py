"""Persistence for ingestion logs and dashboard revision."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.database import IngestionLog, Report, SystemMeta


def create_ingestion_log(
    session: Session,
    *,
    sender: str | None,
    subject: str | None,
    attachment_filename: str | None,
    provider: str | None = None,
) -> IngestionLog:
    log = IngestionLog(
        sender=sender,
        subject=subject,
        attachment_filename=attachment_filename,
        status="received",
        provider=provider,
    )
    session.add(log)
    session.flush()
    return log


def finish_ingestion_log(
    session: Session,
    log: IngestionLog,
    *,
    status: str,
    report_id: int | None = None,
    parse_confidence: float | None = None,
    duplicate_detected: bool = False,
    error_messages: list[str] | None = None,
    parse_started_at: datetime | None = None,
) -> None:
    log.status = status
    log.parse_completed_at = datetime.now(timezone.utc)
    if parse_started_at:
        log.parse_started_at = parse_started_at
    log.report_id = report_id
    log.parse_confidence = parse_confidence
    log.duplicate_detected = duplicate_detected
    if error_messages:
        log.error_messages = json.dumps(error_messages)
    session.commit()


def update_report_ingestion(
    session: Session,
    report_id: int,
    *,
    source_email: str | None,
    subject: str | None,
    pdf_url: str | None,
    pdf_hash: str | None,
    ingestion_status: str,
    parse_confidence: float | None,
    source_type: str,
) -> None:
    report = session.get(Report, report_id)
    if not report:
        return
    report.source_email = source_email
    report.subject = subject
    report.pdf_url = pdf_url
    report.pdf_hash = pdf_hash
    report.ingestion_status = ingestion_status
    report.parse_confidence = parse_confidence
    report.source_type = source_type
    report.received_at = datetime.now(timezone.utc)
    session.commit()


def bump_dashboard_revision(session: Session) -> str:
    now = datetime.now(timezone.utc).isoformat()
    meta = session.get(SystemMeta, "dashboard_revision")
    if meta:
        meta.value = now
        meta.updated_at = datetime.now(timezone.utc)
    else:
        session.add(SystemMeta(key="dashboard_revision", value=now))
    session.commit()
    return now


def get_dashboard_revision(session: Session) -> str | None:
    meta = session.get(SystemMeta, "dashboard_revision")
    return meta.value if meta else None


def list_ingestion_logs(session: Session, *, limit: int = 50) -> list[IngestionLog]:
    stmt = select(IngestionLog).order_by(desc(IngestionLog.received_at)).limit(limit)
    return list(session.scalars(stmt).all())


def list_ingestion_reports(session: Session, *, limit: int = 50) -> list[Report]:
    from sqlalchemy.orm import joinedload

    stmt = (
        select(Report)
        .options(joinedload(Report.metrics))
        .order_by(desc(Report.uploaded_at))
        .limit(limit)
    )
    return list(session.scalars(stmt).unique().all())
