# Windledger

Decision-time wind intelligence for Great Britain day-ahead power procurement. Built for the REint full-stack challenge with **React + TypeScript**, **Python + FastAPI**, **Elexon real historical data**, and **Docker**.

**Repository:** https://github.com/Remsy2027/q8mv2zk7

**Deployment:** Vercel-ready; a production URL will be added after deployment. See the deployment steps below. **Demo video:** recording pending; the complete two-part script is in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

## What the pilot does

- Reconstructs the latest forecast available at a configurable decision cutoff.
- Compares forecast and actual hourly generation; shows signed shortfalls and daily wind energy.
- Quantifies MAE, RMSE, bias, WAPE and historical P90 absolute error.
- Audits all decision days and exports hourly evidence, including forecast publication times.
- Uses a checked-in Elexon snapshot: the app works without an API key or live upstream service.

January 2026 is interpreted as **decision dates**, January 1–31. Next-day deliveries run January 2–February 1. The default **09:00 Europe/London** cutoff is illustrative and configurable, not a claimed market gate closure. All scoped dates are GMT.

## Run with Docker

```sh
docker compose up --build -d
```

Open **http://localhost:8000** and API documentation at **http://localhost:8000/api/docs**. Stop with `docker compose down`. The container runs as an unprivileged user and has a health check.

## Local development

Requires Node.js 24 and Python 3.14 (tested), or compatible recent versions.

```sh
python -m venv .venv
```

Activate it with `.venv\Scripts\Activate.ps1` on PowerShell or `source .venv/bin/activate` on macOS/Linux, then:

```sh
pip install -r requirements-dev.txt
npm ci
python -m uvicorn backend.app:app --reload --port 8000
```

In a second terminal:

```sh
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to Python on port 8000. For a local production build, run `npm run build`, then restart Uvicorn; it serves the built frontend at port 8000.

## Verify

```sh
python -m unittest discover -s tests -v
npm run build
docker build -t windledger .
```

GitHub Actions repeats tests and builds on pushes and pull requests. The tests verify actual temporal-selection rules and numerical examples, rather than implementation snapshots.

## Refresh the source snapshot

```sh
python scripts/fetch_data.py
```

No API key or third-party Python dependencies are needed for ingestion. It fetches only Elexon WIND actuals and wind forecasts, records retrieval timestamps, query URLs and a SHA-256 in `data/manifest.json`, and replaces the snapshot only after all daily requests succeed. Restart the API after refresh to clear process caches. Review and commit the manifest and compressed snapshot together; retrospective actual revisions can change results.

Data endpoints:

- [FUELHH / stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream), filtered to WIND.
- [WINDFOR / stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream), filtered by publication day.
- API base: `https://data.elexon.co.uk/bmrs/api/v1`.

Source data belongs to its provider; consult [Elexon's data reuse policy](https://www.elexon.co.uk/data/data-reuse-policy/) before redistribution outside this pilot.

## Deploy to Vercel

The app has a static Vite frontend plus a Python ASGI function (`api/index.py`). `vercel.json` routes `/api/*` to FastAPI and includes the backend and snapshot in the function bundle.

```sh
npx vercel login
npx vercel --prod
```

Use the Vite framework preset if prompted and keep the supplied build/output configuration. After deployment, verify `/`, `/api/health`, `/api/analysis?cutoff=09:00`, `/api/export` and `/api/docs`. Confirm Deployment Protection does not prevent signed-out access before submission. Replace the deployment placeholder at the top of this README with the returned public URL.

Alternatively, the supplied Dockerfile respects `$PORT` and can run on a Heroku container stack. Heroku requires an account, app and paid compute; no paid resources are created by this repository.

## Files and directories

| Path | Purpose |
|---|---|
| `src/main.tsx` | Decision desk, accuracy audit, methodology and API state |
| `src/styles.css` | Responsive design, focus and reduced-motion styles |
| `backend/analytics.py` | Pure publication-time selection, alignment and metrics |
| `backend/app.py` | FastAPI analysis, CSV, health, docs and static hosting |
| `api/index.py` | Vercel ASGI entrypoint |
| `scripts/fetch_data.py` | Reproducible daily Elexon ingestion with retries |
| `data/elexon-jan2026.json.gz` | Real historical observations, compressed |
| `data/manifest.json` | Query provenance, counts, retrieval time and hash |
| `tests/` | Selection, metrics and real-snapshot API regression tests |
| `docs/ARCHITECTURE.md` | Design, formulas, assumptions, limitations and tradeoffs |
| `docs/DEMO_SCRIPT.md` | Timed customer pitch and technical walkthrough |
| `docs/SUBMISSION_CHECKLIST.md` | Remaining recording, access and submission steps |
| `Dockerfile`, `compose.yaml` | Production container and local health-checked service |
| `vercel.json` | Vercel build, routing and function files |
| `.github/workflows/checks.yml` | Automated tests and build |

## Analytical limits

The observed WINDFOR data is hourly; actual hourly MW is the mean of the two matching FUELHH half-hours. Missing data is excluded, never replaced with zero. Forecast error is **forecast minus actual**. MW is power; sums over one-hour observations are MWh and are displayed as GWh where labelled. WAPE is volume-normalised, avoiding unstable per-hour percentages near zero.

At the 09:00 cutoff the initial snapshot has **744/744 paired hours**, MAE **2,038.9 MW**, RMSE **2,504.8 MW**, bias **+1,747.9 MW**, WAPE **18.07%**, and P90 absolute error **4,097.9 MW**. These are full-month hindsight metrics, not information known on every historical decision date, future confidence intervals or a recommended reserve. No financial saving is inferred. National WIND is not the client's contracted generation, demand, or net position.

## AI disclosure

OpenAI Codex was used to assist with requirements interpretation, implementation, documentation and verification. All generation observations come from the Elexon endpoints described above; no synthetic observations are presented as real data. The repository includes tests and explicit assumptions to make the AI-assisted work reviewable.
