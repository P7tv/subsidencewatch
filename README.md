# SubsidenceWatch · Samsen Lab

ต้นแบบสำหรับสำรวจหลักฐานการเคลื่อนตัวของพื้นดินและจัดลำดับจุดลงตรวจ บริเวณสามเสน–วชิรพยาบาล

## Run

Requires Node.js 22.12+ (tested on 25.9.0).

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite. Production: `npm run build`, then `npm run preview`. Test: `npm test`.

## Demo day

```sh
npm ci
npm run demo        # builds, serves on every network interface, prints the phone URL
```

- Laptop: open `http://localhost:4173/`. Phones: the printed `http://<lan-ip>:4173/`, or the **QR มือถือ** button in the app (shown when a LAN address was found).
- Venue Wi-Fi often blocks device-to-device traffic. Share a hotspot from your own phone and connect the laptop to it; judges' phones join the same hotspot.
- Map tiles need internet; points, overlay and analysis still work without them.
- `?data=demo` opens straight into the synthetic method demo.

Suggested 1–2 minute flow: tap **ดาวเทียมเห็นหลุม** (Sentinel-1 coherence loss at the collapse) → press ▶ to replay pre-event data up to 06:08 on the morning of the collapse → read the verdict line and the **วิธีวิเคราะห์ → ผลทดสอบกับ Sentinel-1 จริง** card.

## Included

- **Real data by default**: 3,900 Sentinel-1 points (20 m, descending track 62), 64 pre-event acquisitions 2024-01-02 to 2025-09-23 23:08 UTC, from HyP3 + MintPy (`pipeline/`). Switch to the synthetic demo in the top bar.
- **ดาวเทียมเห็นหลุม** overlay: coherence lost between the last pre-event pairs and pairs spanning the event. Strongest within 300 m of the Vajira MRT station at the collapse site, but other patches (construction, water) also appear; it confirms the location rather than finding it.
- **Control-area calibration** (real data): the CUSUM alarm level is the 95th percentile of points more than 400 m from the event at the selected date, so ~5% false alarms by construction. The banner ranks the mean CUSUM within 60 m of the collapse against ~110 m control cells and states how many ordinary cells are as anomalous.
- Synthetic demo keeps the first-alert lead time (`firstAlert`), labelled as synthetic.
- Date cutoff and playback; every calculation uses only observations on or before the selected date.
- LOS chart with fitted baseline, first CUSUM exceedance and event date; accepted and rejected observations distinguished.
- QC filtering, linear velocity and one-sided residual CUSUM; spatial connected components at 180 m (**not HDBSCAN**).
- Searchable inspection queue, JSON/CSV import with validation (processed locally), CSV report export with thresholds and limitations.
- Responsive Thai interface down to 360 px.

## Real-data result (retrospective, pre-event data only)

- The 60 m area around the collapse ranks above ~93–95% of control cells from July 2025, but ~5–7% of ordinary cells are as anomalous: not usable as a warning.
- No accelerating subsidence in the weeks before the collapse. The 06:08 acquisition moves the whole area together (likely atmosphere).
- 20–40 m InSAR confirms the location after the event; early warning would need building-scale PS-InSAR, more geometries and tunnel instrumentation.

## Synthetic demo data

The synthetic mode has 126 generated points around the collapse with an injected subsidence signal; its 186-day lead time demonstrates the method only. Context labels in synthetic mode are generated; in real mode they come from OpenStreetMap plus an approximate Vajira Hospital radius.

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

`src/analysis.js`: pure calculation incl. control calibration. `src/io.js`: validated input, compact bundles and safe CSV. `src/data.js`: synthetic generator. `src/event.js`: event date/location. `src/main.js`: UI/map/chart. `public/data/`: real-data bundle and overlay from `pipeline/05_web_bundle.py`. `scripts/demo.mjs`: LAN demo server. `src/style.css`: responsive interface. `tests/analysis.test.js`: regression tests. No backend or credentials required. Leaflet tiles and optional Google Fonts use network access; points and analysis remain available if tiles fail.

© Project prototype. Code dependencies retain their respective licenses. Map data © OpenStreetMap contributors.
