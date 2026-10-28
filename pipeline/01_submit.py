"""Plan the burst InSAR network and (optionally) submit it to ASF HyP3.

Dry run (no account needed):  .venv/bin/python 01_submit.py
Submit (needs ~/.netrc with an Earthdata login):  .venv/bin/python 01_submit.py --submit
"""

import argparse
import sys

import asf_search as asf
import hyp3_sdk

import config


def acquisitions():
    results = asf.search(
        dataset=asf.DATASET.SLC_BURST,
        fullBurstID=config.BURST_ID,
        polarization=config.POLARIZATION,
        start=config.START,
        end=config.END,
    )
    scenes = sorted({p.properties["sceneName"]: p.properties["startTime"] for p in results}.items(), key=lambda s: s[1])
    return [name for name, _ in scenes], [time for _, time in scenes]


def network(scenes):
    return [(scenes[i], scenes[j]) for i in range(len(scenes)) for j in range(i + 1, min(i + 1 + config.NEIGHBOURS, len(scenes)))]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--submit", action="store_true", help="submit jobs to HyP3 (uses Earthdata credits)")
    args = parser.parse_args()

    scenes, times = acquisitions()
    pairs = network(scenes)
    print(f"{len(scenes)} acquisitions {times[0][:10]} .. {times[-1][:10]}, {len(pairs)} pairs per looks {config.LOOKS}")
    pre_event = [t for t in times if t[:10] < config.EVENT_DATE]
    print(f"last pre-event acquisition: {pre_event[-1]}")
    if not args.submit:
        print("dry run: nothing submitted. Re-run with --submit after setting up ~/.netrc.")
        return

    hyp3 = hyp3_sdk.HyP3()
    names = [config.project_name(looks) for looks in config.LOOKS]
    for name in names:
        if len(hyp3.find_jobs(name=name)):
            sys.exit(f"jobs named {name!r} already exist; not submitting duplicates.")
    print(f"credits available: {hyp3.check_credits()}")
    for looks, name in zip(config.LOOKS, names):
        jobs = [hyp3_sdk.HyP3.prepare_insar_isce_burst_job(ref, sec, name=name, looks=looks) for ref, sec in pairs]
        batch = hyp3.submit_prepared_jobs(jobs)
        print(f"submitted {len(batch)} jobs as {name!r}")
    print(f"credits remaining: {hyp3.check_credits()}")


if __name__ == "__main__":
    main()
