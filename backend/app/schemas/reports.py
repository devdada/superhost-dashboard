from datetime import date, datetime

from pydantic import BaseModel

CORE_METRICS: tuple[str, ...] = (
    "Revenue",
    "Room Revenue",
    "Occupancy",
    "ADR",
    "RevPAR",
)


class ReportInventoryItem(BaseModel):
    report_id: int
    report_date: date
    file_name: str
    uploaded_at: datetime
    hotel_count: int
    metrics_present: list[str]
    metric_row_counts: dict[str, int]
    parse_status: str  # full | partial | revenue_only | empty
    parse_label: str
    is_complete: bool


class ReportInventoryResponse(BaseModel):
    total: int
    full_parse_count: int
    reports: list[ReportInventoryItem]
