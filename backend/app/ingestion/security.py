"""Inbound email webhook security."""

from __future__ import annotations

import os
import re
import time
from collections import defaultdict

_RATE_WINDOW_SEC = 60
_RATE_MAX_PER_IP = 30
_hits: dict[str, list[float]] = defaultdict(list)


def _env_list(key: str) -> list[str]:
    raw = os.getenv(key, "")
    return [part.strip().lower() for part in raw.split(",") if part.strip()]


def verify_webhook_secret(header_value: str | None) -> bool:
    secret = os.getenv("INBOUND_EMAIL_WEBHOOK_SECRET", "").strip()
    if not secret:
        return True
    return header_value == secret


def is_sender_allowed(sender: str) -> bool:
    sender = sender.strip().lower()
    if not sender:
        return False

    allowed_senders = _env_list("INBOUND_EMAIL_ALLOWED_SENDERS")
    allowed_domains = _env_list("INBOUND_EMAIL_ALLOWED_DOMAINS")

    if not allowed_senders and not allowed_domains:
        return True

    if sender in allowed_senders:
        return True

    match = re.search(r"<([^>]+)>", sender)
    email = (match.group(1) if match else sender).strip().lower()
    if email in allowed_senders:
        return True

    domain = email.split("@")[-1] if "@" in email else ""
    if domain and domain in allowed_domains:
        return True

    return False


def check_rate_limit(client_ip: str) -> bool:
    now = time.time()
    bucket = _hits[client_ip]
    _hits[client_ip] = [t for t in bucket if now - t < _RATE_WINDOW_SEC]
    if len(_hits[client_ip]) >= _RATE_MAX_PER_IP:
        return False
    _hits[client_ip].append(now)
    return True
