from datetime import date, datetime, timezone
from typing import List, Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker
from sqlalchemy import create_engine

from app.config import DATABASE_URL


class Base(DeclarativeBase):
    pass


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(512), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    source_email = mapped_column(String(320), nullable=True)
    subject = mapped_column(String(512), nullable=True)
    pdf_url = mapped_column(String(1024), nullable=True)
    pdf_hash = mapped_column(String(64), nullable=True, index=True)
    ingestion_status: Mapped[str] = mapped_column(String(32), default="manual", index=True)
    parse_confidence = mapped_column(Float, nullable=True)
    source_type: Mapped[str] = mapped_column(String(32), default="manual")
    received_at = mapped_column(DateTime(timezone=True), nullable=True)

    metrics: Mapped[List["HotelMetric"]] = relationship(
        back_populates="report",
        cascade="all, delete-orphan",
    )


class HotelMetric(Base):
    __tablename__ = "hotel_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.id"), nullable=False, index=True)
    hotel_name: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    metric: Mapped[str] = mapped_column(String(128), nullable=False)
    forecast: Mapped[float] = mapped_column(Float, nullable=False)
    budget: Mapped[float] = mapped_column(Float, nullable=False)
    variance_percent: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    report: Mapped["Report"] = relationship(back_populates="metrics")


class IngestionLog(Base):
    __tablename__ = "ingestion_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    parse_started_at = mapped_column(DateTime(timezone=True), nullable=True)
    parse_completed_at = mapped_column(DateTime(timezone=True), nullable=True)
    sender = mapped_column(String(320), nullable=True)
    subject = mapped_column(String(512), nullable=True)
    attachment_filename = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="received", index=True)
    duplicate_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    parse_confidence = mapped_column(Float, nullable=True)
    report_id = mapped_column(ForeignKey("reports.id"), nullable=True)
    error_messages = mapped_column(Text, nullable=True)
    provider = mapped_column(String(32), nullable=True)


class SystemMeta(Base):
    __tablename__ = "system_meta"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(String(256), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

_REPORT_COLUMNS = {
    "source_email": "VARCHAR(320)",
    "subject": "VARCHAR(512)",
    "pdf_url": "VARCHAR(1024)",
    "pdf_hash": "VARCHAR(64)",
    "ingestion_status": "VARCHAR(32) DEFAULT 'manual'",
    "parse_confidence": "FLOAT",
    "source_type": "VARCHAR(32) DEFAULT 'manual'",
    "received_at": "DATETIME",
}


def _migrate_sqlite() -> None:
    with engine.connect() as conn:
        existing = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(reports)")).fetchall()
        }
        for col, ddl in _REPORT_COLUMNS.items():
            if col not in existing:
                conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col} {ddl}"))
        conn.commit()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_sqlite()
