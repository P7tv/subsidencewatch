# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SubsidenceWatch (Samsen Lab): a static, backend-less Vite + vanilla JS web app (Thai UI) for exploring Sentinel-1 InSAR evidence around the Sept 2025 Samsen/Vajira Hospital sinkhole, plus a Python pipeline that produces the real data. It is a retrospective prototype, not a warning system. Keep that framing in any copy or claims (see README "Real-data result" and "Analysis and practical limits"; VALIDATION.md lists what is not verified).

## Commands

Requires Node.js 22.12+.

```sh
npm ci
npm run dev        # vite on 127.0.0.1
npm run build      # static build to dist/ (deployed via .openai/hosting.json)
npm run preview
npm test           # node --test tests/*.test.js
node --test --test-name-pattern="<name>" tests/analysis.test.js   # single test
npm run demo       # build + serve on all interfaces, bakes LAN URL into the QR button
npm run floor      # detection floor: inject subsidence into real control-point noise
```

No linter is configured. `?data=demo` opens the synthetic dataset directly.

## Architecture

**Web app (`src/`)**: `analysis.js` is pure calculation (QC filter → baseline fit on first half → one-sided residual CUSUM → connected-component grouping at 180 m → scoring, plus control-area threshold calibration). `io.js` handles validated JSON/CSV import and the compact bundle format used for the real data. `data.js` generates the synthetic demo. `event.js` holds the event date/location. `main.js` is all UI (Leaflet map, LOS chart, timeline playback, queue, import, QR). The thresholds, weights and scoring formula are documented in README and are illustrative, not calibrated.

Key invariant: every calculation uses only observations on or before the selected cutoff date (no temporal leakage; tested). Post-event acquisitions are never fed to the detector.

**Real-data pipeline (`pipeline/`, numbered scripts run in order)**: `01_submit` (ASF HyP3 burst InSAR jobs; dry run by default, `--submit` spends credits) → `02_download` (clips each product to the AOI, deletes the zip) → `04_locate_event` (coherence loss across the event) → MintPy time series (`samsen_*.cfg`, pre-event only via `endDate = 20250923`) → `03_export` (MintPy → app JSON schema, OSM context) → `05_web_bundle` (writes `public/data/samsen-real.json` and `coherence-loss.png`). `config.py` is shared settings (burst, AOI, event date, looks); the event lat/lon there must stay in sync with `src/event.js`. Setup steps (Earthdata `~/.netrc`, uv venv, micromamba MintPy env) are in `pipeline/README.md`. `pipeline/{.venv,data,tools,mintpy_*}` are gitignored.

Importing data into the app: schema and CSV columns are in README "Import contract" (negative LOS = away from satellite, WGS84, limits 20 MB / 5,000 points / 250,000 observations).
