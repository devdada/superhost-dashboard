# Superhost Dashboard (Local MVP)

Monorepo for ingesting Superhost **Daily Flash** PDF reports, persisting historical metrics in SQLite, and surfacing operational + trend intelligence.

## Project structure

```
superhost-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py                    # API routes
│   │   ├── parser.py                  # PDF extraction + report date
│   │   ├── database.py                # reports + hotel_metrics tables
│   │   ├── repositories/              # DB write/read
│   │   ├── services/trends_analytics.py
│   │   └── schemas/trends.py
│   └── data/superhost.db              # SQLite (runtime)
└── frontend/
    └── src/
        ├── lib/analytics.ts           # Single-report insights
        ├── lib/trends.ts              # Historical trends API client
        └── components/
            ├── insights/              # Portfolio insights (snapshot)
            └── trends/                # Historical trends + Recharts
```

## Database schema (SQLite)

**reports** — `id`, `report_date`, `file_name`, `uploaded_at`

**hotel_metrics** — `id`, `report_id`, `hotel_name`, `metric`, `forecast`, `budget`, `variance_percent`, `created_at`

Every PDF upload creates one report row and one metric row per hotel.

## Install & run

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

If port 8000 is already in use, pick another port (e.g. **8001**) and set the same value in `frontend/.env.local`:

```bash
uvicorn app.main:app --reload --port 8001
```

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8001
```

Restart `npm run dev` after changing `.env.local`.

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) · API docs: `http://localhost:<API_PORT>/docs` (e.g. [8001/docs](http://localhost:8001/docs))

## Deploy (Render)

Deploy **both** frontend and backend on [Render](https://render.com) with SQLite on a persistent disk. See **[DEPLOY.md](./DEPLOY.md)** and [`render.yaml`](./render.yaml) (Blueprint).

## Dashboard (Command Center)

Executive operations UI at `/` — KPI header, Action Intelligence alerts, hotel heatmap, trend charts, top/worst performers. Upload PDFs at `/reports`.

API: `GET /dashboard/command-center?period=7d|30d|mtd|ytd|all`

### Inbound email ingestion

Forward daily PDFs to `reports@yourdomain.com` (Postmark/SendGrid/Mailgun → `POST /api/inbound-email`). Admin panel: `/admin/ingestion`. Details: [docs/INGESTION.md](docs/INGESTION.md).

## Features

### Single-report (after upload)
- **Multi-metric ingestion** — each Daily Flash PDF parses pages 1–5: Revenue, Room Revenue, Occupancy, ADR, RevPAR (~85 rows per file for 17 hotels)
- Portfolio summary cards
- Critical / watch / strong insights (rule-based)
- Detail table with row highlighting
- **Dashboard filters** — segmented timeline (7D, 30D, MTD, YTD, All). Ranges end on the latest report day (prior calendar day).

### Executive action intelligence
- **Portfolio Executive Summary** — health score (0–100), biggest risk, top performer, emerging concern
- **Executive Recommendations** — action cards with priority, owner, severity, categories (Revenue / Occupancy / ADR / RevPAR), and checklists
- Rules-driven (no AI): critical variance, persistent misses, declining trends, strong performers ≥ +15%

### Historical trends (persists across uploads)
- Total reports uploaded
- Top / worst performers over time (avg variance %)
- Portfolio average variance line chart (Recharts)
- Hotel variance trend lines
- **Persistent risks** — 3+ consecutive budget misses
- **Improving / declining** — strict 3-report variance trends

Upload the same PDF multiple times locally to simulate history and populate charts.

### Property intelligence pages
Click any **hotel name** on the portfolio dashboard to open `/properties/[hotelName]` — a Bloomberg-style asset view with executive summary, health score, KPI trends, risk drivers, benchmarks, and action checklists.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/upload` | Parse one PDF (409 if report date already exists) |
| POST | `/upload/batch` | Parse multiple PDFs; skip duplicate report dates |
| GET | `/trends` | Historical trend intelligence payload |
| GET | `/executive-intelligence` | Executive summary + recommendation cards |
| GET | `/properties/{hotelName}` | Property intelligence (URL-encoded hotel name) |
| GET | `/reports/{id}` | Retrieve a stored report |

## Test historical trends

1. Start backend + frontend.
2. Upload a Daily Flash PDF **3+ times** (same file is fine for demo).
3. Scroll to **Historical Trends** — charts and persistent risks update after each upload.
4. Optional: `curl http://localhost:8001/trends | python3 -m json.tool` (use your API port)

## Notes

- Local SQLite only — no cloud, auth, or OpenAI.
- If you upgraded from an older schema, delete `backend/data/superhost.db` and re-upload.
- Report date is parsed from the PDF header (e.g. `May 18, 2026`).
