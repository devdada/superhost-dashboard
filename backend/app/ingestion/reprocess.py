"""Reprocess archived PDFs."""

from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile

from sqlalchemy.orm import Session

from app.database import Report
from app.ingestion.pdf_ingestion_service import ingest_pdf_bytes
from app.ingestion.storage import resolve_pdf_path


def reprocess_report(session: Session, report_id: int) -> dict:
    report = session.get(Report, report_id)
    if not report:
        raise ValueError("Report not found")
    path = resolve_pdf_path(report.pdf_url)
    if not path or not path.exists():
        raise ValueError("Archived PDF not found for this report")
    pdf_bytes = path.read_bytes()
    return ingest_pdf_bytes(
        session,
        pdf_bytes=pdf_bytes,
        filename=report.file_name,
        source_email=report.source_email,
        subject=report.subject,
        source_type=report.source_type or "email",
        replace_existing=True,
    )
