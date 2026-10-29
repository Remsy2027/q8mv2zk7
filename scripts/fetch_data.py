"""Fetch a reproducible Elexon-only snapshot. Standard library; no API key."""

import concurrent.futures
import datetime as dt
import gzip
import hashlib
import json
from pathlib import Path
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets/"


def fetch(job):
    dataset, day = job
    if dataset == "WINDFOR":
        params = {
            "publishDateTimeFrom": f"{day}T00:00:00Z",
            "publishDateTimeTo": f"{day}T23:59:59Z",
        }
    else:
        params = {
            "settlementDateFrom": day,
            "settlementDateTo": day,
            "fuelType": "WIND",
        }
    url = BASE + dataset + "/stream?" + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=90) as response:
                data = json.load(response)
            if not isinstance(data, list) or not data:
                raise ValueError(f"Empty or invalid response: {dataset} {day}")
            fields = ("startTime", "publishTime", "generation")
            rows = [
                {k: r[k] for k in fields}
                for r in data
                if dataset == "WINDFOR" or r.get("fuelType") == "WIND"
            ]
            print(f"{dataset} {day}: {len(rows)}", flush=True)
            return dataset, rows, {"url": url, "records": len(rows)}
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2**attempt)


def main():
    # Include Dec 31 for early-Jan cutoff fallback; Feb 1 is delivered after Jan 31 decisions.
    jobs = [
        ("WINDFOR", (dt.date(2025, 12, 31) + dt.timedelta(days=i)).isoformat())
        for i in range(32)
    ]
    jobs += [
        ("FUELHH", (dt.date(2026, 1, 2) + dt.timedelta(days=i)).isoformat())
        for i in range(31)
    ]
    snapshot = {"forecasts": [], "actuals": [], "sources": []}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for dataset, rows, source in pool.map(fetch, jobs):
            snapshot["forecasts" if dataset == "WINDFOR" else "actuals"].extend(rows)
            snapshot["sources"].append(source)
    for key in ("forecasts", "actuals"):
        snapshot[key] = sorted(
            {(r["startTime"], r["publishTime"]): r for r in snapshot[key]}.values(),
            key=lambda r: (r["startTime"], r["publishTime"]),
        )
    snapshot["retrieved_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    snapshot["provider"] = "Elexon Insights Solution / BMRS"
    output = ROOT / "data" / "elexon-jan2026.json.gz"
    output.parent.mkdir(exist_ok=True)
    payload = json.dumps(snapshot, separators=(",", ":")).encode()
    with gzip.open(output.with_suffix(".tmp"), "wb") as file:
        file.write(payload)
    output.with_suffix(".tmp").replace(output)
    manifest = {k: v for k, v in snapshot.items() if k not in ("forecasts", "actuals")}
    manifest.update(
        {
            "forecast_records": len(snapshot["forecasts"]),
            "actual_records": len(snapshot["actuals"]),
            "sha256_uncompressed": hashlib.sha256(payload).hexdigest(),
        }
    )
    (ROOT / "data" / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    print(f"Saved {output}: {len(payload):,} bytes before compression")


if __name__ == "__main__":
    main()
