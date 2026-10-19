# Validation · 19 October 2026

## Automated
- `npm test`: 12 passing behavior tests, zero failures.
- `npm run build`: successful Vite static build, 221.15 kB JS / 66.18 kB gzip.
- Dependency install audit after Vite patch: zero reported vulnerabilities.

## Browser checks
- Initial overview renders map tiles, 126 synthetic points, LOS chart, 107 QC-passing points, 22 candidates and six distance components.
- Timeline Home: only one acquisition remains, zero points pass the eight-observation requirement, no candidates. End restores the full date range.
- Queue search for SAM-063 returns one matching point; navigation and point detail update.
- JSON sample imported through real file chooser: EXAMPLE-01, eight accepted acquisitions, correct source kind and chart.
- CSV report downloaded and inspected: actual values, cutoff, source_kind=synthetic, thresholds and research limitations included.
- Invalid import missing source reference displays validation error and retains the previous dataset.
- Raising coherence to 0.95 produces zero usable points and no candidate scores.
- Responsive viewport 375 × 812: document scroll width equals viewport width (375px); map and detail stack vertically.
- Browser error log: no application errors recorded during checks.

## Not verified / not implemented
- No real SLC processing, satellite catalog download or MintPy integration executed.
- No real pre-event movement, detection lead time, false-alarm rate or event-location accuracy established.
- No field validation, calibrated thresholds, construction causality or operational hospital-risk assessment.
- Browser checks are manual through supported automation, not a committed end-to-end test suite.
- Map tiles and Google Fonts depend on external network services. Data remains local to the browser; no persistent uploaded-data storage.
