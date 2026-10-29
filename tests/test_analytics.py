import copy
import unittest
from backend.analytics import analyse, metrics, quantile


def forecast(value, published, target="2026-01-02T00:00:00Z"):
    return {"startTime": target, "publishTime": published, "generation": value}


def actual(value, target):
    return {
        "startTime": target,
        "publishTime": "2026-01-03T00:00:00Z",
        "generation": value,
    }


class SelectionTests(unittest.TestCase):
    def setUp(self):
        self.data = {
            "forecasts": [
                forecast(90, "2026-01-01T07:30:00Z"),
                forecast(110, "2026-01-01T09:00:00Z"),
                forecast(999, "2026-01-01T09:00:01Z"),
            ],
            "actuals": [
                actual(80, "2026-01-02T00:00:00Z"),
                actual(100, "2026-01-02T00:30:00Z"),
            ],
        }

    def test_latest_eligible_inclusive_cutoff_no_future_leakage(self):
        row = analyse(self.data, "09:00")["rows"][0]
        self.assertEqual(row["forecast"], 110)
        self.assertEqual(row["publish_time"], "2026-01-01T09:00:00Z")
        self.assertEqual(row["lead_hours"], 15)
        self.assertEqual(row["actual"], 90)
        self.assertEqual(row["error"], 20)

    def test_early_cutoff_does_not_substitute_later_forecast(self):
        row = analyse(self.data, "06:00")["rows"][0]
        self.assertIsNone(row["forecast"])
        self.assertIsNone(row["error"])
        self.assertEqual(row["actual"], 90)

    def test_missing_half_hour_excludes_whole_hour(self):
        self.data["actuals"].pop()
        result = analyse(self.data)
        self.assertIsNone(result["rows"][0]["actual"])
        self.assertEqual(result["metrics"]["count"], 0)
        self.assertIsNone(result["metrics"]["mae"])

    def test_latest_actual_revision_and_zero_is_valid(self):
        self.data["actuals"] += [
            {
                "startTime": "2026-01-02T00:00:00Z",
                "publishTime": "2026-01-04T00:00:00Z",
                "generation": 0,
            }
        ]
        self.assertEqual(analyse(self.data)["rows"][0]["actual"], 50)

    def test_january_decisions_include_february_delivery(self):
        rows = analyse(self.data)["rows"]
        self.assertEqual(len(rows), 744)
        self.assertEqual(rows[0]["decision_date"], "2026-01-01")
        self.assertEqual(rows[0]["delivery_date"], "2026-01-02")
        self.assertEqual(rows[-1]["decision_date"], "2026-01-31")
        self.assertEqual(rows[-1]["delivery_date"], "2026-02-01")

    def test_input_order_does_not_change_selected_vintage(self):
        reversed_data = copy.deepcopy(self.data)
        reversed_data["forecasts"].reverse()
        self.assertEqual(analyse(self.data), analyse(reversed_data))


class MetricTests(unittest.TestCase):
    def test_known_errors_sign_energy_and_missing_values(self):
        result = metrics(
            [
                {"actual": 100, "error": 10},
                {"actual": 200, "error": -20},
                {"actual": None, "error": None},
            ]
        )
        self.assertEqual(result["count"], 2)
        self.assertEqual(result["mae"], 15)
        self.assertAlmostEqual(result["rmse"], 250**0.5)
        self.assertEqual(result["bias"], -5)
        self.assertEqual(result["energy_error_mwh"], -10)
        self.assertEqual(result["wape"], 10)
        self.assertEqual(result["p90_abs"], 19)

    def test_zero_actual_denominator_and_empty_quantile(self):
        self.assertIsNone(metrics([{"actual": 0, "error": 5}])["wape"])
        self.assertIsNone(quantile([], 0.9))
        self.assertEqual(quantile([3], 0.9), 3)


if __name__ == "__main__":
    unittest.main()
