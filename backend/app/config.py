import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
_DATA_DIR_OVERRIDE = os.environ.get("DATA_DIR", "").strip()
DATA_DIR = Path(_DATA_DIR_OVERRIDE) if _DATA_DIR_OVERRIDE else BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
PDF_ARCHIVE_DIR = DATA_DIR / "pdfs"
DATABASE_URL = f"sqlite:///{DATA_DIR / 'superhost.db'}"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PDF_ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
