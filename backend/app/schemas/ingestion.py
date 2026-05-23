from datetime import date, datetime

from pydantic import BaseModel, Field


class IngestionItemResultSchema(BaseModel):
    filename: str
    status: str
    report_id: int | None = None
    report_date: str | None = None
    duplicate: bool = False
    message: str | None = None
    parse_confidence: float | None = None


class InboundEmailResponse(BaseModel):
    ok: bool
    processed: int = 0
    duplicates: int = 0
    failed: int = 0
    results: list[IngestionItemResultSchema] = Field(default_factory=list)
    dashboard_revision: str | None = None
    errors: list[str] = Field(default_factory=list)


class IngestionLogItem(BaseModel):
    id: int
    received_at: datetime
    parse_started_at: datetime | None
    parse_completed_at: datetime | None
    sender: str | None
    subject: str | None
    attachment_filename: str | None
    status: str
    duplicate_detected: bool
    parse_confidence: float | None
    report_id: int | None
    error_messages: list[str] = Field(default_factory=list)
    provider: str | None = None


class IngestionReportItem(BaseModel):
    id: int
    report_date: date
    file_name: str
    uploaded_at: datetime
    source_email: str | None
    subject: str | None
    pdf_url: str | None
    ingestion_status: str
    parse_confidence: float | None
    source_type: str
    metrics_count: int = 0


class AdminIngestionResponse(BaseModel):
    logs: list[IngestionLogItem]
    reports: list[IngestionReportItem]
    dashboard_revision: str | None
    last_success_at: datetime | None
