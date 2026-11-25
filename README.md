# PSX Five-Star Shariah Tracker

Public site listing non-financial PSX companies with a five-star Shariah rating, and what changed at each PSX review.
Spec: see the project doc. No login, no holdings, no Zakat.

## Layout
- `jobs/` Python: `parse_notice.py` (PDF → ratings), `changes.py` (dropped/new/returned), `ingest.py`, `schema.sql`
- `web/` Next.js app (reads SQLite locally, Turso in production)
- `fixtures/` PSX/N-1402 PDF used by tests

## Local
```bash
pip install -r requirements.txt && python -m pytest -q tests
mkdir -p data && python jobs/ingest.py fixtures/PSX-N-1402.pdf
cd web && npm install && npm run dev
```

## Deploy
1. Turso: `turso db create five-star-psx`, then `turso db tokens create five-star-psx`.
2. Vercel: import this repo, set Root Directory to `web`, add env vars `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
3. GitHub repo secrets: the same two names (used by the ingest workflow).
4. Load the data without a local setup: GitHub repo → Actions → "Ingest PSX notice" → Run workflow (defaults are correct for PSX/N-1402). Then redeploy on Vercel or wait 5 minutes.
