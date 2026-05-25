from __future__ import annotations

import os
import secrets

from fastapi import HTTPException, Request, status

from app.schemas.auth import AuthUserResponse, LoginRequest

SESSION_USER_KEY = "auth_email"
DEV_DEFAULTS = {
    "AUTH_ADMIN_EMAIL": "admin@localhost",
    "AUTH_ADMIN_PASSWORD": "changeme",
    "AUTH_SESSION_SECRET": "dev-session-secret-change-me",
}


def _is_local_dev() -> bool:
    render = os.getenv("RENDER", "").strip()
    if render:
        return False
    cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    return "localhost" in cors_origins or "127.0.0.1" in cors_origins


def _is_remote_deploy() -> bool:
    return not _is_local_dev()


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value and _is_local_dev():
        return DEV_DEFAULTS[name]
    if not value:
        raise RuntimeError(f"Missing required auth setting: {name}")
    return value


def validate_auth_config() -> None:
    _required_env("AUTH_ADMIN_EMAIL")
    _required_env("AUTH_ADMIN_PASSWORD")
    _required_env("AUTH_SESSION_SECRET")


def auth_admin_email() -> str:
    return _required_env("AUTH_ADMIN_EMAIL")


def auth_session_secret() -> str:
    return _required_env("AUTH_SESSION_SECRET")


def auth_session_same_site() -> str:
    default = "none" if _is_remote_deploy() else "lax"
    same_site = os.getenv("AUTH_SESSION_SAME_SITE", default).strip().lower() or default
    if same_site not in {"lax", "strict", "none"}:
        return default
    return same_site


def auth_session_https_only() -> bool:
    raw = os.getenv("AUTH_SESSION_HTTPS_ONLY", "").strip().lower()
    if raw in {"1", "true", "yes", "on"}:
        return True
    if raw in {"0", "false", "no", "off"}:
        return False
    return _is_remote_deploy() or auth_session_same_site() == "none"


def auth_session_max_age() -> int:
    raw = os.getenv("AUTH_SESSION_MAX_AGE", "604800").strip()
    try:
        return max(300, int(raw))
    except ValueError:
        return 604800


def admin_user() -> AuthUserResponse:
    return AuthUserResponse(email=auth_admin_email(), role="admin")


def authenticate_admin(payload: LoginRequest) -> bool:
    expected_email = auth_admin_email().casefold()
    expected_password = _required_env("AUTH_ADMIN_PASSWORD")
    return secrets.compare_digest(payload.email.strip().casefold(), expected_email) and secrets.compare_digest(
        payload.password,
        expected_password,
    )


def current_admin(request: Request) -> AuthUserResponse:
    email = str(request.session.get(SESSION_USER_KEY, "")).strip()
    if not email or not secrets.compare_digest(email.casefold(), auth_admin_email().casefold()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return admin_user()


def login_admin(request: Request, user: AuthUserResponse) -> None:
    request.session.clear()
    request.session[SESSION_USER_KEY] = user.email
    request.session["role"] = user.role


def logout_admin(request: Request) -> None:
    request.session.clear()
