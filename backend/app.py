import csv
from functools import lru_cache
import gzip
import io
import json
from pathlib import Path
from fastapi import FastAPI, Query
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from backend.analytics import analyse

ROOT = Path(__file__).resolve().parents[1]
app = FastAPI(
    title="Windledger API",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)


@lru_cache(maxsize=1)
def snapshot():
    with gzip.open(
        ROOT / "data/elexon-jan2026.json.gz", "rt", encoding="utf-8"
    ) as file:
        return json.load(file)


@lru_cache(maxsize=64)
def results(cutoff):
    return analyse(snapshot(), cutoff)


@app.get("/api/health")
def health():
    data = snapshot()
    return {
        "status": "ok",
        "retrieved_at": data["retrieved_at"],
        "forecast_records": len(data["forecasts"]),
        "actual_records": len(data["actuals"]),
    }


@app.get("/api/analysis")
def analysis(cutoff: str = Query("09:00", pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$")):
    return {
        **results(cutoff),
        "retrieved_at": snapshot()["retrieved_at"],
        "provider": snapshot()["provider"],
    }


@app.get("/api/export")
def export(cutoff: str = Query("09:00", pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$")):
    rows = results(cutoff)["rows"]
    output = io.StringIO()
    writer = csv.DictWriter(
        output, fieldnames=[*rows[0], "cutoff_london", "error_definition"]
    )
    writer.writeheader()
    writer.writerows(
        {**r, "cutoff_london": cutoff, "error_definition": "forecast_minus_actual_MW"}
        for r in rows
    )
    return Response(
        output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="windledger-jan2026.csv"'
        },
    )


if (ROOT / "dist").exists():
    app.mount("/", StaticFiles(directory=ROOT / "dist", html=True), name="frontend")
