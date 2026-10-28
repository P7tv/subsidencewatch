const DAY = 86400000;
export function regression(samples) {
  const start = Date.parse(samples[0].date),
    xs = samples.map((o) => (Date.parse(o.date) - start) / DAY);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length,
    my = samples.reduce((a, b) => a + b.los_mm, 0) / samples.length;
  const variance = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const slope = variance ? xs.reduce((a, x, i) => a + (x - mx) * (samples[i].los_mm - my), 0) / variance : 0;
  return { slope, intercept: my - slope * mx, start };
}
export function analyzePoint(point, cutoff, { minCoherence = 0.65, sensitivity = 4 } = {}) {
  const available = point.observations
    .filter((o) => o.date <= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));
  const samples = available.filter((o) => o.coherence >= minCoherence);
  const base = {
    id: point.id,
    lat: point.lat,
    lon: point.lon,
    label: point.label,
    context: point.context,
    samples,
    available: available.length,
    coherence: samples.length ? samples.reduce((a, o) => a + o.coherence, 0) / samples.length : null,
    velocity: null,
    cusum: 0,
    changeDate: null,
    baseline: null,
    score: null,
    status: "insufficient",
  };
  if (samples.length < 8) return base;
  const n = Math.max(4, Math.floor(samples.length / 2)),
    baseline = regression(samples.slice(0, n));
  const predict = (o) => baseline.intercept + (baseline.slope * (Date.parse(o.date) - baseline.start)) / DAY;
  const sigma = Math.max(
    1.5,
    Math.sqrt(samples.slice(0, n).reduce((a, o) => a + (o.los_mm - predict(o)) ** 2, 0) / n),
  );
  let running = 0,
    peak = 0,
    changeDate = null;
  for (const o of samples.slice(n)) {
    running = Math.max(0, running + (predict(o) - o.los_mm) / sigma - 0.5);
    peak = Math.max(peak, running);
    if (running >= sensitivity && !changeDate) changeDate = o.date;
  }
  const status = changeDate ? "anomaly" : "watch";
  const strength = Math.min(1, peak / (sensitivity * 3));
  const contextWeight = { hospital: 1, road: 0.65, building: 0.4, other: 0.2 }[point.context] ?? 0.2;
  const score = status === "anomaly" ? Math.round(100 * (0.7 * strength + 0.3 * contextWeight)) : null;
  return {
    ...base,
    status,
    velocity: regression(samples).slope * 365.25,
    cusum: peak,
    changeDate,
    baseline,
    score,
  };
}
// Replays each acquisition before the event as if it were "today" and returns the first one at which
// any point within radiusMeters of the event becomes an anomaly. Nothing on or after the event is used.
export function firstAlert(points, event, cutoff, options, radiusMeters = 500) {
  const nearby = points.filter((p) => distanceMeters(p, event) <= radiusMeters);
  const dates = [...new Set(nearby.flatMap((p) => p.observations.map((o) => o.date)))]
    .filter((d) => d < event.date && d <= cutoff)
    .sort();
  for (const date of dates) {
    const hit = nearby.find((p) => analyzePoint(p, date, options).status === "anomaly");
    if (hit) return { date, id: hit.id, days: (Date.parse(event.date) - Date.parse(date)) / DAY };
  }
  return null;
}
export function distanceMeters(a, b) {
  const rad = Math.PI / 180;
  const dlat = (b.lat - a.lat) * rad,
    dlon = (b.lon - a.lon) * rad;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dlon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function clusterPoints(rows, radiusMeters = 180) {
  const remaining = new Set(rows.filter((p) => p.status === "anomaly"));
  const components = [];
  while (remaining.size) {
    const seed = remaining.values().next().value;
    remaining.delete(seed);
    const component = [seed];
    for (let i = 0; i < component.length; i++)
      for (const p of remaining)
        if (distanceMeters(component[i], p) <= radiusMeters) {
          remaining.delete(p);
          component.push(p);
        }
    components.push(component);
  }
  return components;
}
const usable = (rows) => rows.filter((r) => r.status !== "insufficient");
// Data-driven alarm level: the CUSUM that only falseAlarmRate of distant (control) points reach.
export function controlThreshold(rows, event, { minDistance = 400, falseAlarmRate = 0.05, floor = 4 } = {}) {
  const control = usable(rows)
    .filter((r) => distanceMeters(r, event) > minDistance)
    .map((r) => r.cusum)
    .sort((a, b) => a - b);
  if (!control.length) return floor;
  return Math.max(floor, control[Math.min(control.length - 1, Math.floor((1 - falseAlarmRate) * control.length))]);
}
// Mean CUSUM within radius of the event, ranked against the same statistic over square control cells
// (cell ~ disc area), so the comparison is like-for-like instead of a disc mean against single points.
export function eventContrast(rows, event, { radius = 60, minDistance = 400, cell = 110, minPerCell = 3 } = {}) {
  const ok = usable(rows);
  const near = ok.filter((r) => distanceMeters(r, event) <= radius);
  if (!near.length) return null;
  const mean = (g) => g.reduce((s, r) => s + r.cusum, 0) / g.length;
  const eventMean = mean(near);
  const mPerLat = 111320,
    mPerLon = 111320 * Math.cos((event.lat * Math.PI) / 180);
  const cells = new Map();
  for (const r of ok) {
    if (distanceMeters(r, event) <= minDistance) continue;
    const key = `${Math.floor((r.lat * mPerLat) / cell)},${Math.floor((r.lon * mPerLon) / cell)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(r);
  }
  const means = [...cells.values()].filter((g) => g.length >= minPerCell).map(mean);
  if (!means.length) return null;
  return {
    n: near.length,
    eventMean,
    cells: means.length,
    percentile: means.filter((m) => m < eventMean).length / means.length,
    asHigh: means.filter((m) => m >= eventMean).length / means.length,
  };
}
