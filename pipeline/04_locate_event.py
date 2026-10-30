"""Locate the sinkhole from coherence loss in pairs that span the event.

Compares mean coherence of the last pre-event pairs with pairs whose reference is before and secondary
after the event. A collapsed road surface decorrelates, so the largest drop marks the collapse.

.venv/bin/python 04_locate_event.py [--looks 5x1]
"""

import argparse
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Transformer

import config

DATA = Path(__file__).parent / "data"
EVENT = config.EVENT_DATE.replace("-", "")


def pairs(looks):
    for d in sorted((DATA / looks).glob("S1_*")):
        ref, sec = d.name.split("_")[3:5]
        yield ref, sec, next(d.glob("*_corr.tif"))


def mean_corr(files):
    stack = []
    for f in files:
        with rasterio.open(f) as r:
            stack.append(r.read(1))
            transform, crs = r.transform, r.crs
    return np.nanmean(np.where(np.array(stack) == 0, np.nan, stack), axis=0), transform, crs


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--looks", default="5x1", choices=config.LOOKS)
    parser.add_argument("--top", type=int, default=5)
    args = parser.parse_args()

    all_pairs = list(pairs(args.looks))
    before = [f for ref, sec, f in all_pairs if sec < EVENT][-9:]
    spanning = [f for ref, sec, f in all_pairs if ref < EVENT <= sec]
    if not before or not spanning:
        raise SystemExit(f"need pre-event and event-spanning pairs; have {len(before)} and {len(spanning)}")
    pre, transform, crs = mean_corr(before)
    post, _, _ = mean_corr(spanning)
    drop = pre - post
    print(f"{len(before)} pre-event pairs, {len(spanning)} event-spanning pairs; median drop {np.nanmedian(drop):.3f}")

    to_wgs = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
    order = np.argsort(np.nan_to_num(drop, nan=-1).ravel())[::-1][: args.top]
    for rank, idx in enumerate(order, 1):
        row, col = np.unravel_index(idx, drop.shape)
        lon, lat = to_wgs.transform(*rasterio.transform.xy(transform, row, col))
        print(f"{rank}. lat {lat:.5f} lon {lon:.5f}  coherence {pre[row, col]:.2f} -> {post[row, col]:.2f}")


if __name__ == "__main__":
    main()
