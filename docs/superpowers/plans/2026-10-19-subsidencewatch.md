# SubsidenceWatch Implementation Plan

> **For agentic workers:** Use inline execution for this single new project. Follow the approved design and meaningful test-first validation.

**Goal:** A runnable Samsen inspection-evidence prototype with timeline, map, chart, imports and exports.

**Architecture:** Vite browser application; pure analysis and import modules are independent of the UI. Leaflet handles map navigation. All uploaded data stays in the browser.

**Tech Stack:** JavaScript ES modules, Vite, Leaflet, PapaParse, Lucide, node:test.

## Global Constraints
Synthetic data must be explicit. No future observations in analyses. LOS is not vertical displacement. No calibrated collapse probabilities. No HDBSCAN claim for distance components. Imported references and geometry are required.

### Task 1: Analysis and data boundary
Files: src/analysis.js, src/data.js, src/io.js, tests/analysis.test.js.
Interfaces: analyzePoint(point,cutoff,{minCoherence,sensitivity}) returns status, velocity, samples, cusum, changeDate, score; clusterPoints(results,radiusMeters) returns component members; validateDataset(raw) returns validated dataset; exportCsv(rows) emits escaped CSV.
- [x] Write hand-checked behavior tests and run `npm test`; observed failure before modules existed.
- [x] Implement QC, regression, one-sided residual CUSUM, distance components, strict import and safe CSV.
- [x] Run `npm test`; 12 tests passed.

### Task 2: Interactive application
Files: index.html, src/main.js, src/style.css, README.md, public/sample-insar.json.
Consumes: analysis/data/io module contracts above.
- [x] Create deterministic synthetic observations spanning 44 acquisition dates with stable, changing and low-quality examples.
- [x] Implement map/queue selection, chart, cutoff, filters, settings, overview/queue/method views, imports and exports.
- [x] Run `npm run build`; static dist output created.
- [x] Serve and verify linked interactions, keyboard-accessible controls, error/empty states and mobile overflow.

### Task 3: Delivery
- [x] Re-run tests after final logic changes; preserve evidence in VALIDATION.md.
- [x] Document start commands, schema, method limits and steps to replace synthetic data.
- [ ] Package project source and deliver a working preview; publish privately through Sites if available.
