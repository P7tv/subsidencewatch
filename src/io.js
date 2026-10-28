function fail(message) {
  throw new Error(message);
}
export function validateDataset(raw) {
  if (!raw || raw.schemaVersion !== 1) fail("schemaVersion must be 1");
  const s = raw.source;
  if (
    !s ||
    !["synthetic", "insar"].includes(s.kind) ||
    typeof s.name !== "string" ||
    !s.name.trim() ||
    s.name.length > 180
  )
    fail("Source name and kind are required");
  if (typeof s.reference !== "string" || !s.reference.trim() || s.reference.length > 1000)
    fail("Source reference and geometry are required");
  if (s.losConvention !== "negative_away")
    fail("losConvention must be negative_away; convert sign before import");
  if (!Array.isArray(raw.points) || !raw.points.length || raw.points.length > 5000)
    fail("Dataset must contain 1–5,000 points");
  const ids = new Set();
  let count = 0;
  for (const p of raw.points) {
    if (typeof p.id !== "string" || !p.id.trim() || p.id.length > 80 || ids.has(p.id))
      fail("Point IDs must be unique nonempty strings (max 80 characters)");
    ids.add(p.id);
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180)
      fail("Invalid point coordinates");
    if (
      typeof p.label !== "string" ||
      p.label.length > 180 ||
      !["hospital", "road", "building", "other"].includes(p.context)
    )
      fail("Each point needs a label and valid context");
    if (!Array.isArray(p.observations) || !p.observations.length) fail("Each point needs observations");
    const dates = new Set();
    for (const o of p.observations) {
      if (
        typeof o.date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(o.date) ||
        !Number.isFinite(Date.parse(o.date)) ||
        new Date(o.date).toISOString().slice(0, 10) !== o.date
      )
        fail("Invalid observation date: use YYYY-MM-DD");
      if (dates.has(o.date)) fail("Duplicate observation date");
      dates.add(o.date);
      if (!Number.isFinite(o.los_mm) || !Number.isFinite(o.coherence))
        fail("Observations must contain finite numbers");
      if (o.coherence < 0 || o.coherence > 1) fail("Coherence must be between 0 and 1");
      if (++count > 250000) fail("Maximum 250,000 observations");
    }
  }
  return structuredClone(raw);
}
export function exportCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const cell = (v) => {
    let s = String(v ?? "");
    if (/^[\s]*[=+@-]/.test(s) && typeof v !== "number") s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
  };
  return [headers.map(cell).join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join(
    "\r\n",
  );
}
export function csvRowsToDataset(rows, source) {
  const points = new Map();
  for (const r of rows) {
    if (!points.has(r.id))
      points.set(r.id, {
        id: r.id,
        lat: Number(r.lat),
        lon: Number(r.lon),
        label: r.label || r.id,
        context: r.context || "other",
        observations: [],
      });
    else {
      const p = points.get(r.id);
      if (p.lat !== Number(r.lat) || p.lon !== Number(r.lon) || p.context !== (r.context || "other"))
        fail("Conflicting metadata for point " + r.id);
    }
    if ([r.lat, r.lon, r.los_mm, r.coherence].some((v) => v == null || String(v).trim() === ""))
      fail("CSV numeric fields cannot be empty");
    points
      .get(r.id)
      .observations.push({ date: r.date, los_mm: Number(r.los_mm), coherence: Number(r.coherence) });
  }
  return validateDataset({ schemaVersion: 1, source, points: [...points.values()] });
}
// Compact bundle from pipeline/05_web_bundle.py: LOS in 0.1 mm and coherence in 0.01 integers.
export function expandCompact(bundle) {
  if (bundle?.format !== "subsidencewatch-compact-1") fail("Unknown compact format");
  const { dates } = bundle;
  const points = bundle.points.map(([id, lat, lon, label, context, los, coh]) => {
    if (los.length !== dates.length || coh.length !== dates.length) fail(`Series length mismatch for ${id}`);
    return {
      id,
      lat,
      lon,
      label,
      context,
      observations: dates.map((date, i) => ({ date, los_mm: los[i] / 10, coherence: coh[i] / 100 })),
    };
  });
  return {
    dataset: validateDataset({ schemaVersion: 1, source: bundle.source, points }),
    overlay: bundle.overlay ?? null,
  };
}
