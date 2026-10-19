# SubsidenceWatch · Samsen Lab

ต้นแบบสำหรับสำรวจหลักฐานการเคลื่อนตัวของพื้นดินและจัดลำดับจุดลงตรวจ บริเวณสามเสน–วชิรพยาบาล

## Run

Requires Node.js 22.12+ (tested on 25.9.0).

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite. Production: `npm run build`, then `npm run preview`. Test: `npm test`.

## Included

- Interactive OpenStreetMap map, point selection and quality legend.
- Date cutoff and playback; every calculation uses only observations on or before the selected date.
- LOS displacement chart; accepted and rejected coherence observations are distinguished.
- QC filtering, linear velocity and one-sided residual CUSUM.
- Spatial connected components at 180 m; this implementation is **not HDBSCAN**.
- Searchable, filterable inspection queue with illustrative scores.
- JSON/CSV import with validation; data is processed locally in the browser, not uploaded.
- CSV report export includes cutoff, thresholds, source and limitations.
- Responsive Thai interface and keyboard-accessible queue.

## Data is synthetic by default

All 126 bundled points, 44 acquisition dates, values and anomalies are synthetic. They are not the actual 44-scene Sentinel-1 inventory mentioned in the prior chat. They do not establish that precursor motion was present before the Samsen event. Map tiles show real geography, but the motion points and their context labels are generated examples. The central hospital marker is an approximate study-area reference. Context labels are manually supplied categories, not a verified hospital service or engineering asset registry.

## Import contract

Use “นำเข้าข้อมูล” → “ดาวน์โหลดตัวอย่าง” for a complete synthetic JSON file. A small, explicitly synthetic template is also available at `public/sample-insar.json`.

```json
{
  "schemaVersion": 1,
  "source": {
    "name": "Your processed LOS time series",
    "kind": "insar",
    "reference": "Reference point coordinates; reference acquisition; ascending/descending and relative orbit; preprocessing details",
    "losConvention": "negative_away"
  },
  "points": [{
    "id": "P001", "lat": 13.778, "lon": 100.506,
    "label": "Point label", "context": "hospital",
    "observations": [{"date": "2025-01-01", "los_mm": -1.2, "coherence": 0.85}]
  }]
}
```

CSV columns: `id,lat,lon,label,context,date,los_mm,coherence`. One row per observation; consistent metadata per point. Provide source name/reference in the import form for CSV. Context must be `hospital`, `road`, `building` or `other`. Coordinates are WGS84 degrees; LOS values in millimetres, negative away from satellite. Convert units/sign before importing. Dates must be valid unique YYYY-MM-DD per point. Coherence is 0–1; numeric fields cannot be missing. Limits: 20 MB, 5,000 points, 250,000 observations. Invalid files leave the previous dataset intact. Browser-only state resets on reload; retain your source files.

## Analysis and practical limits

1. Filter by date cutoff, then coherence (default ≥ 0.65); require ≥8 accepted observations.
2. Fit ordinary least-squares baseline to first half (minimum four observations); fit full accepted series for velocity in mm/year.
3. On the later half compute `S = max(0, S + (predicted_LOS - observed_LOS)/sigma - 0.5)`. Sigma is baseline RMSE with 1.5 mm floor. First `S >= threshold` (default 4) marks an illustrative candidate.
4. Group anomaly points by transitive neighbour links ≤180 m, keeping isolated candidates. This is not a density clustering model.
5. Score candidates: `100 * (0.7 * min(1, maxCUSUM / (3 * threshold)) + 0.3 * contextWeight)`, rounded. Context weights: hospital 1, road .65, building .4, other .2. These are illustrative choices, not empirical probabilities. Low-quality points receive no score.

Baseline is recomputed at each cutoff, so change dates and classifications can change as accepted observations grow. CUSUM values here use the irregular satellite acquisition sequence without a sampling-interval correction. This detector only examines negative departures from its linear baseline; it does not cover positive changes or all deformation regimes. Thresholds have not been calibrated. Velocity is LOS, **not vertical subsidence**; “watch” and “insufficient” never establish safety. This tool does not predict collapse, identify construction causality or provide an operational alert. A single historical event cannot establish general precision/recall.

## Replace the demo with real evidence

1. Recover the previously generated 44-scene inventory and proposal; they were not attached to this project.
2. Verify matching Sentinel-1 SLC geometry/burst, dates and acquisition coverage from the actual catalog.
3. Process one or two pairs first with a validated external InSAR workflow; measure coherence, unwrap quality and resource use. This web app does not process SAR SLC files.
4. Build a QC-reviewed LOS time series using your chosen processor/MintPy. Export geocoded points and per-acquisition quality, documenting reference, orbit, sign, units and atmospheric correction.
5. Import using the above schema, select pre-event cutoff and compare with independently verified event location and control areas. Keep observed and missing evidence separate.
6. Validate with leveling/GNSS/GPR or other field measurements; calibrate thresholds and context weights with qualified reviewers before operational use.

## Layout

`src/analysis.js`: pure calculation. `src/io.js`: validated input and safe CSV. `src/data.js`: synthetic generator. `src/main.js`: UI/map/chart. `src/style.css`: responsive interface. `tests/analysis.test.js`: regression tests. No backend or credentials required. Leaflet tiles and optional Google Fonts use network access; points and analysis remain available if tiles fail.

© Project prototype. Code dependencies retain their respective licenses. Map data © OpenStreetMap contributors.
