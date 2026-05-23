"""Orchestrate inbound PDF ingestion end-to-end."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any

from sqlalchemy.orm import Session

from app.ingestion.duplicate_detection import check_duplicate
from app.ingestion.email_processor import InboundEmail, extract_pdf_attachments
from app.ingestion.metrics_engine import parse_pdf_file
from app.ingestion.storage import archive_pdf
from app.repositories.ingestion_repository import (
    bump_dashboard_revision,
    create_ingestion_log,
    finish_ingestion_log,
    update_report_ingestion,
)
from app.repositories.report_repository import (
    create_report_with_metrics,
    delete_reports_for_date,
    report_date_exists,
)
from app.services.upload_service import _IngestSkipped, _IngestSuccess, ingest_pdf_file


@dataclass
class IngestionItemResult:
    filename: str
    status: str
    report_id: int | None = None
    report_date: str | None = None
    duplicate: bool = False
    message: str | None = None
    parse_confidence: float | None = None


@dataclass
class InboundIngestionResponse:
    ok: bool
    processed: int = 0
    duplicates: int = 0
    failed: int = 0
    results: list[IngestionItemResult] = field(default_factory=list)
    dashboard_revision: str | None = None
    errors: list[str] = field(default_factory=list)


def _ingestion_status_from_confidence(confidence: float, row_count: int) -> str:
    if row_count == 0:
        return "failed"
    if confidence >= 0.75:
        return "parsed"
    if confidence >= 0.4:
        return "partial"
    return "partial"


def ingest_pdf_bytes(
    session: Session,
    *,
    pdf_bytes: bytes,
    filename: str,
    source_email: str | None = None,
    subject: str | None = None,
    source_type: str = "email",
    replace_existing: bool = False,
) -> IngestionItemResult:
    log = create_ingestion_log(
        session,
        sender=source_email,
        subject=subject,
        attachment_filename=filename,
        provider=source_type,
    )
    try:
        with NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = Path(tmp.name)

        parse_started = datetime.now(timezone.utc)
        dup = check_duplicate(session, pdf_bytes=pdf_bytes, filename=filename)
        if dup.is_duplicate:
            finish_ingestion_log(
                session,
                log,
                status="duplicate",
                duplicate_detected=True,
                error_messages=[dup.reason or "Duplicate"],
                parse_confidence=None,
            )
            tmp_path.unlink(missing_ok=True)
            return IngestionItemResult(
                filename=filename,
                status="duplicate",
                duplicate=True,
                message=dup.reason,
            )

        pdf_url = archive_pdf(pdf_hash=dup.pdf_hash or "", content=pdf_bytes, filename=filename)
        outcome = parse_pdf_file(tmp_path)
        dup_after = check_duplicate(
            session,
            pdf_bytes=pdf_bytes,
            report_date=outcome.report_date,
            filename=filename,
        )
        if dup_after.is_duplicate and dup_after.existing_report_id:
            finish_ingestion_log(
                session,
                log,
                status="duplicate",
                duplicate_detected=True,
                error_messages=[dup_after.reason or "Duplicate after parse"],
            )
            tmp_path.unlink(missing_ok=True)
            return IngestionItemResult(
                filename=filename,
                status="duplicate",
                duplicate=True,
                message=dup_after.reason,
            )

        seen: set = set()
        if replace_existing and report_date_exists(session, outcome.report_date):
            delete_reports_for_date(session, outcome.report_date)

        ingest = ingest_pdf_file(
            session,
            temp_path=tmp_path,
            filename=filename,
            seen_dates=seen,
            replace_existing=replace_existing,
        )
        if isinstance(ingest, _IngestSkipped):
            finish_ingestion_log(
                session,
                log,
                status="duplicate",
                duplicate_detected=True,
                error_messages=[ingest.reason],
            )
            tmp_path.unlink(missing_ok=True)
            return IngestionItemResult(
                filename=filename,
                status="duplicate",
                duplicate=True,
                message=ingest.reason,
            )

        if not isinstance(ingest, _IngestSuccess):
            raise ValueError("Unexpected ingest outcome")

        status = _ingestion_status_from_confidence(outcome.parse_confidence, outcome.metrics_stored)
        update_report_ingestion(
            session,
            ingest.report_id,
            source_email=source_email,
            subject=subject,
            pdf_url=pdf_url,
            pdf_hash=dup.pdf_hash,
            ingestion_status=status,
            parse_confidence=outcome.parse_confidence,
            source_type=source_type,
        )

        finish_ingestion_log(
            session,
            log,
            status="success" if status in {"parsed", "partial"} else "failed",
            report_id=ingest.report_id,
            parse_confidence=outcome.parse_confidence,
            error_messages=outcome.warnings,
            parse_started_at=parse_started,
        )
        tmp_path.unlink(missing_ok=True)
        return IngestionItemResult(
            filename=filename,
            status=status,
            report_id=ingest.report_id,
            report_date=ingest.report_date.isoformat(),
            parse_confidence=outcome.parse_confidence,
            message="Ingested successfully",
        )
    except Exception as exc:
        finish_ingestion_log(
            session,
            log,
            status="failed",
            error_messages=[str(exc)],
        )
        return IngestionItemResult(
            filename=filename,
            status="failed",
            message=str(exc),
        )


def process_inbound_email(
    session: Session,
    email: InboundEmail,
    *,
    replace_existing: bool = False,
) -> InboundIngestionResponse:
    response = InboundIngestionResponse(ok=True)
    pdfs = extract_pdf_attachments(email)
    if not pdfs:
        response.ok = False
        response.errors.append("No PDF attachments found")
        return response

    for att in pdfs:
        item = ingest_pdf_bytes(
            session,
            pdf_bytes=att.content,
            filename=att.filename,
            source_email=email.sender,
            subject=email.subject,
            source_type="email",
            replace_existing=replace_existing,
        )
        response.results.append(item)
        if item.duplicate:
            response.duplicates += 1
        elif item.status == "failed":
            response.failed += 1
        elif item.report_id:
            response.processed += 1

    if response.processed > 0:
        response.dashboard_revision = bump_dashboard_revision(session)
    return response
