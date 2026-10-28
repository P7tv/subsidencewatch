"""Shared settings for the Samsen real-data pipeline."""

# Descending track 62 burst covering Samsen / Vajira Hospital. Found with asf_search; it has a
# Sentinel-1C acquisition at 2025-09-23T23:08Z (06:08 Bangkok time, shortly before the collapse).
BURST_ID = "062_132018_IW2"
POLARIZATION = "VV"

# A few post-event acquisitions are included only to locate the sinkhole from coherence loss.
# The app's detector never uses observations on or after the event date.
START = "2024-01-01"
END = "2025-10-12"
EVENT_DATE = "2025-09-24"

# Event location from 04_locate_event.py (5x1 coherence loss); same as src/event.js.
EVENT_LAT, EVENT_LON = 13.78074, 100.50994

# Vajira Hospital is not tagged as a hospital in OSM here, so context uses this fallback: the OSM
# "วชิรพยาบาล" MRT Purple Line station (node 13971907534) on Samsen Road, with an approximate radius.
FALLBACK_HOSPITALS = [("วชิรพยาบาล (โดยประมาณ)", 13.77964, 100.50895, 200)]

# Analysis area, WGS84 (west, south, east, north). About 4 x 4 km around the event.
AOI = (100.488, 13.760, 100.524, 13.796)

# Small-baseline network: connect each acquisition to its next N acquisitions.
NEIGHBOURS = 3
# 10x2 (~40 m) is the robust primary set; 5x1 (~20 m) resolves a ~30 m sinkhole but is noisier.
# Each single-burst pair costs 1 HyP3 credit at any looks.
LOOKS = ["10x2", "5x1"]
PROJECT = "samsen-062"


def project_name(looks):
    return f"{PROJECT}-{looks}"
