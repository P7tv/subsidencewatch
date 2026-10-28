# Real-data pipeline (Sentinel-1 → SubsidenceWatch)

Burst InSAR over Samsen from ASF HyP3, time series with MintPy, exported to the app's JSON schema.

| Item | Value |
|---|---|
| Burst | `062_132018_IW2`, descending, VV |
| Acquisitions | 67, 2024-01-02 to 2025-10-11 (6-day cadence from Apr 2025 with Sentinel-1C) |
| Last pre-event | 2025-09-23 23:08 UTC = 24 Sep 06:08 Bangkok, before the morning collapse |
| Network | each acquisition to its next 3 → 195 pairs, 10x2 looks (~40 m) |

Post-event acquisitions (29 Sep onward) are processed only to locate the sinkhole from coherence loss; the app never uses them for detection.

## Steps

1. **Earthdata account** — register at https://urs.earthdata.nasa.gov, then create `~/.netrc` (`chmod 600`):
   `machine urs.earthdata.nasa.gov login <user> password <password>`
2. **Setup** — `uv venv .venv --python 3.11 && uv pip install --python .venv/bin/python -r requirements.txt`
3. **Plan** — `.venv/bin/python 01_submit.py` (dry run, no credits used).
4. **Submit** — `.venv/bin/python 01_submit.py --submit`. Free tier: 8,000 credits/month.
5. **Download** — `.venv/bin/python 02_download.py` (clips each pair to the AOI, then deletes the zip; re-runnable).
6. **Locate** — `.venv/bin/python 04_locate_event.py --looks 5x1` (coherence loss across the event).
7. **MintPy** — install once: `tools/micromamba create -p tools/mintpy-env -c conda-forge python=3.11 mintpy`
   (micromamba binary from github.com/mamba-org/micromamba-releases), then
   `mkdir -p mintpy_5x1 && cd mintpy_5x1 && ../tools/mintpy-env/bin/smallbaselineApp.py ../samsen_5x1.cfg`.
   Pre-event only (`mintpy.network.endDate = 20250923`).
8. **Export** — `.venv/bin/python 03_export.py mintpy_5x1 data/samsen-insar-5x1.json` (3,900 pixels nearest the event; OSM context).
9. **Web bundle** — `.venv/bin/python 05_web_bundle.py` → `public/data/samsen-real.json` (1.9 MB) and `coherence-loss.png`.

Disk: keep ≥ 15 GB free. Products are clipped to the AOI right after download.
