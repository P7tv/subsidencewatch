import { samsenEvent } from "./event.js";

export const dates = Array.from({ length: 44 }, (_, i) =>
  new Date(Date.UTC(2024, 2, 27 + i * 12) + (i >= 40 ? 22 * 86400000 : 0)).toISOString().slice(0, 10),
);
// Synthetic schedule: these dates and all measurements are illustrative, not the archived 44-scene inventory.
export function createDemo() {
  const points = [];
  for (let i = 0; i < 126; i++) {
    const row = Math.floor(i / 14),
      col = i % 14;
    let lat = 13.765 + row * 0.0031 + Math.sin(i * 13) * 0.00055,
      lon = 100.49 + col * 0.00255 + Math.cos(i * 7) * 0.00065;
    const near = Math.hypot((lat - samsenEvent.lat) * 111000, (lon - samsenEvent.lon) * 108000);
    const hotspot = near < 740 || (i >= 90 && i <= 96);
    if (near < 740) {
      lat = samsenEvent.lat + (lat - samsenEvent.lat) * 0.42;
      lon = samsenEvent.lon + (lon - samsenEvent.lon) * 0.42;
    }
    const weak = i % 11 === 0 || i % 17 === 0;
    const context = near < 850 ? "hospital" : col % 3 === 0 ? "road" : row % 2 === 0 ? "building" : "other";
    const label =
      near < 500
        ? "บริเวณวชิรพยาบาล"
        : context === "road"
          ? "แนวถนนสามเสน"
          : context === "building"
            ? "พื้นที่อาคาร"
            : "จุดติดตามสามเสน";
    const observations = dates.map((date, t) => ({
      date,
      los_mm: Number(
        (
          -t * 0.13 +
          Math.sin(t * 1.7 + i) * 0.7 +
          (hotspot && t > 26 ? -((t - 26) ** 1.25) * 0.66 : 0)
        ).toFixed(2),
      ),
      coherence: Number(
        (weak ? 0.29 + 0.16 * (1 + Math.sin(i + t)) : 0.76 + 0.1 * Math.sin(t * 0.8 + i)).toFixed(2),
      ),
    }));
    points.push({ id: `SAM-${String(i + 1).padStart(3, "0")}`, lat, lon, label, context, observations });
  }
  return {
    schemaVersion: 1,
    source: {
      name: "Samsen demonstration · 126 synthetic points",
      kind: "synthetic",
      reference: "Synthetic relative LOS; illustrative descending geometry. Not measured Sentinel-1 data.",
      losConvention: "negative_away",
    },
    points,
  };
}
