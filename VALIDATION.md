# Validation · 26 October 2026

## Automated
- `npm test`: 23 passing tests (detector, acceleration fit, risk levels, no temporal leakage, first alert, control threshold, event contrast, compact bundle, import validation, CSV safety).
- `npm run build`: successful Vite static build.

## Real-data pipeline (pipeline/)
- 390 HyP3 burst pairs (195 × 10x2, 195 × 5x1), all succeeded; clipped products verified pixel-for-pixel against source.
- MintPy runs end normally for both sets; pre-event only (64 acquisitions, 186 of 195 pairs kept).
- Event location: largest event-spanning coherence loss within 300 m of the Vajira MRT station, 13.78074, 100.50994; reverse-geocodes to Soi Lang Samsen police station, 38 m from Samsen Road.
- Calibrated threshold gives 5.0% alarms in the control area (> 400 m) at every tested date.

## Browser checks (headless Chrome via DevTools protocol)
- Desktop 1440 px: real data loads by default (3,900 points), banner shows countdown, contrast and verdict; overlay button shows the coherence-loss image and hides points; timeline scrub, playback, real/synthetic switch and method view work; no console errors.
- Phones 360/390/430 px: no horizontal page scroll; overlay tap scrolls the map into view.
- `npm run demo` serves on all interfaces and bakes the LAN URL into the QR button; page and data load via localhost.

## Added 30 October 2026
- Collapse timing: first emergency call 07:08 (Matichon timeline); the proposal reports surface subsidence from ~05:00, so the 06:08 acquisition may show the onset. With cutoff 17 Sep the event area still ranks above ~93% of control cells (6.9% of cells as high), after the cadence correction.
- Daily control-median removal tested and rejected: cells as anomalous as the event rose from 6.9% to 12.9%.
- Detection floor (`npm run floor`): ~40% detection for +10 mm/yr over 8 months, ~95% for +20 mm/yr; false alarms 4.7% at the calibrated threshold.
- Risk levels at cutoff 17 Sep: 2 priority, 335 inspect, 118 watch, 3,429 baseline, 16 insufficient.
- CUSUM steps weighted by time since the previous sample (cadence correction), with a regression test; all numbers above are after it.
- Pipeline edits (docstrings, NaN guard, pinned 5x1 reference, run commands) were syntax-checked only; MintPy was not rerun.

## Not verified
- A phone actually loading the LAN URL (this environment cannot reach its own LAN address; macOS firewall is on and may prompt to allow incoming connections for node).
- Interaction with the Chrome extension or a real touch device.
- No field validation, calibrated collapse probability or operational alerting.
