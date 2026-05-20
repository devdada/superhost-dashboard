import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.database import SessionLocal, init_db
from app.models import UploadResponse
from app.schemas.portfolio import PortfolioOperationalResponse
from app.schemas.property import PropertyIntelligenceResponse
from app.schemas.recommendations import ExecutiveIntelligenceResponse
from app.schemas.trends import HistoricalTrendsResponse
from app.schemas.upload import BatchUploadResponse, SkippedDuplicateItem
from app.services.portfolio_service import build_portfolio_operational
from app.services.property_intelligence import build_property_intelligence
from app.services.recommendation_engine import build_executive_intelligence
from app.services.trends_analytics import build_historical_trends
from app.services.upload_service import process_batch_upload, process_upload_file

app = FastAPI(title="Superhost Command Center API", version="0.2.0")


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
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/portfolio/operational", response_model=PortfolioOperationalResponse)
def get_portfolio_operational() -> PortfolioOperationalResponse:
    with SessionLocal() as session:
        return build_portfolio_operational(session)


@app.get("/trends", response_model=HistoricalTrendsResponse)
def get_trends() -> HistoricalTrendsResponse:
    with SessionLocal() as session:
        return build_historical_trends(session)


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
) -> BatchUploadResponse:
    if not files:
        raise HTTPException(status_code=400, detail="At least one PDF file is required")

    with SessionLocal() as session:
        return await process_batch_upload(session, files)


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
