# SubsidenceWatch prototype

Approved direction: Samsen–Vajira Hospital retrospective ground-motion evidence and inspection queue, based on the previous conversation. Build the connected dashboard and analysis prototype now.

## Scope
Browser-local application: geographic point map, historical cutoff, selected-point LOS chart, quality filtering, interpretable change detector, spatial connected components, ranked inspection queue, JSON/CSV imports and CSV exports. No account or backend required. Bundle deterministic synthetic data, explicitly labelled in every view and export. No claim of actual satellite processing, operational alerts, calibrated collapse probability or validated historical detection.

## Contracts
Dataset JSON: schemaVersion=1, source={name,kind:synthetic|insar,reference,losConvention}, points=[{id,lat,lon,label,context,observations:[{date:YYYY-MM-DD,los_mm,coherence}]}]. Dates unique per point. Geographic coordinates and numbers finite; coherence in [0,1]; max 5,000 points / 250,000 observations. Dates are acquisition dates, shown without timezone conversion. Negative LOS denotes movement away from the sensor; it is not automatically vertical subsidence. Reference and geometry must be provided for imported InSAR.

## Analysis
Filter observations at cutoff first, then by coherence. At least eight accepted samples are required. Fit a linear baseline on the first half of the accepted samples, min four. One-sided CUSUM runs on later residuals in the negative direction with a fixed mm noise floor and sensitivity parameter. Velocity is an OLS slope in mm/year. Exceedance means evidence for review, never collapse probability. Quality/no-data status is separate. Cluster detected points by distance using connected components, explicitly not HDBSCAN. Rank only QC-passing anomalies with a documented illustrative weighted score combining detector strength and manually supplied context. No inferred construction causality. No labels or post-event observations are used in the detector.

## Interface
Light operational workspace, teal navigation, pale neutral panels, orange/red review statuses, labelled symbol legend. Map and detail panel linked by selection; keyboard-accessible queue offers the same point selection. Sidebar navigation switches overview/inspection/method views. Timeline control updates metrics, chart cutoff, map, and queue. Import dialog validates atomically and preserves prior dataset on error. Clear empty states, tile-error fallback, accessible labels and reduced-motion support. Responsive layout down to 375px.

## Validation
Node tests cover no temporal leakage, detector response versus stable baseline, quality exclusion, graph components, import validation and injection-resistant exports. Browser checks cover initial load, point selection, cutoff updates, filtering, navigation, sample import/export, and responsive overflow. Satellite acquisition and InSAR preprocessing remain an external prerequisite; include the next real-data steps in README.
