"""Persist raw PDFs for ingestion and reprocessing."""

from __future__ import annotations

from pathlib import Path

from app.config import PDF_ARCHIVE_DIR


def archive_pdf(*, pdf_hash: str, content: bytes, filename: str) -> str:
    """Store PDF under data/pdfs/{hash}.pdf; return relative URL path."""
    PDF_ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in filename)[:120]
    path = PDF_ARCHIVE_DIR / f"{pdf_hash}_{safe_name}"
    if not path.suffix.lower() == ".pdf":
        path = path.with_suffix(".pdf")
    path.write_bytes(content)
    return f"/storage/pdfs/{path.name}"


def resolve_pdf_path(pdf_url: str | None) -> Path | None:
    if not pdf_url:
        return None
    name = pdf_url.rsplit("/", 1)[-1]
    candidate = PDF_ARCHIVE_DIR / name
    return candidate if candidate.exists() else None
