import csv
import gzip
import hashlib
import io
import json
import unittest
from datetime import datetime
from fastapi.testclient import TestClient
from backend.app import ROOT, app, snapshot


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_complete_real_snapshot_and_no_lookahead(self):
        response = self.client.get("/api/analysis?cutoff=09:00")
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["metrics"]["count"], 744)
        self.assertEqual(result["actual_hours"], 744)
        self.assertEqual(len(snapshot()["actuals"]), 1488)
        for row in result["rows"]:
            cutoff = datetime.fromisoformat(row["decision_date"] + "T09:00:00+00:00")
            self.assertLessEqual(
                datetime.fromisoformat(row["publish_time"].replace("Z", "+00:00")),
                cutoff,
            )

    def test_invalid_cutoff_rejected(self):
        for value in ("25:00", "9:00", "09:60", "garbage"):
            with self.subTest(value=value):
                self.assertEqual(
                    self.client.get(
                        "/api/analysis", params={"cutoff": value}
                    ).status_code,
                    422,
                )
                self.assertEqual(
                    self.client.get(
                        "/api/export", params={"cutoff": value}
                    ).status_code,
                    422,
                )

    def test_csv_matches_analysis_and_documents_units(self):
        response = self.client.get("/api/export?cutoff=10:00")
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment", response.headers["content-disposition"])
        rows = list(csv.DictReader(io.StringIO(response.text)))
        result = self.client.get("/api/analysis?cutoff=10:00").json()
        self.assertEqual(len(rows), 744)
        self.assertEqual(float(rows[0]["forecast"]), result["rows"][0]["forecast"])
        self.assertEqual(rows[0]["cutoff_london"], "10:00")
        self.assertEqual(rows[0]["error_definition"], "forecast_minus_actual_MW")

    def test_health_and_openapi(self):
        self.assertEqual(self.client.get("/api/health").json()["status"], "ok")
        self.assertIn(
            "/api/analysis", self.client.get("/api/openapi.json").json()["paths"]
        )

    def test_snapshot_integrity_and_hourly_forecast_resolution(self):
        manifest = json.loads((ROOT / "data/manifest.json").read_text())
        payload = gzip.decompress((ROOT / "data/elexon-jan2026.json.gz").read_bytes())
        self.assertEqual(
            hashlib.sha256(payload).hexdigest(), manifest["sha256_uncompressed"]
        )
        self.assertEqual(len(snapshot()["forecasts"]), manifest["forecast_records"])
        for row in snapshot()["forecasts"]:
            instant = datetime.fromisoformat(row["startTime"].replace("Z", "+00:00"))
            self.assertEqual((instant.minute, instant.second), (0, 0))


if __name__ == "__main__":
    unittest.main()
