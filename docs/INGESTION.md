# Inbound email ingestion

Daily flash PDFs can be ingested by forwarding emails to `reports@yourdomain.com` (no Gmail API).

## Architecture

```
Postmark / SendGrid / Mailgun
        → POST https://your-app.com/api/inbound-email  (Next.js proxy)
        → POST https://api.your-app.com/inbound-email  (FastAPI)
        → email_processor → pdf_ingestion_service → metrics_engine (parser)
        → SQLite + archived PDFs in backend/data/pdfs/
        → dashboard revision bump → Command Center auto-refresh (30s poll)
```

## Modular backend packages

| Module | Role |
|--------|------|
| `app/ingestion/email_processor.py` | Parse Postmark / SendGrid / Mailgun JSON |
| `app/ingestion/duplicate_detection.py` | SHA256 + date/filename duplicate checks |
| `app/ingestion/storage.py` | Archive raw PDFs |
| `app/ingestion/metrics_engine.py` | Run existing `extract_flash_report` |
| `app/ingestion/pdf_ingestion_service.py` | End-to-end orchestration |
| `app/ingestion/reprocess.py` | Re-parse archived PDF |

## Environment

**Backend**

- `INBOUND_EMAIL_WEBHOOK_SECRET` — required in production; send as `X-Webhook-Secret`
- `INBOUND_EMAIL_ALLOWED_SENDERS` — comma list (`ops@hotel.com`)
- `INBOUND_EMAIL_ALLOWED_DOMAINS` — comma list (`yourcompany.com`)
- `ADMIN_API_KEY` — protects `/admin/ingestion` (header `X-Admin-Key`)

**Frontend**

- `INBOUND_EMAIL_WEBHOOK_SECRET` — same secret for Next proxy
- `ADMIN_API_KEY` — admin panel API calls
- `NEXT_PUBLIC_API_URL` — FastAPI base URL

## Postmark inbound

1. Add inbound domain in Postmark.
2. Set webhook URL: `https://<frontend>/api/inbound-email`
3. Add HTTP header: `X-Webhook-Secret: <secret>`

## Admin panel

`/admin/ingestion` — logs, reports, reprocess, view PDF.

## Database

- `reports` — extended with `pdf_hash`, `pdf_url`, `ingestion_status`, `parse_confidence`, `source_email`, etc.
- `ingestion_logs` — per-attachment audit trail
- `system_meta` — `dashboard_revision` for client polling

## Future sources

Wire new providers by extending `email_processor.parse_inbound_payload` and calling `pdf_ingestion_service.process_inbound_email` (Gmail API, SFTP, etc.) without changing the parser or metrics schema.
