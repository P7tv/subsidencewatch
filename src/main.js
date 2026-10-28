import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  createIcons,
  ScanLine,
  LayoutDashboard,
  ListChecks,
  Workflow,
  FlaskConical,
  Database,
  Upload,
  Download,
  MapPinned,
  Info,
  ArrowUpRight,
  Layers,
  Maximize,
  History,
  Play,
  Crosshair,
  ArrowRight,
  Search,
  FileJson,
  RotateCcw,
  X,
  FileUp,
  MapPin,
  ShieldCheck,
  ScanEye,
  Network,
  CircleHelp,
  Activity,
  Landmark,
  SlidersHorizontal,
  ChevronDown,
  Pause,
  TriangleAlert,
  Satellite,
  QrCode,
} from "lucide";
import Papa from "papaparse";
import QRCode from "qrcode";
import { analyzePoint, clusterPoints, firstAlert, controlThreshold, eventContrast } from "./analysis.js";
import { createDemo } from "./data.js";
import { samsenEvent as event } from "./event.js";
import { validateDataset, exportCsv, csvRowsToDataset, expandCompact } from "./io.js";
import "./style.css";
const icons = {
  ScanLine,
  LayoutDashboard,
  ListChecks,
  Workflow,
  FlaskConical,
  Database,
  Upload,
  Download,
  MapPinned,
  Info,
  ArrowUpRight,
  Layers,
  Maximize,
  History,
  Play,
  Crosshair,
  ArrowRight,
  Search,
  FileJson,
  RotateCcw,
  X,
  FileUp,
  MapPin,
  ShieldCheck,
  ScanEye,
  Network,
  CircleHelp,
  Activity,
  Landmark,
  SlidersHorizontal,
  ChevronDown,
  Pause,
  TriangleAlert,
  Satellite,
  QrCode,
};

const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
const icon = (name) => `<i data-lucide="${name}"></i>`;
const fmtDate = (d) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(d));
const shortDate = (d) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(d));
const state = {
  dataset: createDemo(),
  dateIndex: 43,
  minCoherence: 0.65,
  sensitivity: 4,
  filter: "all",
  search: "",
  selected: "SAM-063",
  view: "overview",
  clusters: true,
  points: true,
  source: "demo", // "real" | "demo" | "import"
  calibrate: false, // real data: alarm level from control area instead of the fixed CUSUM threshold
  threshold: 4,
  contrast: null,
  overlay: null,
  showOverlay: false,
};
const colors = { anomaly: "#d57943", watch: "#448b80", insufficient: "#8e9a9c" };
const names = { anomaly: "ควรตรวจเพิ่มเติม", watch: "ติดตามแนวโน้ม", insufficient: "ข้อมูลไม่พอ" };
const PLAY_MS = 450; // ~25 s through the 57 playable real acquisitions
let allDates = [],
  results = [],
  markerMap = new Map(),
  markersFor = null,
  overlayLayer = null,
  realBundle = null,
  playTimer = null;
document.querySelector("#app").innerHTML = `
<aside class="sidebar"><a class="brand" href="#overview" aria-label="SubsidenceWatch overview"><span class="brand-mark">${icon("scan-line")}</span><span>Subsidence<span class="brand-watch">Watch</span><small>GROUND MOTION LAB</small></span></a>
 <div class="workspace-label">WORKSPACE</div><nav aria-label="เมนูหลัก"><button class="nav active" data-view="overview">${icon("layout-dashboard")} ภาพรวมพื้นที่ <span>01</span></button><button class="nav" data-view="queue">${icon("list-checks")} รายการจุดตรวจ <span id="nav-count"></span></button><button class="nav" data-view="method">${icon("workflow")} วิธีวิเคราะห์</button></nav>
 <div class="sidebar-project"><span class="eyebrow">PILOT AREA</span><h3>สามเสน – วชิรพยาบาล</h3><p>Bangkok, Thailand</p><div class="mini-grid"><span>พื้นที่ศึกษา<strong>5 × 5 km</strong></span><span>จุดเกิดเหตุ<strong>13.781, 100.510</strong></span></div><div class="project-line"><span></span> Retrospective study</div></div>
 <div class="sidebar-bottom"><span class="lab-icon">${icon("flask-conical")}</span><div>Research prototype<small>GeoHackathon · 2026</small></div><span class="version">v0.1</span></div></aside>
<main><header class="topbar"><div class="breadcrumb">Workspace <span>/</span> <strong id="breadcrumb-title">ภาพรวมพื้นที่</strong></div><div class="top-actions"><div class="source-switch" role="group" aria-label="ชุดข้อมูล"><button data-source="real">${icon("satellite")} ข้อมูลจริง</button><button data-source="demo">${icon("flask-conical")} ข้อมูลจำลอง</button></div><button class="button secondary" id="qr-btn" hidden>${icon("qr-code")} QR มือถือ</button><button class="button secondary" id="import-btn">${icon("upload")} นำเข้าข้อมูล</button><button class="button primary" id="export-btn">${icon("download")} ส่งออกรายงาน</button></div></header>
<div class="page"><div class="page-heading"><div><div class="eyebrow">SAMSEN MONITORING WORKSPACE</div><h1 id="page-title">มองเห็นการเปลี่ยนแปลง<span class="title-dot">.</span></h1><p id="page-subtitle">สำรวจการเคลื่อนตัวของพื้นดิน เพื่อจัดลำดับพื้นที่ที่ควรลงตรวจ</p></div><div class="study-badge">${icon("map-pinned")} <div>สามเสน–วชิรพยาบาล<small>AOI · 5 × 5 km</small></div></div></div>
<div class="notice" id="data-notice">${icon("info")} <span></span><button id="method-link">อ่านข้อจำกัด ${icon("arrow-up-right")}</button></div>
<section class="event-banner" id="event-banner" hidden></section>
<section id="overview-view"><div class="stats" id="stats"></div><div class="workspace-grid"><section class="panel map-panel"><div class="panel-head"><div><h2>หลักฐานการเคลื่อนตัว</h2><p>LOS displacement · เลือกจุดเพื่อดูอนุกรมเวลา</p></div><div class="map-toolbar"><button class="icon-button" id="layers-btn" aria-label="ตั้งค่าชั้นข้อมูล" title="ชั้นข้อมูล">${icon("layers")}</button><button class="icon-button" id="fit-btn" aria-label="แสดงจุดทั้งหมด" title="แสดงจุดทั้งหมด">${icon("maximize")}</button></div></div><div class="map-wrap"><div id="map" aria-label="แผนที่จุดตรวจสามเสน"></div><div class="map-top-label"><span class="status-dot"></span><span id="map-label">SYNTHETIC DATA</span><span class="map-count" id="map-count"></span></div><div id="layer-controls" class="layer-controls" hidden><strong>ชั้นข้อมูล</strong><label><input type="checkbox" id="point-layer" checked> จุดวัด</label><label><input type="checkbox" id="cluster-layer" checked> กลุ่มจุดผิดปกติ</label><label><input type="checkbox" id="overlay-layer"> ดาวเทียมเห็นหลุม</label></div><div class="map-legend"><span><b style="--dot:#d57943"></b>ควรตรวจ</span><span><b style="--dot:#448b80"></b>ติดตาม</span><span><b style="--dot:#8e9a9c"></b>ข้อมูลไม่พอ</span><span id="overlay-legend" hidden><b style="--dot:#c0301f;border-radius:2px"></b>coherence หายไปหลังเหตุ</span></div><div class="tile-message" id="tile-message" hidden>แผนที่ฐานโหลดไม่ได้ · จุดวัดและพิกัดยังใช้งานได้</div></div>
<div class="timeline"><div class="timeline-top"><div>${icon("history")} <strong>สำรวจย้อนหลัง</strong><span>ใช้ข้อมูลถึงวันที่เลือก</span></div><strong id="cutoff-label"></strong></div><div class="timeline-controls"><button class="play-button" id="play-btn" aria-label="เล่นลำดับเวลา">${icon("play")}</button><div class="slider-wrap"><input id="timeline" type="range" min="0" max="43" value="43" aria-label="วันที่ตัดข้อมูล"><div class="range-dates"><span id="first-date"></span><span id="middle-date"></span><span id="last-date"></span></div></div></div></div></section>
<aside class="panel detail-panel"><div class="panel-head"><div><span class="eyebrow">POINT INSIGHT</span><h2>รายละเอียดจุดวัด</h2></div>${icon("crosshair")}</div><div id="point-detail"></div></aside></div>
<section class="panel queue-panel"><div class="panel-head"><div><h2>จุดที่ควรตรวจเพิ่มเติม <span class="count-pill" id="queue-count"></span></h2><p>จัดอันดับจากหลักฐานและบริบท · คะแนนนี้ไม่ใช่โอกาสเกิดหลุมยุบ</p></div><button class="text-button" data-view="queue">ดูรายการทั้งหมด ${icon("arrow-right")}</button></div><div id="preview-table"></div></section></section>
<section id="queue-view" hidden><div class="panel"><div class="panel-head"><div><h2>รายการจุดตรวจและจุดติดตาม</h2><p>เลือกแถวเพื่อกลับไปดูหลักฐานบนแผนที่</p></div><button class="button secondary" id="queue-export">${icon("download")} ดาวน์โหลด CSV</button></div><div class="filters"><label class="search-box">${icon("search")}<input id="search" placeholder="ค้นหารหัสจุดหรือบริเวณ" aria-label="ค้นหาจุดวัด"></label><label>สถานะ <select id="queue-filter"><option value="all">ทั้งหมด</option><option value="anomaly">ควรตรวจเพิ่มเติม</option><option value="watch">ติดตามแนวโน้ม</option><option value="insufficient">ข้อมูลไม่พอ</option></select></label></div><div id="full-table"></div></div></section>
<section id="method-view" hidden><div class="method-grid"><article class="panel method-card"><span class="eyebrow">HOW IT WORKS</span><h2>จากข้อมูลสู่จุดที่ควรลงตรวจ</h2><ol><li><strong>รับอนุกรมเวลา LOS</strong><p>นำเข้าผล InSAR ที่ประมวลผลและอ้างอิงแล้ว พร้อม coherence ต่อวันถ่าย ข้อมูลจำลองใช้ทดลองการทำงานของระบบได้ทันที</p></li><li><strong>ตรวจคุณภาพและตัดเวลา</strong><p>ใช้เฉพาะข้อมูลถึงวันที่เลือก ตัดค่าที่ coherence ต่ำกว่าเกณฑ์ และต้องมีอย่างน้อย 8 วันถ่ายที่ผ่านเกณฑ์</p></li><li><strong>ตรวจการเปลี่ยนแนวโน้ม</strong><p>สร้าง linear baseline จากครึ่งแรกของข้อมูลที่ผ่าน QC แล้วใช้ one-sided CUSUM กับ residual ฝั่งลบในครึ่งหลัง มี noise floor 1.5 mm และ allowance 0.5σ เกณฑ์เริ่มต้น 4σ เป็นค่าทดลองที่ยังไม่สอบเทียบ</p></li><li><strong>รวมบริเวณและจัดลำดับ</strong><p>เชื่อมจุด anomaly ที่อยู่ห่างกันไม่เกิน 180 เมตรเป็นกลุ่ม (distance connected components) คะแนนทดลอง 0–100 = 70% ความแรง CUSUM + 30% บริบทที่ผู้ใช้ระบุ: โรงพยาบาล 1, ถนน 0.65, อาคาร 0.4, อื่น ๆ 0.2</p></li></ol></article><div><article class="panel method-card result-card"><span class="eyebrow">REAL-DATA RESULT</span><h2>ผลทดสอบกับ Sentinel-1 จริง</h2><ul><li><strong>ข้อมูล</strong> 64 ภาพ วงโคจรขาลง track 62 ตั้งแต่ 2 ม.ค. 2567 ถึง 23 ก.ย. 2568 23:08 UTC (06:08 น. เช้าวันเกิดเหตุ) ความละเอียด 20 ม. ประมวลผลด้วย ASF HyP3 และ MintPy โดยไม่ใช้ภาพหลังเหตุในการตรวจจับ</li><li><strong>ดาวเทียมเห็นหลุม</strong> coherence ที่หายไประหว่างคู่ภาพคร่อมวันเกิดเหตุสูงสุดในรัศมี 300 ม. ตรงซอยหลัง สน.สามเสน แต่ทั้งพื้นที่ยังมีจุดลักษณะนี้อีกหลายจุด เช่น งานก่อสร้างและผิวน้ำ จึงใช้ยืนยันตำแหน่งได้ แต่ใช้ค้นหาตำแหน่งเองไม่ได้</li><li><strong>ก่อนเกิดเหตุ</strong> บริเวณ 60 ม. รอบหลุมผิดปกติกว่าพื้นที่ควบคุมราว 93–95% ตั้งแต่ ก.ค. 2568 แต่พื้นที่ทั่วไปราว 5–7% ก็ผิดปกติระดับเดียวกัน</li><li><strong>ไม่พบการทรุดตัวเร่งขึ้น</strong>ในสัปดาห์ก่อนเหตุ ภาพ 06:08 น. ขยับพร้อมกันทั้งพื้นที่ ซึ่งน่าจะมาจากชั้นบรรยากาศ</li></ul><p class="result-verdict">ข้อสรุป: InSAR ความละเอียด 20 ม. ยืนยันตำแหน่งหลังเกิดเหตุได้ แต่ยังเตือนล่วงหน้าได้ไม่พอ ต้องเพิ่ม PS-InSAR ระดับอาคาร ข้อมูลหลายวงโคจร และเซนเซอร์งานอุโมงค์</p></article><article class="panel method-card"><span class="eyebrow">INTERPRETATION</span><h2>อ่านผลอย่างไร</h2><p>ค่า LOS ลบคือเคลื่อนออกจากดาวเทียม ไม่เท่ากับการทรุดแนวดิ่งโดยอัตโนมัติ ต้องพิจารณา geometry และข้อมูลภาคพื้น</p><p>“ติดตาม” หมายถึงยังไม่ผ่านเกณฑ์ตรวจการเปลี่ยนแปลง ส่วน “ข้อมูลไม่พอ” ไม่ได้บอกว่าปลอดภัย การวิเคราะห์นี้ตรวจเฉพาะการเปลี่ยน residual ฝั่งลบ จึงไม่ครอบคลุมการเคลื่อนตัวทุกรูปแบบ</p><p>กลุ่มจุดไม่ใช่ HDBSCAN และคะแนนจัดอันดับไม่ใช่ความน่าจะเป็นของหลุมยุบ ระบบไม่ยืนยันสาเหตุจากงานก่อสร้าง และไม่ใช่ระบบเตือนภัยพร้อมใช้งานจริง</p></article><article class="panel method-card source-card"><span class="eyebrow">CURRENT DATASET</span><div id="source-details"></div><button class="button secondary" id="download-sample">${icon("file-json")} ดาวน์โหลด JSON ตัวอย่าง</button><button class="text-button" id="reset-demo">กลับไปใช้ข้อมูลจำลอง ${icon("rotate-ccw")}</button></article></div></div></section>
<footer><span>SubsidenceWatch <b>·</b> Evidence before action.</span><span>LOS ≠ vertical subsidence <b>·</b> Research use only</span></footer></div></main>
<dialog id="import-dialog"><form id="import-form"><div class="dialog-head"><div><span class="eyebrow">BRING YOUR EVIDENCE</span><h2>นำเข้าข้อมูล InSAR</h2></div><button type="button" class="icon-button" id="close-import" aria-label="ปิดหน้าต่าง">${icon("x")}</button></div><p>ข้อมูลจะประมวลผลในเบราว์เซอร์ รองรับ JSON ตาม schema หรือ CSV แบบหนึ่งแถวต่อจุดต่อวัน สูงสุด 20 MB</p><label class="file-input">${icon("file-up")}<span>เลือกไฟล์ .json หรือ .csv</span><input id="data-file" type="file" accept=".json,.csv" required></label><div class="import-fields"><label>ชื่อแหล่งข้อมูล (สำหรับ CSV)<input id="source-name" placeholder="เช่น MintPy descending orbit 62"></label><label>จุดอ้างอิงและ geometry (สำหรับ CSV)<textarea id="source-reference" placeholder="ระบุจุดอ้างอิง วันที่อ้างอิง และวงโคจร"></textarea></label></div><details><summary>รูปแบบข้อมูลที่รองรับ</summary><p>CSV: id, lat, lon, label, context, date, los_mm, coherence<br>context: hospital / road / building / other<br>date: YYYY-MM-DD · coherence: 0–1<br>LOS หน่วย mm ค่าลบ = เคลื่อนออกจากดาวเทียม</p><p>JSON ต้องมี schemaVersion, source และ points ตามไฟล์ตัวอย่าง ชื่อ source.kind = synthetic หรือ insar</p></details><div id="import-error" class="form-error" role="alert"></div><div class="dialog-actions"><button type="button" class="button secondary" id="sample-btn">ดาวน์โหลดตัวอย่าง</button><button type="submit" class="button primary">ตรวจสอบและนำเข้า ${icon("arrow-right")}</button></div></form></dialog><dialog id="qr-dialog" class="qr-dialog"><h2>ลองบนมือถือ</h2><p>สแกนเพื่อเปิดหน้านี้ ต้องอยู่ในเครือข่ายเดียวกัน</p><canvas id="qr-canvas"></canvas><code id="qr-url"></code><button class="button secondary" id="close-qr">ปิด</button></dialog><div id="loading" class="loading-screen" role="status"><span></span>กำลังโหลดข้อมูล Sentinel-1…</div><div id="toast" role="status"></div>`;

const map = L.map("map", { zoomControl: false, preferCanvas: true }).setView([event.lat, event.lon], 15);
L.control.zoom({ position: "bottomright" }).addTo(map);
const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
tiles.on("tileerror", () => ($("#tile-message").hidden = false));
const clusterLayer = L.layerGroup().addTo(map),
  pointLayer = L.layerGroup().addTo(map);
const aoi = L.rectangle(
  [
    [13.7552, 100.4827],
    [13.8008, 100.5293],
  ],
  { color: "#3d716d", weight: 1.2, dashArray: "5 5", fill: false },
).addTo(map);
L.marker([13.77964, 100.50895], {
  interactive: false,
  icon: L.divIcon({
    className: "hospital-label",
    html: "<span>✚</span> วชิรพยาบาล<small>บริเวณโรงพยาบาล · โดยประมาณ</small>",
    iconSize: [160, 42],
    iconAnchor: [-8, 46],
  }),
}).addTo(map);
L.marker([event.lat, event.lon], {
  interactive: false,
  zIndexOffset: 1000,
  icon: L.divIcon({
    className: "event-marker",
    html: `<span class="event-pulse"></span><span class="event-dot"></span><b>${event.label}<small>${fmtDate(event.date)}${event.locationNote ? " · " + event.locationNote : ""}</small></b>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  }),
}).addTo(map);

function refreshDates() {
  allDates = [...new Set(state.dataset.points.flatMap((p) => p.observations.map((o) => o.date)))].sort();
  state.dateIndex = allDates.length - 1;
  $("#timeline").max = allDates.length - 1;
  $("#timeline").value = state.dateIndex;
  $("#first-date").textContent = shortDate(allDates[0]);
  $("#middle-date").textContent = shortDate(allDates[Math.floor(allDates.length / 2)]);
  $("#last-date").textContent = shortDate(allDates.at(-1));
}
function cutoff() {
  return allDates[state.dateIndex];
}
function eventInRange() {
  return allDates[0] < event.date;
}
function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}
function renderEvent() {
  $("#event-banner").hidden = !eventInRange();
  if (!eventInRange()) return;
  const gap = daysBetween(cutoff(), event.date);
  const overlayButton = state.overlay
    ? `<button class="overlay-toggle ${state.showOverlay ? "on" : ""}" id="overlay-btn" aria-pressed="${state.showOverlay}">${icon("satellite")} ${state.showOverlay ? "ซ่อนภาพหลังเหตุ" : "ดาวเทียมเห็นหลุม"}</button>`
    : "";
  const title = `<div class="event-cell event-title"><span class="eyebrow">RETROSPECTIVE TEST</span><strong>${icon("triangle-alert")} ${event.label}</strong><p>${fmtDate(event.date)}${event.locationNote ? " · " + event.locationNote : ""}</p>${overlayButton}${state.showOverlay ? `<p class="overlay-note">สีแดง = พื้นผิวที่เปลี่ยนไปจนดาวเทียมเทียบภาพก่อนกับหลังเหตุไม่ได้ ตรงวงแหวนคือหลุม · สีแดงจุดอื่นคือการเปลี่ยนแปลงอื่น เช่น งานก่อสร้าง ผิวน้ำ</p>` : ""}</div>`;
  const countdown = `<div class="event-cell"><span>ข้อมูลถึงวันที่เลือก</span><strong>${gap > 0 ? `ก่อนเกิดเหตุ ${gap}<small>วัน</small>` : gap === 0 ? "วันเกิดเหตุ" : `หลังเกิดเหตุ ${-gap}<small>วัน</small>`}</strong><p>${fmtDate(cutoff())}${cutoff() === "2025-09-23" ? " · 06:08 น. เวลาไทย" : ""}</p></div>`;
  let evidence, footer;
  if (state.calibrate) {
    const c = state.contrast;
    const pct = (v) => `${Math.round(v * 100)}%`;
    evidence = `<div class="event-cell event-lead ${c && c.asHigh <= 0.1 ? "found" : ""}"><span>บริเวณหลุม 60 ม. เทียบพื้นที่ควบคุม</span>${
      c
        ? `<strong>ผิดปกติกว่า ${pct(c.percentile)}</strong><p>พื้นที่ทั่วไป ${pct(c.asHigh)} ผิดปกติระดับนี้ · ${c.n} จุดวัด</p>`
        : `<strong class="none">ข้อมูลไม่พอ</strong><p>ต้องมีอย่างน้อย 8 วันถ่ายที่ผ่าน QC</p>`
    }</div>`;
    const verdict = !c
      ? ["neutral", "ยังมีข้อมูลไม่พอสำหรับเปรียบเทียบ"]
      : c.asHigh <= 0.01
        ? ["strong", "เด่นชัดกว่าพื้นที่ทั่วไป · ควรส่งทีมลงตรวจ"]
        : c.asHigh <= 0.1
          ? [
              "mixed",
              `ก้ำกึ่ง: บริเวณหลุมผิดปกติกว่าพื้นที่ส่วนใหญ่ แต่ราว 1 ใน ${Math.round(1 / c.asHigh)} ของพื้นที่ทั่วไปก็ผิดปกติระดับนี้ จึงยังใช้เตือนล่วงหน้าไม่ได้`,
            ]
          : ["neutral", "ไม่ต่างจากพื้นที่ทั่วไป · ยังไม่มีสัญญาณเตือน"];
    footer = `<div class="event-verdict ${verdict[0]}">${icon("activity")} ${verdict[1]}</div>`;
  } else {
    const alert = firstAlert(state.dataset.points, event, cutoff(), state);
    evidence = `<div class="event-cell event-lead ${alert ? "found" : ""}"><span>สัญญาณแรกในรัศมี 500 ม.</span>${
      alert
        ? `<strong>ก่อนเกิดเหตุ ${alert.days}<small>วัน</small></strong><p>${fmtDate(alert.date)} · <button class="link-button" data-point="${esc(alert.id)}">${esc(alert.id)}</button></p>`
        : `<strong class="none">ยังไม่พบ</strong><p>ณ ข้อมูลถึงวันที่เลือก</p>`
    }</div>`;
    footer =
      state.dataset.source.kind === "synthetic"
        ? `<div class="event-caveat">${icon("info")} ตัวเลขจากข้อมูลจำลอง · แสดงวิธีทดสอบย้อนหลัง ไม่ใช่ผลจริง</div>`
        : "";
  }
  $("#event-banner").innerHTML = title + countdown + evidence + footer;
  if (state.overlay) $("#overlay-btn").onclick = () => setOverlay(!state.showOverlay, true);
}
function setOverlay(show, focus = false) {
  state.showOverlay = Boolean(show && state.overlay);
  if (overlayLayer) map.removeLayer(overlayLayer);
  overlayLayer = null;
  if (state.showOverlay) {
    overlayLayer = L.imageOverlay(state.overlay.url, state.overlay.bounds, {
      opacity: 0.95,
      className: "coherence-overlay",
      alt: "coherence ที่หายไปหลังเกิดเหตุ",
    }).addTo(map);
    if (focus) {
      const animate = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.setView([event.lat, event.lon], 16, { animate });
      // On phones the map sits below the banner; bring it on screen so the tap visibly does something.
      const box = $("#map").getBoundingClientRect();
      if (box.top > innerHeight * 0.6 || box.bottom < 0)
        $("#map").scrollIntoView({ behavior: animate ? "smooth" : "auto", block: "center" });
    }
  }
  $("#overlay-layer").checked = state.showOverlay;
  $("#overlay-layer").disabled = !state.overlay;
  $("#overlay-legend").hidden = !state.showOverlay;
  // Points and the filled event dot would cover the ~80 m loss patch the overlay exists to show.
  $("#map").classList.toggle("overlay-on", state.showOverlay);
  syncLayers();
  renderEvent();
  createIcons({ icons });
}
function sortedRows() {
  return [...results].sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.id.localeCompare(b.id));
}
function badge(p) {
  return `<span class="badge ${p.status}"><span></span>${names[p.status]}</span>`;
}
function contextName(c) {
  return { hospital: "บริบทโรงพยาบาล", road: "แนวถนน", building: "พื้นที่อาคาร", other: "พื้นที่ทั่วไป" }[c];
}
function render() {
  const base = state.dataset.points.map((p) => analyzePoint(p, cutoff(), state));
  if (state.calibrate) {
    // CUSUM itself does not depend on the threshold, so calibrate on the first pass, then classify.
    state.threshold = controlThreshold(base, event, { floor: state.sensitivity });
    state.contrast = eventContrast(base, event);
    results = state.dataset.points.map((p) =>
      analyzePoint(p, cutoff(), { ...state, sensitivity: state.threshold }),
    );
  } else {
    state.threshold = state.sensitivity;
    state.contrast = null;
    results = base;
  }
  if (!results.some((r) => r.id === state.selected)) state.selected = results[0]?.id;
  const anomalies = results.filter((p) => p.status === "anomaly"),
    good = results.filter((p) => p.status !== "insufficient"),
    clusters = clusterPoints(results);
  $("#cutoff-label").textContent = fmtDate(cutoff());
  $("#timeline").value = state.dateIndex;
  $("#data-notice span").textContent = {
    real: "ข้อมูลจริง · Sentinel-1 (ESA Copernicus) ประมวลผลด้วย ASF HyP3 + MintPy · ใช้เฉพาะภาพก่อนเกิดเหตุ · LOS ไม่ใช่การทรุดแนวดิ่งโดยตรง",
    demo: "โหมดสาธิต · จุดวัด วันที่ถ่าย และค่าการเคลื่อนตัวทั้งหมดเป็นข้อมูลจำลอง ใช้ทดลองระบบ ยังไม่ใช่ผลวิเคราะห์เหตุสามเสนจริง",
    import: `ข้อมูลนำเข้า · ${state.dataset.source.name} — ผลคัดกรองยังต้องตรวจสอบกับหลักฐานภาคพื้น`,
  }[state.source];
  document
    .querySelectorAll("[data-source]")
    .forEach((b) => b.classList.toggle("active", b.dataset.source === state.source));
  $("#map-label").textContent = {
    real: "SENTINEL-1 · REAL DATA",
    demo: "SYNTHETIC DATA",
    import: "IMPORTED INSAR",
  }[state.source];
  $("#map-count").textContent = `${results.length} POINTS`;
  $("#stats").innerHTML = [
    [
      "map-pin",
      "จุดวัดทั้งหมด",
      results.length,
      "จุด",
      `${allDates.filter((d) => d <= cutoff()).length} วันถ่ายถึงวันที่เลือก`,
      "teal",
    ],
    [
      "shield-check",
      "จุดที่ผ่านคุณภาพ",
      good.length,
      "จุด",
      `Coherence ≥ ${state.minCoherence.toFixed(2)} · อย่างน้อย 8 วัน`,
      "green",
    ],
    [
      "scan-eye",
      "ควรตรวจเพิ่มเติม",
      anomalies.length,
      "จุด",
      state.calibrate
        ? `เกณฑ์ CUSUM ${state.threshold.toFixed(0)} · พื้นที่ควบคุมเตือนผิด 5%`
        : "พบการเปลี่ยนแนวโน้มตามเกณฑ์ทดลอง",
      "orange",
    ],
    ["network", "กลุ่มบริเวณผิดปกติ", clusters.length, "กลุ่ม", "เชื่อมจุดภายในระยะ 180 เมตร", "blue"],
  ]
    .map(
      ([ico, title, value, unit, sub, tone]) =>
        `<article class="stat-card"><div class="stat-top"><span>${title}</span><span class="stat-icon ${tone}">${icon(ico)}</span></div><div class="stat-value">${value}<small>${unit}</small></div><p>${sub}</p></article>`,
    )
    .join("");
  $("#nav-count").textContent = anomalies.length;
  $("#queue-count").textContent = anomalies.length;
  renderEvent();
  renderMap(clusters);
  renderDetail();
  renderTables();
  renderSource();
  createIcons({ icons });
}
function renderMap(clusters) {
  clusterLayer.clearLayers();
  // Re-creating thousands of markers on every playback frame is slow on phones; restyle instead.
  if (markersFor !== state.dataset) {
    pointLayer.clearLayers();
    markerMap.clear();
    for (const p of state.dataset.points) {
      const m = L.circleMarker([p.lat, p.lon]).bindTooltip("", { direction: "top" });
      m.on("click", () => selectPoint(p.id, false));
      m.addTo(pointLayer);
      markerMap.set(p.id, m);
    }
    markersFor = state.dataset;
  }
  const dense = results.length > 1000;
  for (const group of clusters) {
    if (group.length < 2) continue;
    const center = [
      group.reduce((s, p) => s + p.lat, 0) / group.length,
      group.reduce((s, p) => s + p.lon, 0) / group.length,
    ];
    L.circle(center, {
      radius: 220,
      color: "#cf7843",
      weight: 1,
      dashArray: "4 5",
      fillColor: "#da925b",
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(clusterLayer);
  }
  for (const p of results) {
    const selected = p.id === state.selected;
    const m = markerMap.get(p.id);
    m.setRadius(selected ? 8 : p.status === "anomaly" ? (dense ? 4.2 : 5.5) : dense ? 2.4 : 3.8);
    m.setStyle({
      color: selected ? "#173e3c" : "#fff",
      weight: selected ? 2.5 : dense ? 0.5 : 1,
      fillColor: colors[p.status],
      fillOpacity: p.status === "insufficient" ? 0.55 : p.status === "anomaly" ? 0.95 : dense ? 0.7 : 0.9,
    });
    m.setTooltipContent(`${esc(p.id)} · ${names[p.status]}`);
    if (p.status === "anomaly" || selected) m.bringToFront();
  }
  markerMap.get(state.selected)?.bringToFront();
  syncLayers();
}
function syncLayers() {
  for (const [layer, on] of [
    [pointLayer, state.points],
    [clusterLayer, state.clusters],
  ]) {
    if (on && !state.showOverlay) map.addLayer(layer);
    else map.removeLayer(layer);
  }
}
function selectPoint(id, pan = true) {
  state.selected = id;
  if (state.view !== "overview") setView("overview");
  render();
  const p = results.find((p) => p.id === id);
  if (pan && p)
    map.panTo([p.lat, p.lon], { animate: !matchMedia("(prefers-reduced-motion: reduce)").matches });
}
function renderDetail() {
  const p = results.find((r) => r.id === state.selected);
  if (!p) {
    $("#point-detail").innerHTML = '<div class="empty">ไม่มีจุดวัด</div>';
    return;
  }
  const raw = state.dataset.points.find((r) => r.id === p.id);
  $("#point-detail").innerHTML =
    `<div class="point-intro"><div><span class="point-id">${esc(p.id)}</span>${badge(p)}</div><h3>${esc(p.label)}</h3><p>${p.lat.toFixed(5)}° N &nbsp; ${p.lon.toFixed(5)}° E</p></div><div class="detail-metrics"><div><span>LOS velocity</span><strong>${p.velocity == null ? "—" : p.velocity.toFixed(1)}<small>mm/yr</small></strong></div><div><span>Mean coherence</span><strong>${p.coherence == null ? "—" : p.coherence.toFixed(2)}<small>${p.samples.length} วันผ่าน QC</small></strong></div></div><div class="chart-section"><div class="chart-head"><h4>การเคลื่อนตัวสะสม</h4><span>LOS · mm</span></div>${chart(raw, p)}<div class="chart-key"><span><b></b>ผ่าน QC</span><span><b class="faded"></b>ไม่ผ่าน QC</span>${p.baseline ? `<span><i class="key-baseline"></i>แนวโน้มเดิม</span>` : ""}${eventInRange() ? `<span><i class="key-event"></i>วันเกิดเหตุ</span>` : ""}</div><p class="chart-note">ค่าลบ = เคลื่อนออกจากดาวเทียม</p></div><div class="evidence-box ${p.status}"><div>${icon(p.status === "anomaly" ? "scan-eye" : p.status === "insufficient" ? "circle-help" : "activity")}<strong>${p.status === "anomaly" ? "พบสัญญาณที่ควรตรวจสอบ" : p.status === "insufficient" ? "หลักฐานยังไม่เพียงพอ" : "ยังไม่พบจุดเปลี่ยนตามเกณฑ์"}</strong></div><p>${p.status === "anomaly" ? `CUSUM เกินเกณฑ์ครั้งแรก ${fmtDate(p.changeDate)} · ควรตรวจเทียบกับจุดข้างเคียงและข้อมูลภาคพื้น` : p.status === "insufficient" ? `มี ${p.samples.length} จาก ${p.available} วันถ่ายที่ผ่าน QC ต้องมีอย่างน้อย 8 วัน จึงยังสรุปแนวโน้มไม่ได้` : "ติดตามการเปลี่ยนแปลงต่อเนื่อง ผลนี้ไม่ได้ยืนยันความปลอดภัยของพื้นที่"}</p></div><div class="context-row">${icon("landmark")}<span>${contextName(p.context)}</span><span>${p.score == null ? "—" : `คะแนนจัดคิว ${p.score}/100`}</span></div><div class="settings"><button id="settings-toggle" class="text-button">${icon("sliders-horizontal")} เกณฑ์การวิเคราะห์ ${icon("chevron-down")}</button><div id="settings-body" hidden><label>Coherence ขั้นต่ำ <output id="qc-value">${state.minCoherence.toFixed(2)}</output><input type="range" id="qc-setting" min=".3" max=".95" step=".05" value="${state.minCoherence}"></label><label>เกณฑ์ CUSUM <select id="sensitivity-setting"><option value="auto" ${state.calibrate ? "selected" : ""}>อัตโนมัติ · พื้นที่ควบคุมเตือนผิด 5%</option><option value="3" ${!state.calibrate && state.sensitivity === 3 ? "selected" : ""}>3 · ไวต่อการเปลี่ยนแปลง</option><option value="4" ${!state.calibrate && state.sensitivity === 4 ? "selected" : ""}>4 · ค่าเริ่มต้น</option><option value="6" ${!state.calibrate && state.sensitivity === 6 ? "selected" : ""}>6 · ต้องการหลักฐานมากขึ้น</option></select></label><p>${state.calibrate ? `เกณฑ์ตอนนี้ ${state.threshold.toFixed(1)} · ปรับจากจุดที่ห่างหลุมเกิน 400 ม. ณ วันที่เลือก` : "ค่าทดลอง · ยังไม่สอบเทียบกับเหตุการณ์จริง"}</p></div></div>`;
  $("#settings-toggle").onclick = () => ($("#settings-body").hidden = !$("#settings-body").hidden);
  $("#qc-setting").onchange = (e) => {
    state.minCoherence = Number(e.target.value);
    render();
  };
  $("#qc-setting").oninput = (e) => ($("#qc-value").textContent = Number(e.target.value).toFixed(2));
  $("#sensitivity-setting").onchange = (e) => {
    state.calibrate = e.target.value === "auto";
    if (!state.calibrate) state.sensitivity = Number(e.target.value);
    render();
  };
}
function chart(raw, p) {
  const samples = raw.observations
    .filter((o) => o.date <= cutoff())
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!samples.length) return '<div class="empty">ยังไม่มีข้อมูลถึงวันที่เลือก</div>';
  const W = 340,
    H = 174,
    pad = { l: 35, r: 12, t: 16, b: 26 };
  // Keep the event on the axis so playback visibly closes the gap toward it.
  const endDate = eventInRange() && event.date > cutoff() ? event.date : cutoff();
  const minX = Date.parse(allDates[0]),
    maxX = Math.max(minX + 86400000, Date.parse(endDate));
  const ys = samples.map((o) => o.los_mm),
    lo = Math.min(-2, ...ys) - 2,
    hi = Math.max(2, ...ys) + 2;
  const x = (d) => pad.l + ((Date.parse(d) - minX) / (maxX - minX)) * (W - pad.l - pad.r),
    y = (v) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);
  const accepted = samples.filter((o) => o.coherence >= state.minCoherence);
  const path = accepted
    .map((o, i) => `${i ? "L" : "M"}${x(o.date).toFixed(2)},${y(o.los_mm).toFixed(2)}`)
    .join(" ");
  const grid = [0, 0.5, 1]
    .map((f) => {
      const v = hi - (hi - lo) * f;
      return `<line x1="${pad.l}" y1="${y(v)}" x2="${W - pad.r}" y2="${y(v)}" stroke="#e5eae7" stroke-dasharray="3 3"/><text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(0)}</text>`;
    })
    .join("");
  const predict = (d) =>
    p.baseline.intercept + (p.baseline.slope * (Date.parse(d) - p.baseline.start)) / 86400000;
  const from = accepted[0]?.date,
    to = accepted.at(-1)?.date;
  const baseline = p.baseline
    ? `<line class="baseline" x1="${x(from)}" y1="${y(predict(from))}" x2="${x(to)}" y2="${y(predict(to))}"/>`
    : "";
  const vline = (d, cls, label, anchor) =>
    `<line class="${cls}" x1="${x(d)}" y1="${pad.t}" x2="${x(d)}" y2="${H - pad.b}"/><text class="${cls}-label" x="${x(d) + (anchor === "end" ? -3 : 3)}" y="${pad.t - 5}" text-anchor="${anchor}">${label}</text>`;
  const change = p.changeDate ? vline(p.changeDate, "change-line", "เริ่มเตือน", "end") : "";
  const eventLine =
    eventInRange() && event.date <= endDate ? vline(event.date, "event-line", "เกิดเหตุ", "end") : "";
  return `<svg viewBox="0 0 ${W} ${H}" class="los-chart" role="img" aria-label="กราฟ LOS ของ ${esc(p.id)} มี ${samples.length} วันถ่าย ถึง ${cutoff()}">${grid}${eventLine}${change}${baseline}<path d="${path}" fill="none" stroke="#397e73" stroke-width="1.8"/>${samples.map((o) => `<circle cx="${x(o.date)}" cy="${y(o.los_mm)}" r="${o.coherence >= state.minCoherence ? 2.6 : 3}" fill="${o.coherence >= state.minCoherence ? "#397e73" : "#b7c1bf"}"><title>${o.date}: ${o.los_mm} mm · coherence ${o.coherence}</title></circle>`).join("")}<text x="${pad.l}" y="${H - 4}">${shortDate(allDates[0])}</text><text x="${W - pad.r}" y="${H - 4}" text-anchor="end">${shortDate(endDate)}</text></svg>`;
}
function table(rows, limit) {
  if (!rows.length) return '<div class="empty">ยังไม่มีจุดที่ตรงกับเงื่อนไข ณ วันที่เลือก</div>';
  return `<div class="table-scroll"><table><thead><tr><th>จุดวัด / บริเวณ</th><th>สถานะ</th><th>LOS velocity</th><th>คุณภาพเฉลี่ย</th><th>คะแนนจัดคิว</th><th>หลักฐานถึง</th><th></th></tr></thead><tbody>${rows
    .slice(0, limit ?? rows.length)
    .map(
      (p) =>
        `<tr><td><button class="point-select" data-point="${esc(p.id)}">${esc(p.id)}<small>${esc(p.label)}</small></button></td><td>${badge(p)}</td><td class="mono">${p.velocity == null ? "—" : p.velocity.toFixed(1)} <span class="unit">mm/yr</span></td><td><div class="coherence-cell"><span class="meter"><b style="width:${(p.coherence ?? 0) * 100}%"></b></span>${p.coherence?.toFixed(2) ?? "—"}</div></td><td><span class="score">${p.score ?? "—"}</span><span class="unit">${p.score != null ? "/ 100" : ""}</span></td><td class="date-cell">${shortDate(cutoff())}</td><td><button class="icon-button" data-point="${esc(p.id)}" aria-label="ดูจุด ${esc(p.id)}">${icon("arrow-up-right")}</button></td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
function renderTables() {
  $("#preview-table").innerHTML = table(
    sortedRows().filter((p) => p.status === "anomaly"),
    4,
  );
  const query = state.search.toLowerCase();
  $("#full-table").innerHTML = table(
    sortedRows().filter(
      (p) =>
        (state.filter === "all" || p.status === state.filter) &&
        `${p.id} ${p.label}`.toLowerCase().includes(query),
    ),
  );
  document.querySelectorAll("[data-point]").forEach((b) => (b.onclick = () => selectPoint(b.dataset.point)));
}
function renderSource() {
  $("#source-details").innerHTML =
    `<h3>${esc(state.dataset.source.name)}</h3><p>${esc(state.dataset.source.reference)}</p><p>${state.dataset.points.length} จุด · ${allDates.length} วันถ่าย<br>${shortDate(allDates[0])} – ${shortDate(allDates.at(-1))}</p>`;
}
function setView(view) {
  state.view = view;
  for (const v of ["overview", "queue", "method"]) $(`#${v}-view`).hidden = v !== view;
  document.querySelectorAll(".nav").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  $("#breadcrumb-title").textContent = {
    overview: "ภาพรวมพื้นที่",
    queue: "รายการจุดตรวจ",
    method: "วิธีวิเคราะห์",
  }[view];
  $("#page-title").innerHTML = {
    overview: 'มองเห็นการเปลี่ยนแปลง<span class="title-dot">.</span>',
    queue: 'เปลี่ยนหลักฐานเป็นจุดตรวจ<span class="title-dot">.</span>',
    method: 'เข้าใจที่มาของทุกสัญญาณ<span class="title-dot">.</span>',
  }[view];
  location.hash = view;
  if (view === "overview") setTimeout(() => map.invalidateSize(), 0);
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportReport() {
  const rows = sortedRows().map((p) => ({
    id: p.id,
    label: p.label,
    lat: p.lat,
    lon: p.lon,
    status: p.status,
    los_velocity_mm_yr: p.velocity == null ? "" : Number(p.velocity.toFixed(3)),
    mean_coherence: p.coherence,
    accepted_observations: p.samples.length,
    first_cusum_exceedance: p.changeDate,
    inspection_score: p.score,
    cutoff: cutoff(),
    min_coherence: state.minCoherence,
    cusum_threshold: state.threshold,
    threshold_mode: state.calibrate ? "control-area 5% false alarms" : "fixed",
    source_kind: state.dataset.source.kind,
    source: state.dataset.source.name,
    reference: state.dataset.source.reference,
    note: "Research screening only; LOS is not vertical subsidence; score is not collapse probability",
  }));
  download(
    `subsidencewatch-${state.dataset.source.kind}-${cutoff()}.csv`,
    "\uFEFF" + exportCsv(rows),
    "text/csv;charset=utf-8",
  );
  toast("ส่งออกรายงาน CSV แล้ว");
}
function sample() {
  download(
    "subsidencewatch-synthetic-example.json",
    JSON.stringify(createDemo(), null, 2),
    "application/json",
  );
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  setTimeout(() => $("#toast").classList.remove("visible"), 3500);
}
function stopPlay() {
  clearInterval(playTimer);
  playTimer = null;
  $("#play-btn").innerHTML = icon("play");
  $("#play-btn").setAttribute("aria-label", "เล่นลำดับเวลา");
  createIcons({ icons });
}
document.querySelectorAll("[data-view]").forEach((b) => (b.onclick = () => setView(b.dataset.view)));
$(".brand").onclick = () => setView("overview");
$("#method-link").onclick = () => setView("method");
$("#timeline").oninput = (e) => {
  stopPlay();
  state.dateIndex = Number(e.target.value);
  render();
};
$("#play-btn").onclick = () => {
  if (playTimer) {
    stopPlay();
    return;
  }
  // Start where points first have the 8 accepted acquisitions the detector needs, so frames are not empty.
  if (state.dateIndex === allDates.length - 1) state.dateIndex = Math.min(7, allDates.length - 1);
  $("#play-btn").innerHTML = icon("pause");
  $("#play-btn").setAttribute("aria-label", "หยุดลำดับเวลา");
  createIcons({ icons });
  render();
  playTimer = setInterval(() => {
    state.dateIndex++;
    render();
    if (state.dateIndex >= allDates.length - 1) stopPlay();
  }, PLAY_MS);
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopPlay();
});
$("#fit-btn").onclick = () =>
  map.fitBounds(L.latLngBounds(state.dataset.points.map((p) => [p.lat, p.lon])).pad(0.1));
$("#layers-btn").onclick = () => ($("#layer-controls").hidden = !$("#layer-controls").hidden);
$("#point-layer").onchange = (e) => {
  state.points = e.target.checked;
  state.points ? map.addLayer(pointLayer) : map.removeLayer(pointLayer);
};
$("#cluster-layer").onchange = (e) => {
  state.clusters = e.target.checked;
  state.clusters ? map.addLayer(clusterLayer) : map.removeLayer(clusterLayer);
};
$("#search").oninput = (e) => {
  state.search = e.target.value;
  renderTables();
  createIcons({ icons });
};
$("#queue-filter").onchange = (e) => {
  state.filter = e.target.value;
  renderTables();
  createIcons({ icons });
};
$("#export-btn").onclick = exportReport;
$("#queue-export").onclick = exportReport;
$("#sample-btn").onclick = sample;
$("#download-sample").onclick = sample;
$("#import-btn").onclick = () => {
  $("#import-error").textContent = "";
  $("#import-dialog").showModal();
};
$("#close-import").onclick = () => $("#import-dialog").close();
$("#import-dialog").addEventListener("click", (e) => {
  if (e.target === $("#import-dialog")) {
    const rect = e.target.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)
      e.target.close();
  }
});
$("#import-form").onsubmit = async (e) => {
  e.preventDefault();
  const file = $("#data-file").files[0];
  if (!file) return;
  try {
    if (file.size > 20 * 1024 * 1024) throw Error("ไฟล์ใหญ่เกิน 20 MB");
    const text = await file.text();
    let data;
    if (file.name.toLowerCase().endsWith(".csv")) {
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (parsed.errors.length) throw Error(parsed.errors[0].message);
      data = csvRowsToDataset(parsed.data, {
        name: $("#source-name").value,
        kind: "insar",
        reference: $("#source-reference").value,
        losConvention: "negative_away",
      });
    } else data = validateDataset(JSON.parse(text));
    setDataset(data, { source: "import", selected: data.points[0].id });
    map.fitBounds(L.latLngBounds(data.points.map((p) => [p.lat, p.lon])).pad(0.1));
    $("#import-dialog").close();
    setView("overview");
    toast("ตรวจสอบและนำเข้าข้อมูลสำเร็จ");
  } catch (error) {
    $("#import-error").textContent = error.message;
  }
};
function nearestToEvent(points) {
  let best = null,
    bestD = Infinity;
  for (const p of points) {
    const d = (p.lat - event.lat) ** 2 + ((p.lon - event.lon) * Math.cos((event.lat * Math.PI) / 180)) ** 2;
    if (d < bestD) [best, bestD] = [p, d];
  }
  return best;
}
function setDataset(data, { source, overlay = null, calibrate = false, selected } = {}) {
  stopPlay();
  Object.assign(state, { dataset: data, source, overlay, calibrate, search: "", filter: "all" });
  $("#search").value = "";
  $("#queue-filter").value = "all";
  refreshDates();
  state.selected = selected ?? nearestToEvent(data.points)?.id ?? data.points[0].id;
  setOverlay(false);
  render();
}
function loadDemo() {
  setDataset(createDemo(), { source: "demo", selected: "SAM-063" });
  map.setView([event.lat, event.lon], 14);
}
async function loadReal() {
  try {
    if (!realBundle) {
      const response = await fetch(`${import.meta.env.BASE_URL}data/samsen-real.json`);
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      realBundle = expandCompact(await response.json());
    }
    const { dataset, overlay } = realBundle;
    setDataset(dataset, {
      source: "real",
      calibrate: true,
      overlay: overlay && { ...overlay, url: import.meta.env.BASE_URL + overlay.url },
    });
    map.setView([event.lat, event.lon], 15);
  } catch (error) {
    loadDemo();
    toast(`โหลดข้อมูลจริงไม่ได้ (${error.message}) · ใช้ข้อมูลจำลองแทน`);
  }
}
$("#reset-demo").onclick = () => {
  loadDemo();
  setView("overview");
  toast("กลับสู่ข้อมูลจำลองแล้ว");
};
document.querySelectorAll("[data-source]").forEach(
  (b) =>
    (b.onclick = () => {
      if (b.dataset.source === state.source) return;
      b.dataset.source === "real" ? loadReal() : loadDemo();
    }),
);
$("#overlay-layer").onchange = (e) => setOverlay(e.target.checked);
// Phones need a LAN address; scripts/demo.mjs passes it in, or use the page URL when not on localhost.
const publicUrl =
  import.meta.env.VITE_PUBLIC_URL ||
  (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)
    ? null
    : location.origin + location.pathname);
$("#qr-btn").hidden = !publicUrl;
$("#qr-btn").onclick = async () => {
  await QRCode.toCanvas($("#qr-canvas"), publicUrl, { width: 240, margin: 1 });
  $("#qr-url").textContent = publicUrl;
  $("#qr-dialog").showModal();
};
$("#close-qr").onclick = () => $("#qr-dialog").close();
setView(
  ["overview", "queue", "method"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "overview",
);
(new URLSearchParams(location.search).get("data") === "demo"
  ? Promise.resolve(loadDemo())
  : loadReal()
).finally(() => $("#loading").remove());
