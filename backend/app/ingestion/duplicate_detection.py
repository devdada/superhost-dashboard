"""Duplicate PDF detection before ingestion."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import Report


@dataclass
class DuplicateCheckResult:
    is_duplicate: bool
    reason: str | None = None
    existing_report_id: int | None = None
    pdf_hash: str | None = None


def sha256_pdf(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def find_duplicate_by_hash(session: Session, pdf_hash: str) -> Report | None:
    stmt = select(Report).where(Report.pdf_hash == pdf_hash).limit(1)
    return session.scalars(stmt).first()


def find_duplicate_by_date_filename(
    session: Session,
    *,
    report_date: date,
    filename: str,
) -> Report | None:
    stmt = (
        select(Report)
        .where(Report.report_date == report_date, Report.file_name == filename)
        .limit(1)
    )
    return session.scalars(stmt).first()


def check_duplicate(
    session: Session,
    *,
    pdf_bytes: bytes,
    report_date: date | None = None,
    filename: str | None = None,
) -> DuplicateCheckResult:
    pdf_hash = sha256_pdf(pdf_bytes)
    by_hash = find_duplicate_by_hash(session, pdf_hash)
    if by_hash:
        return DuplicateCheckResult(
            is_duplicate=True,
            reason="PDF hash already ingested",
            existing_report_id=by_hash.id,
            pdf_hash=pdf_hash,
        )
    if report_date and filename:
        by_meta = find_duplicate_by_date_filename(
            session, report_date=report_date, filename=filename
        )
        if by_meta:
            return DuplicateCheckResult(
                is_duplicate=True,
                reason="Report date and filename already exist",
                existing_report_id=by_meta.id,
                pdf_hash=pdf_hash,
            )
    return DuplicateCheckResult(is_duplicate=False, pdf_hash=pdf_hash)
