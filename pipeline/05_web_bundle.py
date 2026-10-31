"""Bundle the real data for the web app: a compact time series file and the coherence-loss overlay.

.venv/bin/python 05_web_bundle.py [--looks 5x1]

Inputs:  data/samsen-insar-<looks>.json (from 03_export.py) and data/<looks>/ (from 02_download.py)
Outputs: ../public/data/samsen-real.json   compact: LOS in 0.1 mm and coherence in 0.01 integers
         ../public/data/coherence-loss.png  pre-event minus event-spanning coherence, WGS84 grid
"""

import argparse
import importlib.util
import json
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.warp import Resampling, calculate_default_transform, reproject

import config

HERE = Path(__file__).parent
OUT = HERE.parent / "public" / "data"
DROP_FLOOR = 0.18  # ~top 1-2% of drops; weaker ones are drawn transparent


def locate_module():
    spec = importlib.util.spec_from_file_location("locate", HERE / "04_locate_event.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def compact(dataset):
    dates = [o["date"] for o in dataset["points"][0]["observations"]]
    points = []
    for p in dataset["points"]:
        assert [o["date"] for o in p["observations"]] == dates, f"irregular dates for {p['id']}"
        points.append([
            p["id"], p["lat"], p["lon"], p["label"], p["context"],
            [round(o["los_mm"] * 10) for o in p["observations"]],
            [round(o["coherence"] * 100) for o in p["observations"]],
        ])
    return {"format": "subsidencewatch-compact-1", "source": dataset["source"], "dates": dates, "points": points}


def overlay(looks):
    locate = locate_module()
    pairs = list(locate.pairs(looks))
    before = [f for ref, sec, f in pairs if sec < locate.EVENT][-9:]
    spanning = [f for ref, sec, f in pairs if ref < locate.EVENT <= sec]
    pre, transform, crs = locate.mean_corr(before)
    post, _, _ = locate.mean_corr(spanning)
    drop = np.nan_to_num(pre - post, nan=0).astype("float32")

    height, width = drop.shape
    bounds = rasterio.transform.array_bounds(height, width, transform)
    dst_transform, dst_w, dst_h = calculate_default_transform(crs, "EPSG:4326", width, height, *bounds)
    wgs = np.zeros((dst_h, dst_w), dtype="float32")
    reproject(drop, wgs, src_transform=transform, src_crs=crs, dst_transform=dst_transform,
              dst_crs="EPSG:4326", resampling=Resampling.nearest)

    # Transparent below the floor, then orange -> deep red with rising opacity.
    t = np.clip((wgs - DROP_FLOOR) / 0.2, 0, 1)
    rgba = np.zeros((dst_h, dst_w, 4), dtype="uint8")
    rgba[..., 0] = 230 - 40 * t
    rgba[..., 1] = 140 - 120 * t
    rgba[..., 2] = 60 - 30 * t
    rgba[..., 3] = np.where(wgs > DROP_FLOOR, 60 + 195 * t, 0)
    Image.fromarray(rgba, "RGBA").save(OUT / "coherence-loss.png", optimize=True)

    west, north = dst_transform.c, dst_transform.f
    east, south = west + dst_transform.a * dst_w, north + dst_transform.e * dst_h
    return {
        "url": "data/coherence-loss.png",
        "bounds": [[south, west], [north, east]],
        "description": f"Mean coherence of the last {len(before)} pre-event pairs minus {len(spanning)} pairs spanning "
                       f"{config.EVENT_DATE}; Sentinel-1 {config.BURST_ID}, {looks}.",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--looks", default="5x1", choices=config.LOOKS)
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    dataset = json.loads((config.DATA / f"samsen-insar-{args.looks}.json").read_text())
    bundle = compact(dataset)
    bundle["overlay"] = overlay(args.looks)
    path = OUT / config.BUNDLE
    path.write_text(json.dumps(bundle, ensure_ascii=False, separators=(",", ":")))
    print(f"{len(bundle['points'])} points x {len(bundle['dates'])} dates -> {path} ({path.stat().st_size / 1e6:.1f} MB)")
    print(f"overlay -> {OUT / 'coherence-loss.png'} bounds {bundle['overlay']['bounds']}")


if __name__ == "__main__":
    main()
