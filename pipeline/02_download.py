"""Download finished HyP3 products and keep only the AOI, deleting each zip right after clipping.

Status only:   .venv/bin/python 02_download.py --status
Download all:  .venv/bin/python 02_download.py            (re-run safely; finished pairs are skipped)
One set only:  .venv/bin/python 02_download.py --looks 10x2
"""

import argparse
import collections
import math
import shutil
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import hyp3_sdk
import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject, transform_bounds

import config

DATA = Path(__file__).parent / "data"
# Files MintPy's prep_hyp3 reads for a HyP3 ISCE burst product.
LAYERS = ["unw_phase", "corr", "conncomp", "dem", "lv_theta", "lv_phi"]


def target_grid(crs, res):
    """Fixed AOI grid snapped to the product pixel size, so every pair lines up exactly."""
    w, s, e, n = transform_bounds("EPSG:4326", crs, *config.AOI)
    w, s = math.floor(w / res) * res, math.floor(s / res) * res
    e, n = math.ceil(e / res) * res, math.ceil(n / res) * res
    return from_origin(w, n, res, res), (round((n - s) / res), round((e - w) / res))


def clip(zip_path, out_dir):
    stem = zip_path.stem
    tmp = out_dir.with_suffix(".partial")
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    with zipfile.ZipFile(zip_path) as z:
        (tmp / f"{stem}.txt").write_bytes(z.read(f"{stem}/{stem}.txt"))
    for layer in LAYERS:
        with rasterio.open(f"zip://{zip_path}!{stem}/{stem}_{layer}.tif") as src:
            transform, shape = target_grid(src.crs, src.res[0])
            data = np.zeros(shape, dtype=src.dtypes[0])
            reproject(
                rasterio.band(src, 1),
                data,
                src_transform=src.transform,
                src_crs=src.crs,
                dst_transform=transform,
                dst_crs=src.crs,
                dst_nodata=src.nodata,
                resampling=Resampling.nearest,
            )
            profile = {**src.profile, "driver": "GTiff", "height": shape[0], "width": shape[1], "transform": transform}
            profile.pop("blockxsize", None), profile.pop("blockysize", None), profile.update(tiled=False, compress="deflate")
            with rasterio.open(tmp / f"{stem}_{layer}.tif", "w", **profile) as dst:
                dst.write(data, 1)
    tmp.rename(out_dir)


def fetch(job, looks):
    product = job.files[0]["filename"]
    out_dir = DATA / looks / Path(product).stem
    if out_dir.exists():
        return "skipped"
    zip_dir = DATA / "tmp" / looks
    zip_dir.mkdir(parents=True, exist_ok=True)
    zip_path = hyp3_sdk.util.download_file(job.files[0]["url"], zip_dir / product)
    try:
        clip(Path(zip_path), out_dir)
    finally:
        Path(zip_path).unlink(missing_ok=True)
    return "downloaded"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--looks", choices=config.LOOKS)
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()

    hyp3 = hyp3_sdk.HyP3()
    for looks in [args.looks] if args.looks else config.LOOKS:
        jobs = hyp3.find_jobs(name=config.project_name(looks))
        counts = collections.Counter(j.status_code for j in jobs)
        local = len(list((DATA / looks).glob("S1_*"))) if (DATA / looks).exists() else 0
        print(f"{looks}: {dict(counts)}, {local} clipped locally")
        if args.status:
            continue
        done = [j for j in jobs if j.succeeded()]
        with ThreadPoolExecutor(args.workers) as pool:
            results = collections.Counter(pool.map(lambda j: fetch(j, looks), done))
        print(f"{looks}: {dict(results)}")
        for job in jobs:
            if job.failed():
                print(f"  FAILED {job.job_id} {job.job_parameters['granules']}")


if __name__ == "__main__":
    main()
