"""Parse inbound email payloads (Postmark, SendGrid, Mailgun-compatible)."""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any


@dataclass
class InboundAttachment:
    filename: str
    content_type: str
    content: bytes


@dataclass
class InboundEmail:
    sender: str
    subject: str
    received_at: datetime
    attachments: list[InboundAttachment]
    provider: str


def _decode_attachment_content(raw: Any) -> bytes | None:
    if raw is None:
        return None
    if isinstance(raw, bytes):
        return raw
    if isinstance(raw, str):
        try:
            return base64.b64decode(raw)
        except Exception:
            return None
    return None


def _parse_received_at(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


def parse_postmark(payload: dict[str, Any]) -> InboundEmail:
    attachments: list[InboundAttachment] = []
    for item in payload.get("Attachments") or []:
        content = _decode_attachment_content(item.get("Content"))
        if not content:
            continue
        attachments.append(
            InboundAttachment(
                filename=str(item.get("Name") or "attachment.pdf"),
                content_type=str(item.get("ContentType") or "application/octet-stream"),
                content=content,
            )
        )
    return InboundEmail(
        sender=str(payload.get("From") or payload.get("FromFull", {}).get("Email") or ""),
        subject=str(payload.get("Subject") or ""),
        received_at=_parse_received_at(payload.get("Date")),
        attachments=attachments,
        provider="postmark",
    )


def parse_sendgrid(payload: dict[str, Any]) -> InboundEmail:
    attachments: list[InboundAttachment] = []
    raw_count = int(payload.get("attachments") or payload.get("attachment-count") or 0)
    for idx in range(raw_count):
        content = _decode_attachment_content(payload.get(f"attachment{idx + 1}"))
        if not content:
            continue
        attachments.append(
            InboundAttachment(
                filename=str(payload.get(f"attachment-info{idx + 1}", f"file{idx + 1}.pdf")),
                content_type=str(payload.get(f"attachment-type{idx + 1}", "application/pdf")),
                content=content,
            )
        )
    for item in payload.get("Files") or []:
        content = _decode_attachment_content(item.get("content") or item.get("data"))
        if content:
            attachments.append(
                InboundAttachment(
                    filename=str(item.get("filename") or "attachment.pdf"),
                    content_type=str(item.get("type") or "application/pdf"),
                    content=content,
                )
            )
    return InboundEmail(
        sender=str(payload.get("from") or payload.get("sender") or ""),
        subject=str(payload.get("subject") or ""),
        received_at=_parse_received_at(payload.get("date")),
        attachments=attachments,
        provider="sendgrid",
    )


def parse_mailgun(payload: dict[str, Any]) -> InboundEmail:
    attachments: list[InboundAttachment] = []
    for item in payload.get("attachments") or []:
        if isinstance(item, dict):
            content = _decode_attachment_content(item.get("content"))
            if content:
                attachments.append(
                    InboundAttachment(
                        filename=str(item.get("name") or "attachment.pdf"),
                        content_type=str(item.get("content-type") or "application/pdf"),
                        content=content,
                    )
                )
    count = int(payload.get("attachment-count") or 0)
    for idx in range(1, count + 1):
        content = _decode_attachment_content(payload.get(f"attachment-{idx}"))
        if content:
            attachments.append(
                InboundAttachment(
                    filename=str(payload.get(f"attachment-{idx}-name") or f"attachment-{idx}.pdf"),
                    content_type=str(
                        payload.get(f"attachment-{idx}-content-type") or "application/pdf"
                    ),
                    content=content,
                )
            )
    return InboundEmail(
        sender=str(payload.get("sender") or payload.get("From") or ""),
        subject=str(payload.get("subject") or payload.get("Subject") or ""),
        received_at=_parse_received_at(payload.get("Date") or payload.get("timestamp")),
        attachments=attachments,
        provider="mailgun",
    )


def parse_inbound_payload(body: bytes, content_type: str | None) -> InboundEmail:
    """Detect provider and normalize inbound email."""
    if "application/json" in (content_type or ""):
        payload = json.loads(body.decode("utf-8") or "{}")
    else:
        try:
            payload = json.loads(body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            payload = {"raw": body.decode("utf-8", errors="replace")}

    if "Attachments" in payload and ("From" in payload or "FromFull" in payload):
        return parse_postmark(payload)
    if "attachment-count" in payload or payload.get("envelope"):
        return parse_mailgun(payload)
    if "from" in payload or "Files" in payload:
        return parse_sendgrid(payload)
    return parse_postmark(payload)


def extract_pdf_attachments(email: InboundEmail) -> list[InboundAttachment]:
    pdfs: list[InboundAttachment] = []
    for att in email.attachments:
        name = att.filename.lower()
        if att.content_type == "application/pdf" or name.endswith(".pdf"):
            if att.content:
                pdfs.append(att)
    return pdfs
