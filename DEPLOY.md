# Deploy to Render (frontend + backend)

This guide deploys the app **as-is**: FastAPI + SQLite on a persistent disk, Next.js frontend.

## Prerequisites

- [Render](https://render.com) account
- GitHub repo with this project (no `superhost.db` or `.env.local` in git)
- **Starter plan** (or higher) for the API service — **persistent disk is required** so SQLite survives redeploys

## Option A — Blueprint (fastest)

1. Push the repo to GitHub.
2. Render Dashboard → **New** → **Blueprint**.
3. Connect the repo. Render reads [`render.yaml`](./render.yaml) and creates:
   - `superhost-api` — Python API + 1 GB disk at `backend/data`
   - `superhost-web` — Next.js app with `NEXT_PUBLIC_API_URL` pointing at the API
4. Wait for both services to go green.
5. Open the **web** service URL (your dashboard).

`render.yaml` wires CORS automatically: the API allows the frontend’s `RENDER_EXTERNAL_URL`.

### Local dev after blueprint

Keep using `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8001`. Production uses Render env vars at build time.

## Option B — Manual setup

### 1. API (`superhost-api`)

| Setting | Value |
|--------|--------|
| Type | Web Service |
| Root Directory | `backend` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |

**Environment**

| Key | Value |
|-----|--------|
| `PYTHON_VERSION` | `3.12.0` |
| `CORS_ORIGINS` | `https://YOUR-FRONTEND.onrender.com` (set after frontend exists) |
| `AUTH_ADMIN_EMAIL` | Seeded admin email for app login |
| `AUTH_ADMIN_PASSWORD` | Seeded admin password |
| `AUTH_SESSION_SECRET` | Long random secret used to sign sessions |
| `AUTH_SESSION_SAME_SITE` | `lax` by default; set `none` only if your deployment needs it |
| `AUTH_SESSION_HTTPS_ONLY` | `true` in production when using `AUTH_SESSION_SAME_SITE=none` |

**Disk** (Starter+)

| Setting | Value |
|--------|--------|
| Mount Path | `/opt/render/project/src/backend/data` |
| Size | 1 GB |

### 2. Frontend (`superhost-web`)

| Setting | Value |
|--------|--------|
| Type | Web Service |
| Root Directory | `frontend` |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |

**Environment**

| Key | Value |
|-----|--------|
| `NODE_VERSION` | `20` |
| `NEXT_PUBLIC_API_URL` | `https://YOUR-API.onrender.com` |

Redeploy the frontend after setting `NEXT_PUBLIC_API_URL` (it is baked in at build time).

### 3. CORS

On the API service, set:

```env
CORS_ORIGINS=https://superhost-web.onrender.com
```

Comma-separate multiple origins if needed. `http://localhost:3000` is always allowed for local dev.

## Migrate your existing SQLite database

Your local file: `backend/data/superhost.db`

**Option 1 — Render Shell (after API is live)**

1. API service → **Shell**.
2. Confirm disk is mounted: `ls -la /opt/render/project/src/backend/data`
3. From your Mac, base64-encode and paste, or use `scp` if you have SSH access (Render shell is easiest with a one-liner upload):

```bash
# On your Mac — prints base64; copy output, then on Render shell decode into data/
base64 < backend/data/superhost.db | pbcopy
```

On Render shell:

```bash
cd /opt/render/project/src/backend/data
# paste base64 into a file, then:
base64 -d superhost.b64 > superhost.db
```

**Option 2 — Fresh start**

Skip migration; upload PDFs again through the dashboard.

## Keep data across deploys (upload via UI)

1. **superhost-api** must have a **persistent disk** mounted at  
   `/opt/render/project/src/backend/data` (Starter+ plan).
2. Upload Daily Flash PDFs on production **`/reports`** (they write to `backend/data/superhost.db` on that disk).
3. After every deploy, confirm persistence:
   ```bash
   curl -s https://YOUR-API.onrender.com/health
   ```
   Expect `"reports": <N>` with `N > 0` and `"data_dir": "/opt/render/project/src/backend/data"`.
4. **Restart** the API once (not “delete disk”). Run `curl /health` again — `reports` should be unchanged.
5. **Do not** scale the API past **1 instance** (SQLite is single-writer).
6. **Do not** delete or recreate the disk unless you intend to wipe data.

Redeploying code is safe when the disk mount is correct; only the disk volume holds your DB across deploys.

## Verify

- API: `https://superhost-api.onrender.com/health` → `{"status":"ok","reports":N,"data_dir":"..."}`
- API docs: `https://superhost-api.onrender.com/docs`
- App: open the **web** service URL, upload a PDF, confirm portfolio data loads.

## Costs & limits

- **Free tier**: no persistent disk; SQLite resets on every deploy — not recommended.
- **Starter**: disk + always-on option; typical choice for this app.
- **SQLite**: run **one** API instance only (no horizontal scaling).
- **Cold starts**: free/starter may sleep; first request can be slow.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Frontend can’t reach API | Check `NEXT_PUBLIC_API_URL`, redeploy frontend |
| CORS error in browser | Set `CORS_ORIGINS` to exact frontend URL (https, no trailing slash) |
| Data gone after deploy | Enable disk on API; mount path must be `/opt/render/project/src/backend/data` |
| Upload fails | Check API logs; PDF parser errors show in Render **Logs** |

## Custom domains

Add domains in each service’s **Settings → Custom Domains**. Update `CORS_ORIGINS` and redeploy frontend with updated `NEXT_PUBLIC_API_URL`.
