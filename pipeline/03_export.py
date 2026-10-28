"""Export a MintPy time series to SubsidenceWatch's import JSON.

.venv/bin/python 03_export.py mintpy_10x2 ../public/samsen-insar-10x2.json

- LOS: MintPy is positive toward the satellite, so metres * 1000 already matches the app's
  "negative = away" convention.
- Per-acquisition coherence for date d is the mean coherence of pairs whose later date is d
  (the first date uses its outgoing pairs), so it never depends on later acquisitions.
- Context comes from OpenStreetMap (cached in data/osm.json): hospital grounds, major roads, buildings.
"""

import argparse
import json
import time
from pathlib import Path

import h5py
import numpy as np
import requests
from pyproj import Transformer
from shapely import STRtree, points
from shapely.geometry import LineString, MultiPoint, Point, Polygon

import config

DATA = Path(__file__).parent / "data"
ROAD_TYPES = "trunk|primary|secondary|tertiary"


def iso(d):
    d = d.decode() if isinstance(d, bytes) else d
    return f"{d[:4]}-{d[4:6]}-{d[6:8]}"


def load(mintpy_dir):
    ts_file = next(p for p in ("timeseries_demErr.h5", "timeseries.h5") if (mintpy_dir / p).exists())
    with h5py.File(mintpy_dir / ts_file) as f:
        ts, dates, attrs = f["timeseries"][:], [iso(d) for d in f["date"][:]], dict(f.attrs)
    with h5py.File(mintpy_dir / "temporalCoherence.h5") as f:
        tcoh = f["temporalCoherence"][:]
    with h5py.File(mintpy_dir / "inputs" / "ifgramStack.h5") as f:
        keep = f["dropIfgram"][:]
        pair_dates = [(iso(a), iso(b)) for a, b in f["date"][:][keep]]
        coherence = f["coherence"][:][keep]
    return ts_file, ts, dates, attrs, tcoh, pair_dates, coherence


def per_date_coherence(dates, pair_dates, coherence):
    out = np.zeros((len(dates),) + coherence.shape[1:], dtype=np.float32)
    for i, d in enumerate(dates):
        idx = [k for k, (a, b) in enumerate(pair_dates) if b == d] or [k for k, (a, b) in enumerate(pair_dates) if a == d]
        out[i] = np.nanmean(coherence[idx], axis=0)
    return out


def osm_features():
    cache = DATA / "osm.json"
    if not cache.exists():
        w, s, e, n = config.AOI
        query = f"""[out:json][timeout:90];(
          nwr["amenity"="hospital"]({s},{w},{n},{e});
          nwr["healthcare"="hospital"]({s},{w},{n},{e});
          way["highway"~"^({ROAD_TYPES})$"]({s},{w},{n},{e});
          way["building"]({s},{w},{n},{e}););out geom;"""
        for attempt in range(6):
            r = requests.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": query},
                headers={"User-Agent": "SubsidenceWatch-pipeline/0.1 (research prototype)"},
                timeout=120,
            )
            if r.status_code not in (429, 502, 503, 504):
                break
            time.sleep(10 * 2**attempt)
        r.raise_for_status()
        cache.write_text(r.text)
    return json.loads(cache.read_text())["elements"]


def context_lookup(lonlat, to_utm):
    hospitals, roads, buildings = [], [], []
    for el in osm_features():
        tags = el.get("tags", {})
        if "hospital" in (tags.get("amenity"), tags.get("healthcare")):
            name = tags.get("name:th") or tags.get("name") or "โรงพยาบาล"
            if el["type"] == "node":
                hospitals.append((Point(to_utm.transform(el["lon"], el["lat"])).buffer(60), name))
            else:
                # Relations: hull of member outlines is close enough for a hospital campus.
                parts = el.get("members", [el]) if el["type"] == "relation" else [el]
                coords = [to_utm.transform(p["lon"], p["lat"]) for m in parts for p in m.get("geometry", [])]
                if len(coords) >= 3:
                    hospitals.append((MultiPoint(coords).convex_hull, name))
            continue
        coords = [to_utm.transform(p["lon"], p["lat"]) for p in el.get("geometry", [])]
        if len(coords) < 2:
            continue
        elif "highway" in tags:
            roads.append((LineString(coords), tags.get("name:th") or tags.get("name") or "ถนนสายหลัก"))
        elif "building" in tags and len(coords) >= 4:
            buildings.append((Polygon(coords), "อาคาร"))
    for name, lat, lon, radius in config.FALLBACK_HOSPITALS:
        hospitals.append((Point(to_utm.transform(lon, lat)).buffer(radius), name))
    pts = points([to_utm.transform(lon, lat) for lon, lat in lonlat])
    result = [("other", "จุดวัด InSAR")] * len(pts)

    def apply(features, kind, distance):
        if not features:
            return
        tree = STRtree([g for g, _ in features])
        for i, j in zip(*tree.query(pts, predicate="dwithin", distance=distance)):
            if result[i][0] == "other":
                result[i] = (kind, features[j][1])

    apply(hospitals, "hospital", 20)
    apply(roads, "road", 20)
    apply(buildings, "building", 0)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mintpy_dir", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--min-tcoh", type=float, default=0.7)
    parser.add_argument("--max-points", type=int, default=3900)  # app limit: 250,000 observations
    args = parser.parse_args()

    ts_file, ts, dates, attrs, tcoh, pair_dates, coherence = load(args.mintpy_dir)
    cohs = per_date_coherence(dates, pair_dates, coherence)
    rows, cols = np.nonzero((tcoh >= args.min_tcoh) & np.all(np.isfinite(ts), axis=0))
    epsg = int(attrs.get("EPSG") or 32647)
    to_wgs = Transformer.from_crs(epsg, 4326, always_xy=True)
    to_utm = Transformer.from_crs(4326, epsg, always_xy=True)
    x0, y0, dx, dy = (float(attrs[k]) for k in ("X_FIRST", "Y_FIRST", "X_STEP", "Y_STEP"))
    # Nearly every urban pixel passes, so keep the ones closest to the event rather than an arbitrary subset.
    ex, ey = to_utm.transform(config.EVENT_LON, config.EVENT_LAT)
    distance = np.hypot(x0 + (cols + 0.5) * dx - ex, y0 + (rows + 0.5) * dy - ey)
    nearest = np.argsort(distance)[: args.max_points]
    rows, cols = rows[nearest], cols[nearest]
    lonlat = [to_wgs.transform(x0 + (c + 0.5) * dx, y0 + (r + 0.5) * dy) for r, c in zip(rows, cols)]
    contexts = context_lookup(lonlat, to_utm)

    pts = []
    for (r, c), (lon, lat), (context, label) in zip(zip(rows, cols), lonlat, contexts):
        pts.append({
            "id": f"R{r:03d}C{c:03d}",
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "label": label,
            "context": context,
            "observations": [
                {"date": d, "los_mm": round(float(ts[i, r, c]) * 1000, 2), "coherence": round(float(cohs[i, r, c]), 3)}
                for i, d in enumerate(dates)
            ],
        })

    # MintPy stores the reference of a UTM-geocoded stack in map coordinates despite the REF_LAT/LON names.
    ref_lon, ref_lat = to_wgs.transform(float(attrs["REF_LON"]), float(attrs["REF_LAT"]))
    ref = f"{ref_lat:.5f}, {ref_lon:.5f}"
    dataset = {
        "schemaVersion": 1,
        "source": {
            "name": f"Sentinel-1 burst {config.BURST_ID} · HyP3 ISCE2 + MintPy ({args.mintpy_dir.name})",
            "kind": "insar",
            "reference": (
                f"Descending track 62, LOS, {abs(dx):.0f} m pixels. Reference pixel {ref}, reference date {iso(attrs.get('REF_DATE', dates[0].replace('-', '')))}. "
                f"{ts_file}; no tropospheric correction; temporal coherence >= {args.min_tcoh}. "
                f"Acquisitions {dates[0]} to {dates[-1]} (UTC dates; pre-event only)."
            ),
            "losConvention": "negative_away",
        },
        "points": pts,
    }
    args.output.write_text(json.dumps(dataset, ensure_ascii=False, separators=(",", ":")))
    counts = {k: sum(p["context"] == k for p in pts) for k in ("hospital", "road", "building", "other")}
    print(f"{len(pts)} points x {len(dates)} dates -> {args.output} ({args.output.stat().st_size / 1e6:.1f} MB) {counts}")


if __name__ == "__main__":
    main()
