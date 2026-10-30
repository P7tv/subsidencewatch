import test from "node:test";
import assert from "node:assert/strict";
import { analyzePoint, clusterPoints, firstAlert, controlThreshold, eventContrast, acceleration, riskLevels } from "../src/analysis.js";
import { validateDataset, exportCsv, csvRowsToDataset, expandCompact } from "../src/io.js";
import { createDemo } from "../src/data.js";

const observations = Array.from({ length: 16 }, (_, i) => ({
  date: new Date(Date.UTC(2025, 0, 1 + i * 12)).toISOString().slice(0, 10),
  los_mm: i < 8 ? -i * 0.2 : -1.6 - (i - 7) * 3,
  coherence: 0.9,
}));
const point = { id: "P1", lat: 13.778, lon: 100.506, label: "Test", context: "hospital", observations };
test("accelerating negative movement produces a review candidate", () => {
  const a = analyzePoint(point, "2025-12-31", { minCoherence: 0.65, sensitivity: 4 });
  assert.equal(a.status, "anomaly");
  assert.ok(a.changeDate);
  assert.ok(a.velocity < -20);
});
test("stable linear movement does not trip the change detector", () => {
  const a = analyzePoint(
    { ...point, observations: observations.map((o, i) => ({ ...o, los_mm: -i * 0.2 })) },
    "2025-12-31",
    { minCoherence: 0.65, sensitivity: 4 },
  );
  assert.equal(a.status, "watch");
});
test("future changes cannot alter a historical result", () => {
  const cutoff = observations[7].date;
  const a = analyzePoint(point, cutoff, {});
  const b = analyzePoint(
    { ...point, observations: observations.map((o, i) => (i > 7 ? { ...o, los_mm: -99999 } : o)) },
    cutoff,
    {},
  );
  assert.deepEqual(a, b);
  assert.equal(a.samples.length, 8);
});
test("low coherence remains insufficient rather than safe", () => {
  assert.equal(
    analyzePoint(
      { ...point, observations: observations.map((o) => ({ ...o, coherence: 0.2 })) },
      "2025-12-31",
      {},
    ).status,
    "insufficient",
  );
});
test("spatial components link nearby anomalies only", () => {
  const rows = [
    { id: "A", lat: 13.778, lon: 100.506, status: "anomaly" },
    { id: "B", lat: 13.7781, lon: 100.506, status: "anomaly" },
    { id: "C", lat: 13.79, lon: 100.52, status: "anomaly" },
    { id: "D", lat: 13.778, lon: 100.506, status: "watch" },
  ];
  assert.deepEqual(
    clusterPoints(rows, 100).map((c) => c.map((p) => p.id)),
    [["A", "B"], ["C"]],
  );
});
const dataset = {
  schemaVersion: 1,
  source: {
    name: "Imported",
    kind: "insar",
    reference: "Stable reference R1; descending orbit 62",
    losConvention: "negative_away",
  },
  points: [point],
};
test("valid import retains explicit LOS reference", () => {
  assert.equal(validateDataset(dataset).source.reference, dataset.source.reference);
});
test("duplicate dates and impossible coordinates are rejected", () => {
  assert.throws(() => validateDataset({ ...dataset, points: [{ ...point, lat: 100 }] }), /coordinates/i);
  assert.throws(
    () =>
      validateDataset({
        ...dataset,
        points: [{ ...point, observations: [observations[0], observations[0]] }],
      }),
    /duplicate/i,
  );
});
test("missing source reference and nonfinite samples are rejected", () => {
  assert.throws(
    () => validateDataset({ ...dataset, source: { ...dataset.source, reference: "" } }),
    /reference/i,
  );
  assert.throws(
    () =>
      validateDataset({
        ...dataset,
        points: [{ ...point, observations: [{ ...observations[0], los_mm: Infinity }] }],
      }),
    /finite/i,
  );
});
test("CSV protects formula cells and quotes embedded delimiters", () => {
  const csv = exportCsv([{ id: "=1+1", reason: "a,b", label: 'a"b' }]);
  assert.ok(csv.includes("'=1+1"));
  assert.ok(csv.includes('"a,b"'));
  assert.ok(csv.includes('"a""b"'));
});
test("CSV groups observations by point and rejects inconsistent coordinates", () => {
  const row = {
    id: "P1",
    lat: "13.778",
    lon: "100.506",
    label: "A",
    context: "road",
    date: "2025-01-01",
    los_mm: "0",
    coherence: ".8",
  };
  assert.equal(
    csvRowsToDataset([row, { ...row, date: "2025-01-13", los_mm: "-2" }], dataset.source).points[0]
      .observations.length,
    2,
  );
  assert.throws(
    () => csvRowsToDataset([row, { ...row, lat: "14", date: "2025-01-13" }], dataset.source),
    /conflicting/i,
  );
  assert.throws(() => csvRowsToDataset([{ ...row, los_mm: "" }], dataset.source), /empty/i);
});
test("impossible calendar dates are rejected", () =>
  assert.throws(
    () =>
      validateDataset({
        ...dataset,
        points: [{ ...point, observations: [{ date: "2025-02-30", los_mm: 0, coherence: 0.8 }] }],
      }),
    /date/i,
  ));
test("demo contains valid synthetic data and quality failure examples", () => {
  const d = validateDataset(createDemo());
  assert.equal(d.source.kind, "synthetic");
  assert.equal(d.points.length, 126);
  const rows = d.points.map((p) => analyzePoint(p, "2025-09-23", {}));
  assert.ok(rows.some((r) => r.status === "insufficient"));
  assert.ok(rows.some((r) => r.status === "anomaly"));
  assert.ok(clusterPoints(rows).some((g) => g.length > 1));
});

const event = { date: "2025-07-01", lat: 13.778, lon: 100.506 };
test("anomalous points expose the baseline used by the detector", () => {
  const a = analyzePoint(point, "2025-12-31", {});
  assert.ok(Number.isFinite(a.baseline.slope) && Number.isFinite(a.baseline.intercept));
  assert.equal(analyzePoint(point, "2025-01-01", {}).baseline, null);
});
test("first alert is the earliest pre-event cutoff at which a nearby point trips", () => {
  const a = firstAlert([point], event, "2025-12-31", {});
  assert.ok(a.date < event.date);
  assert.equal(a.id, "P1");
  assert.equal(a.days, (Date.parse(event.date) - Date.parse(a.date)) / 86400000);
  assert.equal(analyzePoint(point, observations[observations.findIndex((o) => o.date === a.date) - 1].date, {}).status, "watch");
});
test("first alert ignores observations on or after the event and before the selected cutoff", () => {
  assert.equal(firstAlert([point], { ...event, date: observations[8].date }, "2025-12-31", {}), null);
  assert.equal(firstAlert([point], event, observations[8].date, {}), null);
});
test("first alert ignores points outside the event radius", () => {
  assert.equal(firstAlert([{ ...point, lat: 13.8 }], event, "2025-12-31", {}, 500), null);
});

// Rows shaped like analyzePoint output: a ring of control points far from the event plus a hot event cluster.
const ev = { lat: 13.78, lon: 100.51 };
const ring = Array.from({ length: 200 }, (_, i) => ({
  id: `C${i}`,
  lat: ev.lat + 0.008 * Math.sin(i) + 0.006 * Math.sign(Math.sin(i)),
  lon: ev.lon + 0.008 * Math.cos(i * 1.3) + 0.006 * Math.sign(Math.cos(i * 1.3)),
  status: "watch",
  cusum: i % 20, // 0..19 repeating: 95th percentile is 19
}));
const hot = Array.from({ length: 6 }, (_, i) => ({ id: `E${i}`, lat: ev.lat + i * 0.0001, lon: ev.lon, status: "watch", cusum: 30 }));
test("control threshold is the false-alarm quantile of distant points, never below the floor", () => {
  assert.equal(controlThreshold([...ring, ...hot], ev, { floor: 4 }), 19);
  assert.equal(controlThreshold(ring.map((r) => ({ ...r, cusum: 1 })), ev, { floor: 4 }), 4);
  assert.equal(controlThreshold([...hot], ev, { floor: 4 }), 4, "no control points falls back to floor");
});
test("control threshold ignores points without enough data", () => {
  const rows = [...ring, ...ring.map((r) => ({ ...r, id: r.id + "x", status: "insufficient", cusum: 999 }))];
  assert.equal(controlThreshold(rows, ev, { floor: 4 }), 19);
});
test("event contrast ranks the event disc against control cells", () => {
  const c = eventContrast([...ring, ...hot], ev, { radius: 60, cell: 400 });
  assert.equal(c.n, 6);
  assert.equal(c.eventMean, 30);
  assert.ok(c.cells > 0);
  assert.equal(c.asHigh, 0);
  const cold = eventContrast([...ring, ...hot.map((h) => ({ ...h, cusum: 0 }))], ev, { radius: 60, cell: 400 });
  assert.equal(cold.asHigh, 1);
  assert.equal(eventContrast(ring, ev, { radius: 60 }), null, "no points near the event");
});
test("compact bundles expand to a validated dataset", () => {
  const bundle = {
    format: "subsidencewatch-compact-1",
    source: dataset.source,
    dates: ["2025-01-01", "2025-01-13"],
    points: [["R1", 13.78, 100.51, "ถนน", "road", [-12, 5], [80, 91]]],
    overlay: { url: "data/x.png", bounds: [[1, 2], [3, 4]] },
  };
  const { dataset: d, overlay } = expandCompact(bundle);
  assert.deepEqual(d.points[0].observations, [
    { date: "2025-01-01", los_mm: -1.2, coherence: 0.8 },
    { date: "2025-01-13", los_mm: 0.5, coherence: 0.91 },
  ]);
  assert.equal(overlay.url, "data/x.png");
  assert.throws(() => expandCompact({ ...bundle, format: "other" }), /format/i);
  assert.throws(() => expandCompact({ ...bundle, points: [["R1", 13.78, 100.51, "x", "road", [1], [80, 91]]] }), /length/i);
});

test("acceleration recovers a known quadratic", () => {
  const samples = Array.from({ length: 30 }, (_, i) => {
    const t = (i * 12) / 365.25;
    return { date: new Date(Date.UTC(2024, 0, 1 + i * 12)).toISOString().slice(0, 10), los_mm: 2 - 3 * t - 4 * t * t };
  });
  const a = acceleration(samples);
  assert.ok(Math.abs(a.c + 8) < 1e-6, `c=${a.c}`);
  assert.ok(a.se < 1e-6);
});

test("risk levels: priority needs change-point, significant acceleration and an excavation site", () => {
  const event = { lat: 13.778, lon: 100.506 };
  const row = analyzePoint(point, "2025-12-31");
  assert.equal(row.status, "anomaly");
  const far = { lat: 13.9, lon: 100.6 };
  assert.equal(riskLevels([row], event, [event])[0].level, "priority");
  assert.equal(riskLevels([row], event, [far])[0].level, "inspect");
  const stable = analyzePoint({ ...point, observations: observations.map((o, i) => ({ ...o, los_mm: -i * 0.2 })) }, "2025-12-31");
  assert.equal(riskLevels([stable], event, [event])[0].level, "baseline");
});
