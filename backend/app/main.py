import os

from fastapi import FastAPI, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.database import SessionLocal, init_db
from app.models import UploadResponse
from app.schemas.command_center import CommandCenterResponse
from app.schemas.portfolio import PortfolioOperationalResponse
from app.schemas.reports import ReportInventoryResponse
from app.schemas.property import PropertyIntelligenceResponse
from app.schemas.recommendations import ExecutiveIntelligenceResponse
from app.schemas.trends import HistoricalTrendsResponse
from app.schemas.upload import BatchUploadResponse, SkippedDuplicateItem
from app.services.command_center_service import build_command_center
from app.services.reports_inventory_service import build_reports_inventory
from app.services.portfolio_service import build_portfolio_operational
from app.services.property_intelligence import build_property_intelligence
from app.services.recommendation_engine import build_executive_intelligence
from app.services.trends_analytics import build_historical_trends
from app.query_filters import (
    DEFAULT_METRIC,
    DEFAULT_PERIOD,
    PERIOD_CHOICES,
    SUPPORTED_METRICS,
    parse_date_param,
)
from app.services.upload_service import process_batch_upload, process_upload_file
from app.ingestion.email_processor import parse_inbound_payload
from app.ingestion.pdf_ingestion_service import process_inbound_email
from app.ingestion.security import check_rate_limit, is_sender_allowed, verify_webhook_secret
from app.ingestion.storage import resolve_pdf_path
from app.ingestion.reprocess import reprocess_report
from app.schemas.ingestion import (
    AdminIngestionResponse,
    InboundEmailResponse,
    IngestionItemResultSchema,
)
from app.services.admin_ingestion_service import build_admin_ingestion
from app.repositories.ingestion_repository import get_dashboard_revision

app = FastAPI(title="Superhost Dashboard API", version="0.2.0")


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    if "http://localhost:3000" not in origins:
        origins.append("http://localhost:3000")
    return origins


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str | int]:
    from sqlalchemy import func, select

    from app.database import Report, SessionLocal

    with SessionLocal() as session:
        report_count = session.scalar(select(func.count()).select_from(Report)) or 0
    return {"status": "ok", "reports": report_count}


def _parse_property_filter(properties: list[str]) -> frozenset[str] | None:
    names = {p.strip() for p in properties if p and p.strip()}
    return frozenset(names) if names else None


@app.get("/dashboard/command-center", response_model=CommandCenterResponse)
def get_command_center(
    period: str = Query(default=DEFAULT_PERIOD),
    start_date: str | None = Query(
        default=None,
        description="Custom range start (YYYY-MM-DD); overrides preset period",
    ),
    end_date: str | None = Query(
        default=None,
        description="Custom range end (YYYY-MM-DD); defaults to start_date for single day",
    ),
    properties: list[str] = Query(
        default=[],
        description="Hotel names to include; omit or empty for all properties",
    ),
) -> CommandCenterResponse:
    with SessionLocal() as session:
        return build_command_center(
            session,
            period=period,
            properties=_parse_property_filter(properties),
            start_date=parse_date_param(start_date),
            end_date=parse_date_param(end_date),
        )


@app.get("/portfolio/operational", response_model=PortfolioOperationalResponse)
def get_portfolio_operational(
    metric: str = Query(default=DEFAULT_METRIC, description="KPI metric to analyze"),
    period: str = Query(
        default=DEFAULT_PERIOD,
        description="Date filter: 7d, 30d, mtd, ytd, all",
    ),
) -> PortfolioOperationalResponse:
    with SessionLocal() as session:
        return build_portfolio_operational(session, metric=metric, period=period)


@app.get("/trends", response_model=HistoricalTrendsResponse)
def get_trends(
    metric: str = Query(default=DEFAULT_METRIC),
    period: str = Query(default=DEFAULT_PERIOD),
) -> HistoricalTrendsResponse:
    with SessionLocal() as session:
        return build_historical_trends(session, metric=metric, period=period)


@app.get("/filters/options")
def get_filter_options() -> dict:
    from app.repositories.report_repository import list_distinct_metrics

    from app.repositories.report_repository import list_distinct_hotel_names

    with SessionLocal() as session:
        stored_metrics = list_distinct_metrics(session)
        hotel_names = list_distinct_hotel_names(session)

    return {
        "metrics": list(SUPPORTED_METRICS),
        "stored_metrics": stored_metrics,
        "properties": hotel_names,
        "periods": [
            {"id": "7d", "label": "7D"},
            {"id": "30d", "label": "30D"},
            {"id": "mtd", "label": "MTD"},
            {"id": "ytd", "label": "YTD"},
            {"id": "all", "label": "All time"},
        ],
        "default_metric": DEFAULT_METRIC,
        "default_period": DEFAULT_PERIOD,
        "period_ids": list(PERIOD_CHOICES),
    }


@app.get("/executive-intelligence", response_model=ExecutiveIntelligenceResponse)
def get_executive_intelligence() -> ExecutiveIntelligenceResponse:
    with SessionLocal() as session:
        return build_executive_intelligence(session)


@app.get("/properties/{hotel_name:path}", response_model=PropertyIntelligenceResponse)
def get_property_intelligence(hotel_name: str) -> PropertyIntelligenceResponse:
    with SessionLocal() as session:
        try:
            return build_property_intelligence(session, hotel_name)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)) -> UploadResponse:
    with SessionLocal() as session:
        try:
            outcome = await process_upload_file(session, file, seen_dates=set())
            if isinstance(outcome, SkippedDuplicateItem):
                raise HTTPException(
                    status_code=409,
                    detail={
                        "message": outcome.reason,
                        "filename": outcome.filename,
                        "report_date": outcome.report_date.isoformat(),
                    },
                )
            return UploadResponse(
                report_id=outcome.report_id,
                report_date=outcome.report_date,
                filename=outcome.filename,
                metric=outcome.metric,
                rows=outcome.rows,
            )
        except HTTPException:
            raise
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Failed to parse PDF") from exc


@app.post("/upload/batch", response_model=BatchUploadResponse)
async def upload_pdf_batch(
    files: list[UploadFile] = File(...),
    replace_existing: bool = Query(
        False,
        description="Replace reports that share the same date (re-import all 5 metrics)",
    ),
) -> BatchUploadResponse:
    if not files:
        raise HTTPException(status_code=400, detail="At least one PDF file is required")

    with SessionLocal() as session:
        return await process_batch_upload(session, files, replace_existing=replace_existing)


@app.get("/reports/inventory", response_model=ReportInventoryResponse)
def get_reports_inventory() -> ReportInventoryResponse:
    with SessionLocal() as session:
        return build_reports_inventory(session)


@app.post("/inbound-email", response_model=InboundEmailResponse)
async def inbound_email(request: Request) -> InboundEmailResponse:
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    secret = request.headers.get("X-Webhook-Secret") or request.headers.get(
        "X-Inbound-Email-Secret"
    )
    if not verify_webhook_secret(secret):
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Empty payload")

    try:
        email = parse_inbound_payload(body, request.headers.get("content-type"))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid email payload: {exc}") from exc

    if not is_sender_allowed(email.sender):
        raise HTTPException(status_code=403, detail="Sender not approved")

    with SessionLocal() as session:
        result = process_inbound_email(session, email)
        return InboundEmailResponse(
            ok=result.ok,
            processed=result.processed,
            duplicates=result.duplicates,
            failed=result.failed,
            results=[IngestionItemResultSchema.model_validate(item.__dict__) for item in result.results],
            dashboard_revision=result.dashboard_revision,
            errors=result.errors,
        )


@app.get("/dashboard/revision")
def dashboard_revision() -> dict:
    with SessionLocal() as session:
        return {"revision": get_dashboard_revision(session)}


@app.get("/admin/ingestion", response_model=AdminIngestionResponse)
def admin_ingestion(
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> AdminIngestionResponse:
    expected = os.getenv("ADMIN_API_KEY", "").strip()
    if expected and x_admin_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")
    with SessionLocal() as session:
        return build_admin_ingestion(session)


@app.post("/admin/ingestion/{report_id}/reprocess")
def admin_reprocess_report(
    report_id: int,
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> dict:
    expected = os.getenv("ADMIN_API_KEY", "").strip()
    if expected and x_admin_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")
    with SessionLocal() as session:
        try:
            item = reprocess_report(session, report_id)
            return item.__dict__
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/admin/ingestion/{report_id}/pdf")
def admin_view_pdf(
    report_id: int,
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
):
    expected = os.getenv("ADMIN_API_KEY", "").strip()
    if expected and x_admin_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")
    from app.database import Report

    with SessionLocal() as session:
        report = session.get(Report, report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        path = resolve_pdf_path(report.pdf_url)
        if not path:
            raise HTTPException(status_code=404, detail="PDF archive not found")
        return FileResponse(path, media_type="application/pdf", filename=report.file_name)


@app.get("/reports/{report_id}")
def get_report(report_id: int) -> dict:
    from app.database import Report

    with SessionLocal() as session:
        report = session.get(Report, report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        return {
            "report_id": report.id,
            "report_date": report.report_date.isoformat(),
            "filename": report.file_name,
            "uploaded_at": report.uploaded_at.isoformat(),
            "rows": [
                {
                    "hotel": m.hotel_name,
                    "metric": m.metric,
                    "forecast": m.forecast,
                    "budget": m.budget,
                    "variance_percent": m.variance_percent,
                }
                for m in report.metrics
            ],
        }
