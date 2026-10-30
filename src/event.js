// Samsen Road sinkhole in front of Vajira Hospital / Samsen police station, morning of 24 Sep 2025.
// Location: largest Sentinel-1 coherence loss (20 m pixels) across the event within 300 m of the
// Vajira MRT station; see pipeline/04_locate_event.py. Reverse-geocodes to Soi Lang Samsen police station.
export const samsenEvent = {
  date: "2025-09-24",
  lat: 13.78074,
  lon: 100.50994,
  label: "หลุมยุบถนนสามเสน",
  locationNote: "ตำแหน่งจาก coherence ที่หายไป (Sentinel-1, ±20 ม.)",
};
// Known excavation sites for the "priority" level (proposal 4.2: within 100 m of active digging).
// Only the Vajira (PP19) station box is listed: OSM node 13971907534. Tunnel alignment and progress
// would come from MRTA and are not available here.
export const excavationSites = [{ name: "สถานีวชิรพยาบาล (PP19)", lat: 13.77964, lon: 100.50895 }];
