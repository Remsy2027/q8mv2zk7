"""Pure decision-time selection and aligned hourly scoring. All power is MW."""

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from math import ceil, sqrt

UTC = timezone.utc


def timestamp(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def quantile(values, fraction):
    if not values:
        return None
    ordered = sorted(values)
    pos = (len(ordered) - 1) * fraction
    low = int(pos)
    return ordered[low] + (ordered[ceil(pos)] - ordered[low]) * (pos - low)


def metrics(rows):
    valid = [r for r in rows if r["error"] is not None]
    if not valid:
        return {
            "count": 0,
            "mae": None,
            "rmse": None,
            "bias": None,
            "p90_abs": None,
            "wape": None,
            "energy_error_mwh": None,
        }
    errors = [r["error"] for r in valid]
    actual_sum = sum(r["actual"] for r in valid)
    return {
        "count": len(valid),
        "mae": sum(abs(x) for x in errors) / len(valid),
        "rmse": sqrt(sum(x * x for x in errors) / len(valid)),
        "bias": sum(errors) / len(valid),
        "p90_abs": quantile([abs(x) for x in errors], 0.9),
        "wape": 100 * sum(abs(x) for x in errors) / actual_sum if actual_sum else None,
        "energy_error_mwh": sum(errors),
    }


def analyse(snapshot, cutoff="09:00"):
    hour, minute = map(int, cutoff.split(":"))
    forecasts = defaultdict(list)
    for record in snapshot["forecasts"]:
        forecasts[timestamp(record["startTime"])].append(record)
    actuals = defaultdict(list)
    for record in snapshot["actuals"]:
        actuals[timestamp(record["startTime"])].append(record)
    rows = []
    for offset in range(31):
        decision = date(2026, 1, 1) + timedelta(days=offset)
        # Europe/London is UTC for this entire January/February window (no DST).
        deadline = datetime(
            decision.year, decision.month, decision.day, hour, minute, tzinfo=UTC
        )
        delivery = datetime.combine(
            decision + timedelta(days=1), datetime.min.time(), UTC
        )
        for h in range(24):
            start = delivery + timedelta(hours=h)
            eligible = [
                r for r in forecasts[start] if timestamp(r["publishTime"]) <= deadline
            ]
            best = max(
                eligible, key=lambda r: timestamp(r["publishTime"]), default=None
            )
            halves = []
            for delta in (0, 30):
                candidates = actuals[start + timedelta(minutes=delta)]
                latest = max(
                    candidates, key=lambda r: timestamp(r["publishTime"]), default=None
                )
                if latest is not None:
                    halves.append(latest["generation"])
            actual = sum(halves) / 2 if len(halves) == 2 else None
            forecast = best["generation"] if best else None
            rows.append(
                {
                    "decision_date": decision.isoformat(),
                    "delivery_date": start.date().isoformat(),
                    "start_time": start.isoformat(),
                    "hour": h,
                    "forecast": forecast,
                    "actual": actual,
                    "publish_time": best["publishTime"] if best else None,
                    "lead_hours": (
                        start - timestamp(best["publishTime"])
                    ).total_seconds()
                    / 3600
                    if best
                    else None,
                    "error": forecast - actual
                    if forecast is not None and actual is not None
                    else None,
                }
            )
    days = []
    for offset in range(31):
        decision = (date(2026, 1, 1) + timedelta(days=offset)).isoformat()
        group = [r for r in rows if r["decision_date"] == decision]
        days.append(
            {
                "decision_date": decision,
                "delivery_date": group[0]["delivery_date"],
                **metrics(group),
                "forecast_hours": sum(r["forecast"] is not None for r in group),
                "actual_hours": sum(r["actual"] is not None for r in group),
            }
        )
    return {
        "cutoff": cutoff,
        "timezone": "Europe/London",
        "rows": rows,
        "days": days,
        "metrics": metrics(rows),
        "expected_hours": len(rows),
        "forecast_hours": sum(r["forecast"] is not None for r in rows),
        "actual_hours": sum(r["actual"] is not None for r in rows),
    }
