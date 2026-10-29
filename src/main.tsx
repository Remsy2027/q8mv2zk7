import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Gauge,
  LayoutDashboard,
  Menu,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
  Wind,
  X,
} from "lucide-react";
import "./styles.css";

type Row = {
  decision_date: string;
  delivery_date: string;
  start_time: string;
  hour: number;
  forecast: number | null;
  actual: number | null;
  publish_time: string | null;
  lead_hours: number | null;
  error: number | null;
};
type Metrics = {
  count: number;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  p90_abs: number | null;
  wape: number | null;
  energy_error_mwh: number | null;
};
type Day = Metrics & {
  decision_date: string;
  delivery_date: string;
  forecast_hours: number;
  actual_hours: number;
};
type Analysis = {
  cutoff: string;
  timezone: string;
  rows: Row[];
  days: Day[];
  metrics: Metrics;
  expected_hours: number;
  forecast_hours: number;
  actual_hours: number;
  retrieved_at: string;
  provider: string;
};
const nf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const num = (value: number | null | undefined) =>
  value == null ? "—" : nf.format(value);
const signed = (value: number | null | undefined) =>
  value == null ? "—" : `${value > 0 ? "+" : ""}${num(value)}`;
const date = (value: string, full = false) =>
  new Date(value + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: full ? "long" : "short",
    ...(full ? { year: "numeric" } : {}),
    timeZone: "Europe/London",
  });
const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;
const time = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="chart-tip">
      <b>{typeof label === "number" ? hourLabel(label) : label} GMT</b>
      {payload
        .filter((p: any) => p.dataKey !== "band")
        .map((p: any) => (
          <div key={p.dataKey}>
            <span style={{ color: p.color }}>{p.name}</span>
            <strong>{num(p.value)} MW</strong>
          </div>
        ))}
      {row.publish_time && (
        <small>Forecast published {time(row.publish_time)} GMT</small>
      )}
    </div>
  );
}

function App() {
  const [data, setData] = useState<Analysis | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [cutoff, setCutoff] = useState("09:00"),
    [draft, setDraft] = useState("09:00"),
    [selected, setSelected] = useState("2026-01-15");
  const [tab, setTab] = useState("desk"),
    [mobile, setMobile] = useState(false),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/analysis?cutoff=${encodeURIComponent(cutoff)}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error(`Analysis request failed (${r.status})`);
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [cutoff, reload]);
  const rows = useMemo(
    () => data?.rows.filter((r) => r.decision_date === selected) ?? [],
    [data, selected],
  );
  const day = data?.days.find((d) => d.decision_date === selected);
  const pubs = [
    ...new Set(rows.map((r) => r.publish_time).filter(Boolean)),
  ] as string[];
  const forecastEnergy = rows.some((r) => r.forecast != null)
    ? rows.reduce((s, r) => s + (r.forecast ?? 0), 0)
    : null;
  const actualEnergy = rows.some((r) => r.actual != null)
    ? rows.reduce((s, r) => s + (r.actual ?? 0), 0)
    : null;
  const nav = [
    { id: "desk", label: "Decision desk", icon: LayoutDashboard },
    { id: "accuracy", label: "Forecast accuracy", icon: TrendingUp },
    { id: "method", label: "Data & methodology", icon: BookOpen },
  ];
  const changeDay = (direction: number) => {
    if (!data) return;
    const i = data.days.findIndex((d) => d.decision_date === selected);
    if (data.days[i + direction])
      setSelected(data.days[i + direction].decision_date);
  };
  return (
    <div className="app-shell">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a className="brand" href="#" onClick={() => setTab("desk")}>
          <span className="brand-icon">
            <Wind size={25} />
          </span>
          windledger<span className="brand-dot">.</span>
        </a>
        <button
          className="mobile-close icon-btn"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <div className="workspace">
          <div className="workspace-icon">GB</div>
          <div>
            <b>Great Britain</b>
            <small>Wholesale intelligence</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "active" : ""}
              onClick={() => {
                setTab(n.id);
                setMobile(false);
              }}
            >
              <n.icon size={18} />
              {n.label}
              {tab === n.id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="small-wind">
            <Wind size={20} />
          </div>
          <b>A clearer view of wind.</b>
          <p>
            Know what was forecast.
            <br />
            Understand what arrived.
          </p>
          <span>JANUARY 2026 PILOT</span>
        </div>
        <div className="sidebar-footer">
          <div className="avatar">WL</div>
          <div>
            <b>Procurement workspace</b>
            <small>National wind · Elexon</small>
          </div>
          <CircleHelp size={16} />
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <button
              className="icon-btn mobile-menu"
              aria-label="Open menu"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <b>{nav.find((n) => n.id === tab)?.label}</b>
          </div>
          <span className="top-status">
            <span className="status-dot" />
            Historical pilot <span className="top-divider">/</span> January 2026
          </span>
        </header>
        <div className="page">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                WIND INTELLIGENCE <span>/</span> GREAT BRITAIN
              </div>
              <h1>
                {tab === "desk"
                  ? "Make tomorrow clearer."
                  : tab === "accuracy"
                    ? "Confidence, quantified."
                    : "Transparent by design."}
              </h1>
              <p>
                {tab === "desk"
                  ? "Your decision-time view of wind generation, with the evidence behind it."
                  : tab === "accuracy"
                    ? "Measure the forecasts your team could actually have used."
                    : "The data, assumptions and limits behind every number."}
              </p>
            </div>
            <a
              className="button export"
              href={`/api/export?cutoff=${encodeURIComponent(cutoff)}`}
            >
              <ArrowDownToLine size={16} />
              Export data<span>CSV</span>
            </a>
          </div>
          <form
            className="controls"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft) setCutoff(draft);
            }}
          >
            <div className="period">
              <span className="label">DECISION PERIOD</span>
              <b>01–31 January 2026</b>
              <span className="muted">Delivery 02 Jan – 01 Feb</span>
            </div>
            <div className="cutoff-control">
              <Clock3 size={18} />
              <label htmlFor="cutoff">
                <span className="label">DECISION CUTOFF</span>
                <span className="time-input">
                  <input
                    id="cutoff"
                    type="time"
                    required
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    aria-label="Decision cutoff in London time"
                  />{" "}
                  <span>London / GMT</span>
                </span>
              </label>
              <button className="apply" disabled={loading || draft === cutoff}>
                Apply
              </button>
            </div>
            <div className="source-pill">
              <Database size={15} />
              <span>Elexon snapshot</span>
              <span className="status-dot" />
            </div>
          </form>
          {error ? (
            <div className="error-state" role="alert">
              <h2>We couldn’t load the analysis.</h2>
              <p>
                {error}. Check that the Python API is running, then try again.
              </p>
              <button
                className="button"
                onClick={() => setReload((x) => x + 1)}
              >
                <RefreshCw size={16} />
                Try again
              </button>
            </div>
          ) : !data ? (
            <div className="loading-state" role="status">
              <Wind className="spin" />
              <h2>Preparing the decision desk…</h2>
              <p>Aligning Elexon forecasts and actual generation.</p>
            </div>
          ) : (
            <div
              className={loading ? "content refreshing" : "content"}
              aria-busy={loading}
            >
              {tab === "desk" && (
                <>
                  <div className="section-heading">
                    <div>
                      <span className="section-dot" />
                      <h2>Day-ahead outlook</h2>
                      <span className="tag">AS OF {cutoff} GMT</span>
                    </div>
                    <div className="day-picker">
                      <button
                        className="icon-btn"
                        aria-label="Previous decision day"
                        disabled={selected === "2026-01-01"}
                        onClick={() => changeDay(-1)}
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <label className="sr-only" htmlFor="decision-day">
                        Decision date
                      </label>
                      <select
                        id="decision-day"
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                      >
                        {data.days.map((d) => (
                          <option key={d.decision_date} value={d.decision_date}>
                            Decision: {date(d.decision_date)}
                          </option>
                        ))}
                      </select>
                      <button
                        className="icon-btn"
                        aria-label="Next decision day"
                        disabled={selected === "2026-01-31"}
                        onClick={() => changeDay(1)}
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="delivery-line">
                    Delivery day{" "}
                    <b>{day ? date(day.delivery_date, true) : "—"}</b>
                    <span>24 hourly intervals · MW unless stated</span>
                  </div>
                  <div className="metrics-grid">
                    <Metric
                      label="FORECAST WIND ENERGY"
                      value={
                        forecastEnergy == null
                          ? "—"
                          : (forecastEnergy / 1000).toFixed(1)
                      }
                      unit="GWh"
                      detail={`${day?.forecast_hours ?? 0}/24 hours available at cutoff`}
                      icon={<Wind size={18} />}
                    />
                    <Metric
                      label="ACTUAL WIND ENERGY"
                      value={
                        actualEnergy == null
                          ? "—"
                          : (actualEnergy / 1000).toFixed(1)
                      }
                      unit="GWh"
                      detail={`${day?.actual_hours ?? 0}/24 complete hourly observations`}
                      icon={<Gauge size={18} />}
                    />
                    <Metric
                      label="DAY’S FORECAST ERROR"
                      value={num(day?.mae)}
                      unit="MW"
                      detail="Mean absolute error · matched hours"
                      icon={<TrendingUp size={18} />}
                    />
                    <Metric
                      label="NET WIND SHORTFALL"
                      value={
                        day?.energy_error_mwh == null
                          ? "—"
                          : (day.energy_error_mwh / 1000).toFixed(1)
                      }
                      unit="GWh"
                      detail="Forecast − actual · negative = surplus"
                      icon={<SlidersHorizontal size={18} />}
                      accent
                    />
                  </div>
                  <div className="chart-layout">
                    <section className="panel generation">
                      <div className="panel-heading">
                        <div>
                          <h3>Forecast meets reality</h3>
                          <p>
                            Wind generation for{" "}
                            {day ? date(day.delivery_date) : "—"} · delivery
                            time in GMT
                          </p>
                        </div>
                        <span className="tag neutral">HOURLY</span>
                      </div>
                      <div className="legend">
                        <span>
                          <i className="legend-line green" />
                          Decision-time forecast
                        </span>
                        <span>
                          <i className="legend-line grey" />
                          Actual generation
                        </span>
                      </div>
                      <div className="chart-unit">POWER (MW)</div>
                      <div className="main-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={rows}
                            margin={{ top: 12, right: 16, left: 5, bottom: 5 }}
                          >
                            <defs>
                              <linearGradient
                                id="windFill"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#368563"
                                  stopOpacity={0.15}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#368563"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              vertical={false}
                              stroke="#e9ede8"
                              strokeDasharray="3 4"
                            />
                            <XAxis
                              dataKey="hour"
                              tickFormatter={hourLabel}
                              ticks={[0, 4, 8, 12, 16, 20, 23]}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11, fill: "#7c8580" }}
                              dy={10}
                            />
                            <YAxis
                              tickFormatter={(v) => `${v / 1000}k`}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11, fill: "#7c8580" }}
                              width={45}
                            />
                            <Tooltip content={<ChartTip />} />
                            <Area
                              type="linear"
                              dataKey="forecast"
                              name="Forecast"
                              fill="url(#windFill)"
                              stroke="none"
                              tooltipType="none"
                              isAnimationActive={false}
                            />
                            <Line
                              type="linear"
                              dataKey="actual"
                              name="Actual"
                              stroke="#a7b3ae"
                              strokeWidth={2}
                              dot={false}
                              strokeDasharray="5 4"
                              isAnimationActive={false}
                            />
                            <Line
                              type="linear"
                              dataKey="forecast"
                              name="Forecast"
                              stroke="#29734f"
                              strokeWidth={2.5}
                              dot={false}
                              activeDot={{ r: 5 }}
                              isAnimationActive={false}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="chart-foot">
                        <Check size={14} />
                        <span>
                          Latest eligible forecast per hour. No publications
                          after {cutoff} on {date(selected)}.
                        </span>
                      </div>
                    </section>
                    <section className="panel briefing">
                      <div className="briefing-label">
                        <span className="status-dot" />
                        THE DECISION BRIEF
                      </div>
                      <h3>
                        A forecast is a starting point.
                        <br />
                        <em>Know its margin.</em>
                      </h3>
                      <p>
                        Across the January decision window, the typical absolute
                        miss was <strong>{num(data.metrics.mae)} MW</strong>.
                      </p>
                      <div className="brief-stat">
                        <span>90th percentile absolute error</span>
                        <b>
                          {num(data.metrics.p90_abs)} <small>MW</small>
                        </b>
                        <div className="percentile-track">
                          <span />
                        </div>
                        <small>
                          90% of matched historical hours had an absolute error
                          at or below this value.
                        </small>
                      </div>
                      <div className="brief-warning">
                        Descriptive hindsight, not a calibrated reserve level or
                        a future confidence interval.
                      </div>
                      <button onClick={() => setTab("accuracy")}>
                        Explore forecast accuracy <ArrowUpRight size={17} />
                      </button>
                    </section>
                  </div>
                  <section className="panel error-chart">
                    <div className="panel-heading">
                      <div>
                        <h3>The shape of the miss</h3>
                        <p>
                          Forecast − actual · positive values mean less wind
                          arrived than forecast
                        </p>
                      </div>
                      <div className="legend">
                        <span>
                          <i className="legend-square" />
                          Hourly error
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 150 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={rows}
                          margin={{ left: 5, right: 16, top: 15, bottom: 0 }}
                        >
                          <CartesianGrid vertical={false} stroke="#edf0ec" />
                          <XAxis
                            dataKey="hour"
                            ticks={[0, 4, 8, 12, 16, 20, 23]}
                            tickFormatter={hourLabel}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#7c8580" }}
                          />
                          <YAxis
                            width={45}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${v / 1000}k`}
                            tick={{ fontSize: 11, fill: "#7c8580" }}
                          />
                          <ReferenceLine y={0} stroke="#9aa79f" />
                          <Tooltip content={<ChartTip />} />
                          <Bar
                            dataKey="error"
                            name="Wind shortfall"
                            fill="#9dbd95"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={22}
                            isAnimationActive={false}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                  <div className="provenance">
                    <Clock3 size={15} />
                    <span>
                      Forecast vintage:{" "}
                      {pubs.length === 1
                        ? `${time(pubs[0])} GMT`
                        : pubs.length
                          ? `${pubs.length} eligible publications across the day`
                          : "No eligible forecast"}{" "}
                      · {day?.count}/24 matched hours
                    </span>
                    <button onClick={() => setTab("method")}>
                      How we calculate <ArrowUpRight size={13} />
                    </button>
                  </div>
                </>
              )}
              {tab === "accuracy" && (
                <>
                  <div className="section-heading">
                    <div>
                      <span className="section-dot" />
                      <h2>January performance</h2>
                      <span className="tag">
                        {data.metrics.count}/{data.expected_hours} MATCHED HOURS
                      </span>
                    </div>
                  </div>
                  <div className="metrics-grid">
                    <Metric
                      label="MEAN ABSOLUTE ERROR"
                      value={num(data.metrics.mae)}
                      unit="MW"
                      detail="Typical magnitude of the forecast miss"
                    />
                    <Metric
                      label="ROOT MEAN SQUARE ERROR"
                      value={num(data.metrics.rmse)}
                      unit="MW"
                      detail="Gives greater weight to large misses"
                    />
                    <Metric
                      label="MEAN BIAS"
                      value={signed(data.metrics.bias)}
                      unit="MW"
                      detail="Positive = wind overforecast on average"
                    />
                    <Metric
                      label="WEIGHTED ABSOLUTE ERROR"
                      value={data.metrics.wape?.toFixed(1) ?? "—"}
                      unit="%"
                      detail="Σ |forecast − actual| / Σ actual"
                      accent
                    />
                  </div>
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h3>One month. Every decision.</h3>
                        <p>
                          Daily mean absolute error by decision date · click a
                          bar to inspect the delivery day
                        </p>
                      </div>
                    </div>
                    <div style={{ height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.days.map((d) => ({
                            ...d,
                            label: date(d.decision_date),
                          }))}
                          margin={{ top: 20, right: 25, left: 0, bottom: 10 }}
                        >
                          <CartesianGrid vertical={false} stroke="#edf0ec" />
                          <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            interval={4}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            formatter={(v: any) => [`${num(v)} MW`, "MAE"]}
                            cursor={{ fill: "#f1f4ef" }}
                          />
                          <Bar
                            dataKey="mae"
                            name="MAE"
                            fill="#528563"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={23}
                            className="clickable"
                            onClick={(d: any) => {
                              setSelected(d.decision_date);
                              setTab("desk");
                            }}
                            isAnimationActive={false}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                  <section className="panel table-panel">
                    <div className="panel-heading">
                      <div>
                        <h3>Decision audit</h3>
                        <p>
                          Fixed cutoff: {cutoff} GMT · error measured against
                          subsequently reported actuals
                        </p>
                      </div>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Decision date</th>
                            <th>Delivery date</th>
                            <th>Matched hours</th>
                            <th>MAE (MW)</th>
                            <th>RMSE (MW)</th>
                            <th>Bias (MW)</th>
                            <th>Inspect</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.days.map((d) => (
                            <tr key={d.decision_date}>
                              <td>{date(d.decision_date)}</td>
                              <td>{date(d.delivery_date)}</td>
                              <td>
                                <span
                                  className={
                                    d.count === 24
                                      ? "coverage"
                                      : "coverage incomplete"
                                  }
                                >
                                  {d.count}/24
                                </span>
                              </td>
                              <td>{num(d.mae)}</td>
                              <td>{num(d.rmse)}</td>
                              <td>{signed(d.bias)}</td>
                              <td>
                                <button
                                  className="table-link"
                                  aria-label={`Inspect decision ${date(d.decision_date)}`}
                                  onClick={() => {
                                    setSelected(d.decision_date);
                                    setTab("desk");
                                  }}
                                >
                                  View <ArrowUpRight size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <div className="info-note">
                    <CircleHelp size={18} />
                    <p>
                      These are retrospective scores for the full January
                      decision window. They include observations that were not
                      yet available on early January decision dates. They must
                      not be treated as a pre-decision risk estimate.
                    </p>
                  </div>
                </>
              )}
              {tab === "method" && (
                <>
                  <div className="method-intro">
                    <div className="method-symbol">
                      <Database size={32} />
                    </div>
                    <div>
                      <h2>Real observations. Reproducible decisions.</h2>
                      <p>
                        Only Elexon national wind data. No synthetic generation,
                        demand assumptions or price estimates.
                      </p>
                    </div>
                  </div>
                  <div className="method-grid">
                    <section className="panel method-card">
                      <span className="step">01 / SOURCE</span>
                      <h3>An auditable historical snapshot</h3>
                      <p>
                        <a
                          href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream"
                          target="_blank"
                          rel="noreferrer"
                        >
                          WINDFOR <ArrowUpRight size={13} />
                        </a>{" "}
                        supplies wind generation forecasts, their target start
                        time and publication time.{" "}
                        <a
                          href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream"
                          target="_blank"
                          rel="noreferrer"
                        >
                          FUELHH <ArrowUpRight size={13} />
                        </a>{" "}
                        supplies half-hourly actuals filtered to{" "}
                        <code>fuelType=WIND</code>.
                      </p>
                      <p>
                        Source: {data.provider}. Retrieved{" "}
                        {new Date(data.retrieved_at).toLocaleString("en-GB", {
                          timeZone: "Europe/London",
                        })}{" "}
                        GMT. The checked-in snapshot is historical; this portal
                        is not a live feed.
                      </p>
                      <p>
                        Elexon’s national WIND series represents the reported
                        market dataset; it must not be assumed to capture all
                        embedded wind or an individual utility’s contracted
                        generation.
                      </p>
                    </section>
                    <section className="panel method-card">
                      <span className="step">02 / DECISION TIME</span>
                      <h3>Use what was known then</h3>
                      <p>
                        Decision dates run from 1 to 31 January 2026. Each
                        decision purchases for the next calendar day: deliveries
                        span 2 January to 1 February.
                      </p>
                      <p>
                        For every target hour, select the record with the latest{" "}
                        <code>publishTime ≤ decision date + cutoff</code>.
                        Forecast vintages may differ between target hours. Later
                        publications are excluded.
                      </p>
                      <p>
                        The default 09:00 London cutoff is an illustrative
                        operational assumption, not an asserted exchange gate
                        closure. Set it to your desk’s deadline. All dates in
                        this window use GMT, so London equals UTC.
                      </p>
                    </section>
                    <section className="panel method-card">
                      <span className="step">03 / ALIGNMENT</span>
                      <h3>Compare like with like</h3>
                      <p>
                        The retrieved WINDFOR snapshot is hourly. For a forecast
                        at 14:00, we compare against the mean of the actual MW
                        readings at 14:00 and 14:30. Both actual readings must
                        exist.
                      </p>
                      <div className="formula">
                        Actual hourly MW = (MW₀₀ + MW₃₀) / 2<br />
                        Error = forecast MW − actual MW
                      </div>
                      <p>
                        Latest actual revisions in the snapshot are used for
                        retrospective scoring. Missing records stay missing: no
                        zero filling, interpolation or later forecast
                        substitution. Energy is the sum of hourly mean MW × one
                        hour, reported as GWh.
                      </p>
                    </section>
                    <section className="panel method-card">
                      <span className="step">04 / INTERPRETATION</span>
                      <h3>Understand the limits</h3>
                      <p>
                        MAE is the average absolute error. RMSE penalises large
                        errors. Bias is the mean signed error. WAPE divides
                        total absolute error by total actual generation; it is
                        undefined if actual generation totals zero.
                      </p>
                      <p>
                        The 90th percentile uses linear interpolation across
                        sorted absolute errors. It is descriptive of this month,
                        not a future prediction interval. Results are not an
                        out-of-sample trading strategy or a quantified financial
                        saving.
                      </p>
                      <p>
                        Wind shortfall indicates a national wind energy gap, not
                        how much this utility should buy. That needs demand,
                        existing positions, other generation and prices, which
                        are outside this pilot.
                      </p>
                    </section>
                  </div>
                  <section className="panel coverage-panel">
                    <div>
                      <h3>Coverage at {cutoff} GMT</h3>
                      <p>
                        Missing observations are visible and excluded from
                        paired accuracy metrics.
                      </p>
                    </div>
                    <div>
                      <b>
                        {data.forecast_hours}/{data.expected_hours}
                      </b>
                      <span>Eligible forecast hours</span>
                    </div>
                    <div>
                      <b>
                        {data.actual_hours}/{data.expected_hours}
                      </b>
                      <span>Complete actual hours</span>
                    </div>
                    <div>
                      <b>
                        {data.metrics.count}/{data.expected_hours}
                      </b>
                      <span>Matched scoring hours</span>
                    </div>
                  </section>
                  <a
                    className="api-link"
                    href="/api/docs"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explore the documented Python API <ArrowUpRight size={16} />
                  </a>
                </>
              )}
            </div>
          )}
          <footer className="page-footer">
            <span>
              <Wind size={15} /> windledger{" "}
              <span className="footer-dot">·</span> Built for informed
              procurement
            </span>
            <span>
              Elexon data <span className="footer-dot">·</span> January 2026
              pilot
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
function Metric({
  label,
  value,
  unit,
  detail,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  unit: string;
  detail: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section className={`metric ${accent ? "accent" : ""}`}>
      <div className="metric-label">
        {label}
        {icon}
      </div>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
      <p>{detail}</p>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
