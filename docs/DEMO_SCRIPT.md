# Ten-minute demo recording guide

Record the running portal and a code editor. Use the actual deployed app after it is public. Keep the video under ten minutes and upload to YouTube as **unlisted**. A suggested target is 8:30, allowing pauses. This is a prepared script, not a claim that a video has already been recorded or uploaded.

## Part 1 — customer pitch (0:00–4:15)

**0:00–0:40 — decision desk, full window**

“Windledger gives your procurement team a clear view of the wind forecast available when you had to make tomorrow's buying decision, and an honest measurement of how well those forecasts performed. This pilot uses only Elexon's national WIND actuals and WINDFOR forecasts. We have not invented demand, prices, or financial savings.”

**0:40–1:30 — period and cutoff controls**

“The selected month is the decision month: January 1 through 31. Delivery is the following day, so the last delivery is February 1. The cutoff defaults to nine in the morning, London time. This is an illustrative desk deadline, and you can change it. We select the latest forecast that had actually been published by that cutoff, separately for each delivery hour.”

Show decision January 15, delivery January 16. Hover a chart point to expose the publication time. Change the cutoff to 11:00 and apply; show that the selected vintage and scores can change. Restore 09:00.

**1:30–2:30 — generation and shortfall**

“The solid green series is the decision-time forecast; the dashed series is what was subsequently reported. Forecast and actual energy totals show the day's scale. The error chart makes the hours of overforecast visible. Positive means less wind arrived than expected. The net energy shortfall is a national comparison with the wind forecast, not a utility-specific buy recommendation: we would also need demand and existing positions for that.”

Navigate a day forward and back. Describe the plotted gap, without asserting a financial outcome.

**2:30–3:40 — accuracy tab**

“Across all 744 matched delivery hours at the nine o'clock cutoff, mean absolute error is about 2,039 MW, RMSE about 2,505 MW, and bias about +1,748 MW. Positive bias indicates overforecast wind. Weighted absolute error is about 18.1%. The 90th percentile absolute error is about 4,098 MW. These are full-month retrospective statistics. They help evaluate the pilot; they are not a future confidence interval or an estimate a trader already knew on January 1.”

Click a daily MAE bar or View in the audit table. Export the CSV and point out publication times and the cutoff column.

**3:40–4:15 — methodology and next steps**

“Every metric is traceable. We show coverage and preserve missing values. A sensible next phase would bring in your portfolio context and test risk estimates on earlier, independent data. Today the pilot delivers a reproducible answer to two questions: what forecast was available, and how accurate was it?”

## Part 2 — technical review (4:15–8:30)

**4:15–5:00 — architecture**

Open `docs/ARCHITECTURE.md`. “The system has three small layers: a standard-library ingestion script, pure Python analytics behind FastAPI, and a typed React interface. Data is downloaded once into a versioned gzip snapshot with a manifest. Page requests never depend on the Elexon service being available.”

**5:00–6:00 — ingestion and provenance**

Open `scripts/fetch_data.py`, then `data/manifest.json`. “We split queries by publication day for WINDFOR and settlement day for actuals. We filter WIND, retry bounded failures, preserve publication timestamps, and record the URLs and uncompressed payload hash. Dec 31 publications cover early Jan 1 cutoffs; actuals extend into Feb 1 for Jan 31 decisions.”

**6:00–7:00 — correctness**

Open `backend/analytics.py`. Walk through `eligible`, `best`, `halves`, and `error`. “The cutoff comparison is inclusive. Sorting is not trusted. Actuals use the latest revision in the snapshot; their later publication is legitimate for retrospective scoring. Both half-hours are required for hourly truth. London is GMT throughout this scope; a broader date range would need DST-aware day lengths.”

**7:00–7:45 — API and interface**

Open `/api/docs`, then `src/main.tsx`. “FastAPI validates cutoff times and exposes analysis, CSV, health and OpenAPI. CSV is generated from the same analytics result. The browser has abortable fetches, loading and error states, date controls and responsive layouts. Full-month hindsight is explicitly separated from the decision-time forecast selection.”

**7:45–8:30 — tests, deployment, tradeoffs**

Run `python -m unittest discover -s tests -v`, show the passing output and GitHub Actions workflow. Open `Dockerfile` and `vercel.json`. “Tests cover temporal leakage, missing data, formula denominators, units, coverage and exports. Docker builds React separately and runs the Python server as a non-root user. Vercel hosts the React build and a Python ASGI function. The current pilot is deliberately read-only. Production work would add monitored ingestion, held-out risk calibration and portfolio data before supporting procurement recommendations.”

Finish by showing the repo and app URLs. Verify both and the unlisted YouTube link in a signed-out/private browser before submitting the challenge form.
