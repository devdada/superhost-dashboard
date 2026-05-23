"""Admin ingestion panel aggregation."""

from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.database import Report
from app.repositories.ingestion_repository import (
    get_dashboard_revision,
    list_ingestion_logs,
    list_ingestion_reports,
)
from app.schemas.ingestion import (
    AdminIngestionResponse,
    IngestionLogItem,
    IngestionReportItem,
)


def build_admin_ingestion(session: Session) -> AdminIngestionResponse:
    logs = list_ingestion_logs(session, limit=80)
    reports = list_ingestion_reports(session, limit=80)
    last_success = None
    log_items: list[IngestionLogItem] = []
    for log in logs:
        errors: list[str] = []
        if log.error_messages:
            try:
                errors = json.loads(log.error_messages)
            except json.JSONDecodeError:
                errors = [log.error_messages]
        if log.status == "success" and last_success is None:
            last_success = log.parse_completed_at or log.received_at
        log_items.append(
            IngestionLogItem(
                id=log.id,
                received_at=log.received_at,
                parse_started_at=log.parse_started_at,
                parse_completed_at=log.parse_completed_at,
                sender=log.sender,
                subject=log.subject,
                attachment_filename=log.attachment_filename,
                status=log.status,
                duplicate_detected=log.duplicate_detected,
                parse_confidence=log.parse_confidence,
                report_id=log.report_id,
                error_messages=errors,
                provider=log.provider,
            )
        )

    report_items: list[IngestionReportItem] = []
    for report in reports:
        metrics_count = len(report.metrics) if report.metrics else 0
        if not metrics_count and report.id:
            r = session.get(Report, report.id)
            metrics_count = len(r.metrics) if r else 0
        report_items.append(
            IngestionReportItem(
                id=report.id,
                report_date=report.report_date,
                file_name=report.file_name,
                uploaded_at=report.uploaded_at,
                source_email=report.source_email,
                subject=report.subject,
                pdf_url=report.pdf_url,
                ingestion_status=report.ingestion_status or "manual",
                parse_confidence=report.parse_confidence,
                source_type=report.source_type or "manual",
                metrics_count=metrics_count,
            )
        )

    return AdminIngestionResponse(
        logs=log_items,
        reports=report_items,
        dashboard_revision=get_dashboard_revision(session),
        last_success_at=last_success,
    )
