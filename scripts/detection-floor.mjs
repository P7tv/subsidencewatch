// Detection floor on the real Sentinel-1 noise: inject an extra subsidence ramp (away from the satellite)
// into control points, starting `onset` days before the cutoff, and count how often the calibrated
// CUSUM alarm fires.  npm run floor [-- --cutoff 2025-09-17]
import { readFileSync } from "node:fs";
import { analyzePoint, controlThreshold, distanceMeters } from "../src/analysis.js";
import { expandCompact } from "../src/io.js";
import { samsenEvent as event } from "../src/event.js";

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const cutoff = arg("--cutoff", "2025-09-17");
const { dataset } = expandCompact(JSON.parse(readFileSync(new URL("../public/data/samsen-real.json", import.meta.url))));
const DAY = 86400000;

// The alarm level is calibrated once on the untouched data, as in the app.
const base = dataset.points.map((p) => analyzePoint(p, cutoff));
const threshold = controlThreshold(base, event);
const control = dataset.points
  .filter((p, i) => base[i].status !== "insufficient" && distanceMeters(p, event) > 400)
  .filter((_, i) => i % 4 === 0); // every 4th control point keeps the run quick
const falseAlarm = control.filter((p) => analyzePoint(p, cutoff, { sensitivity: threshold }).status === "anomaly").length / control.length;

console.log(`cutoff ${cutoff} · threshold ${threshold.toFixed(1)} · ${control.length} control points · false alarms ${(100 * falseAlarm).toFixed(1)}%`);
console.log("extra LOS rate (mm/yr) | detected, onset 60 / 120 / 240 days before cutoff");
for (const rate of [5, 10, 20, 40, 80, 160]) {
  const cells = [60, 120, 240].map((onset) => {
    const start = Date.parse(cutoff) - onset * DAY;
    const hits = control.filter((p) => {
      const observations = p.observations.map((o) => {
        const t = (Date.parse(o.date) - start) / DAY / 365.25;
        return t > 0 ? { ...o, los_mm: o.los_mm - rate * t } : o;
      });
      return analyzePoint({ ...p, observations }, cutoff, { sensitivity: threshold }).status === "anomaly";
    }).length;
    return `${((100 * hits) / control.length).toFixed(0).padStart(3)}%`;
  });
  console.log(`${String(rate).padStart(22)} | ${cells.join("   ")}`);
}
