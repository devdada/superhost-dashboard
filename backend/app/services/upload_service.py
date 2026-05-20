"""Ingest Daily Flash PDFs with duplicate report-date handling."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.config import UPLOAD_DIR
from app.models import FlashMetricRow
from app.parser import extract_flash_table
from app.repositories.report_repository import create_report_with_metrics, report_date_exists
from app.schemas.upload import (
    BatchUploadResponse,
    FailedUploadItem,
    SkippedDuplicateItem,
    UploadResultItem,
)


@dataclass
class _IngestSuccess:
    report_id: int
    report_date: date
    filename: str
    metric: str
    rows: list[FlashMetricRow]


@dataclass
class _IngestSkipped:
    filename: str
    report_date: date
    reason: str


async def _save_temp_upload(file: UploadFile) -> Path:
    temp_path = UPLOAD_DIR / f"{uuid.uuid4().hex}.pdf"
    content = await file.read()
    if not content:
        raise ValueError("Uploaded file is empty")
    temp_path.write_bytes(content)
    return temp_path


def ingest_pdf_file(
    session: Session,
    *,
    temp_path: Path,
    filename: str,
    seen_dates: set[date],
) -> _IngestSuccess | _IngestSkipped:
    metric, report_date, rows = extract_flash_table(temp_path)

    if report_date in seen_dates:
        return _IngestSkipped(
            filename=filename,
            report_date=report_date,
            reason="Duplicate report date in this upload batch",
        )

    if report_date_exists(session, report_date):
        return _IngestSkipped(
            filename=filename,
            report_date=report_date,
            reason="Report date already exists in database",
        )

    report = create_report_with_metrics(
        session,
        report_date=report_date,
        file_name=filename,
        rows=rows,
    )
    seen_dates.add(report_date)

    return _IngestSuccess(
        report_id=report.id,
        report_date=report_date,
        filename=filename,
        metric=metric,
        rows=rows,
    )


async def process_upload_file(
    session: Session,
    file: UploadFile,
    seen_dates: set[date],
) -> UploadResultItem | SkippedDuplicateItem:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise ValueError("Only PDF files are supported")

    temp_path = await _save_temp_upload(file)
    try:
        result = ingest_pdf_file(
            session,
            temp_path=temp_path,
            filename=file.filename,
            seen_dates=seen_dates,
        )
        if isinstance(result, _IngestSkipped):
            return SkippedDuplicateItem(
                filename=result.filename,
                report_date=result.report_date,
                reason=result.reason,
            )
        return UploadResultItem(
            report_id=result.report_id,
            report_date=result.report_date,
            filename=result.filename,
            metric=result.metric,
            rows=result.rows,
        )
    finally:
        if temp_path.exists():
            temp_path.unlink()


async def process_batch_upload(
    session: Session,
    files: list[UploadFile],
) -> BatchUploadResponse:
    imported: list[UploadResultItem] = []
    skipped: list[SkippedDuplicateItem] = []
    failed: list[FailedUploadItem] = []
    seen_dates: set[date] = set()

    for file in files:
        try:
            outcome = await process_upload_file(session, file, seen_dates)
            if isinstance(outcome, SkippedDuplicateItem):
                skipped.append(outcome)
            else:
                imported.append(outcome)
        except ValueError as exc:
            failed.append(
                FailedUploadItem(
                    filename=file.filename or "unknown.pdf",
                    error=str(exc),
                )
            )
        except Exception as exc:
            failed.append(
                FailedUploadItem(
                    filename=file.filename or "unknown.pdf",
                    error=str(exc) or "Failed to process PDF",
                )
            )

    return BatchUploadResponse(
        imported=imported,
        skipped_duplicates=skipped,
        failed=failed,
        total_submitted=len(files),
    )
