from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
PDF_ARCHIVE_DIR = DATA_DIR / "pdfs"
DATABASE_URL = f"sqlite:///{DATA_DIR / 'superhost.db'}"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PDF_ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
