from datetime import date

from pydantic import BaseModel

from app.models import FlashMetricRow


class UploadResultItem(BaseModel):
    report_id: int
    report_date: date
    filename: str
    metric: str
    rows: list[FlashMetricRow]


class SkippedDuplicateItem(BaseModel):
    filename: str
    report_date: date
    reason: str = "Report date already exists in database"


class FailedUploadItem(BaseModel):
    filename: str
    error: str


class BatchUploadResponse(BaseModel):
    imported: list[UploadResultItem]
    skipped_duplicates: list[SkippedDuplicateItem]
    failed: list[FailedUploadItem]
    total_submitted: int
