import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";

const PORT = 4175;
const FPS = 30;
const DURATION_SEC = 22;
const TOTAL_FRAMES = FPS * DURATION_SEC; // 660 frames
const WIDTH = 1920;
const HEIGHT = 1080;

const OUTPUT_DIR = path.join(process.cwd(), "output_videos");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const RAW_VIDEO_PATH = path.join(OUTPUT_DIR, "cinematic_wow_raw.mp4");
const FINAL_VIDEO_PATH = path.join(OUTPUT_DIR, "subsidencewatch_cinematic_wow.mp4");
const MUTED_VIDEO_PATH = path.join(OUTPUT_DIR, "subsidencewatch_cinematic_wow_muted.mp4");

// Static server
const server = http.createServer((req, res) => {
  const cleanUrl = req.url.split("?")[0];
  const filePath = path.join(process.cwd(), "dist", cleanUrl === "/" ? "index.html" : cleanUrl);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mime = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".svg": "image/svg+xml"
    }[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, async () => {
  console.log(`[1/5] Server running on http://127.0.0.1:${PORT}`);

  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      `--window-size=${WIDTH},${HEIGHT}`,
      "--disable-dev-shm-usage",
      "--font-render-hinting=none"
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForSelector("#play-btn", { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log("[2/5] Injecting Cinematic Space-Grade HUD & Visual FX Layers...");

  await page.evaluate(() => {
    // Set perspective on a wrapper or apply directly without breaking fixed positioning
    const app = document.getElementById("app");
    app.style.transformOrigin = "50% 50%";
    app.style.transition = "transform 0.05s linear";
    app.style.willChange = "transform";

    // ─────────────────────────────────────────────────────────────
    // 1. TOP CINEMATIC HUD BAR
    // ─────────────────────────────────────────────────────────────
    const hudTop = document.createElement("div");
    hudTop.id = "cinema-hud-top";
    hudTop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 54px;
      background: linear-gradient(180deg, rgba(6, 13, 13, 0.95) 0%, rgba(6, 13, 13, 0.6) 80%, transparent 100%);
      z-index: 999995;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 36px;
      font-family: -apple-system, Inter, monospace;
      color: #94A3B8;
      font-size: 13px;
      letter-spacing: 1.5px;
      pointer-events: none;
      border-bottom: 1px solid rgba(45, 155, 142, 0.2);
    `;
    hudTop.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10B981; box-shadow: 0 0 10px #10B981;"></span>
        <strong style="color: #5EEAD4; font-weight: 800;">SENTINEL-1 IN-ORBIT TELEMETRY</strong>
        <span style="color: #64748B;">| TRACK 62 DESCENDING · C-BAND SAR</span>
      </div>
      <div style="display: flex; gap: 24px; font-weight: 600;">
        <span id="hud-coord" style="color: #F8FAFC;">AOI: 13.781°N, 100.510°E (SAMSEN)</span>
        <span style="color: #38BDF8;">SCALE: 5 × 5 KM</span>
        <span style="color: #F59E0B;" id="hud-status">STATUS: MONITORING ACTIVE</span>
      </div>
    `;
    document.body.appendChild(hudTop);

    // ─────────────────────────────────────────────────────────────
    // 2. RADAR SWEEP CONE OVERLAY (Space-Grade Animation)
    // ─────────────────────────────────────────────────────────────
    const radarSweep = document.createElement("div");
    radarSweep.id = "cinema-radar-sweep";
    radarSweep.style.cssText = `
      position: fixed;
      top: 48%;
      left: 45%;
      width: 800px;
      height: 800px;
      transform: translate(-50%, -50%) rotate(0deg);
      border-radius: 50%;
      background: conic-gradient(from 0deg, rgba(45, 155, 142, 0.18) 0deg, rgba(45, 155, 142, 0) 60deg, transparent 360deg);
      pointer-events: none;
      z-index: 999980;
      opacity: 0.8;
      border: 1px dashed rgba(45, 155, 142, 0.25);
    `;
    document.body.appendChild(radarSweep);

    // ─────────────────────────────────────────────────────────────
    // 3. TARGET LOCK RETICLE (On Samsen Sinkhole)
    // ─────────────────────────────────────────────────────────────
    const reticle = document.createElement("div");
    reticle.id = "cinema-reticle";
    reticle.style.cssText = `
      position: fixed;
      width: 140px;
      height: 140px;
      border: 2px dashed rgba(239, 68, 68, 0.8);
      border-radius: 50%;
      pointer-events: none;
      z-index: 999985;
      transform: translate(-50%, -50%) scale(1);
      display: none;
      box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
    `;
    reticle.innerHTML = `
      <div style="position: absolute; top: -28px; left: 50%; transform: translateX(-50%); background: #EF4444; color: #FFF; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; white-space: nowrap; letter-spacing: 1px;">
        TARGET ANOMALY LOCK
      </div>
      <div style="position: absolute; inset: 15px; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 50%;"></div>
    `;
    document.body.appendChild(reticle);

    // ─────────────────────────────────────────────────────────────
    // 4. KINETIC KEYNOTE HERO CARD (Bottom Island, Ultra-High Contrast)
    // ─────────────────────────────────────────────────────────────
    const card = document.createElement("div");
    card.id = "cinema-hero-card";
    card.style.cssText = `
      position: fixed;
      bottom: 34px;
      left: calc(50% + 117px);
      transform: translateX(-50%);
      width: 960px;
      background: #FFFFFF;
      border: 2px solid #E2E8F0;
      box-shadow: 0 30px 80px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0,0,0,0.06);
      border-radius: 22px;
      padding: 22px 36px;
      color: #0F172A;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "IBM Plex Sans Thai", sans-serif;
      z-index: 999990;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    card.innerHTML = `
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
          <span id="card-dot" style="display: inline-block; width: 11px; height: 11px; border-radius: 50%; background: #10B981; box-shadow: 0 0 10px #10B981;"></span>
          <span id="card-pill" style="font-size: 13px; font-weight: 800; letter-spacing: 2px; color: #164B45; text-transform: uppercase;">ACT 01 · SATELLITE RADAR INGESTION</span>
        </div>
        <div id="card-title" style="font-size: 29px; font-weight: 900; color: #0F172A; letter-spacing: -0.6px; line-height: 1.25; margin-bottom: 4px;">
          3,900 จุดตรวจวัด Sentinel-1 InSAR
        </div>
        <div id="card-desc" style="font-size: 15.5px; font-weight: 500; color: #475569; line-height: 1.45;">
          สแกนทะลุเมฆฝน ครอบคลุมสามเสน 5 × 5 กม. · ตรวจจับการเคลื่อนตัวระดับมิลลิเมตร
        </div>
      </div>
      <div id="card-stat-box" style="background: #F1F5F9; border: 1.5px solid #CBD5E1; border-radius: 14px; padding: 14px 24px; text-align: center; white-space: nowrap; min-width: 145px;">
        <span id="card-stat-label" style="display: block; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">SATELLITE DATA</span>
        <strong id="card-stat-val" style="font-size: 24px; font-weight: 900; color: #0F172A;">64 PASSES</strong>
      </div>
    `;
    document.body.appendChild(card);

    // ─────────────────────────────────────────────────────────────
    // 5. CINEMATIC GLOWING CURSOR
    // ─────────────────────────────────────────────────────────────
    const cursor = document.createElement("div");
    cursor.id = "cinema-cursor";
    cursor.innerHTML = `
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));">
        <path d="M5.5 3.2L18.8 12.3C19.7 12.9 19.3 14.3 18.2 14.3H12.9L16.2 20.3C16.6 21 16.1 21.9 15.3 21.9C14.9 21.9 14.5 21.7 14.3 21.3L11 15.3L7.7 18.6C7 19.3 5.8 18.8 5.8 17.8V3.9C5.8 3.2 6.6 2.7 7.2 3.2L5.5 3.2Z" fill="#5EEAD4" stroke="#0F172A" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    `;
    cursor.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 36px;
      height: 36px;
      pointer-events: none;
      z-index: 999999;
      transform: translate(500px, 400px);
    `;
    document.body.appendChild(cursor);

    // Ripple
    const ripple = document.createElement("div");
    ripple.id = "cinema-ripple";
    ripple.style.cssText = `
      position: fixed;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: 3px solid #2D9B8E;
      background: rgba(45, 155, 142, 0.3);
      pointer-events: none;
      z-index: 999998;
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
      transition: transform 0.4s ease-out, opacity 0.4s ease-out;
    `;
    document.body.appendChild(ripple);

    // ─────────────────────────────────────────────────────────────
    // 6. CINEMATIC DARK OUTRO
    // ─────────────────────────────────────────────────────────────
    const outro = document.createElement("div");
    outro.id = "cinema-outro";
    outro.style.cssText = `
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at 50% 40%, #0F2321 0%, #050B0B 100%);
      z-index: 1000000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.7s ease;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "IBM Plex Sans Thai", sans-serif;
      color: #FFFFFF;
      text-align: center;
    `;
    outro.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding: 6px 18px; background: rgba(45, 155, 142, 0.2); border: 1px solid rgba(45, 155, 142, 0.4); border-radius: 999px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10B981; box-shadow: 0 0 10px #10B981;"></span>
        <span style="font-size: 13px; font-weight: 800; color: #5EEAD4; letter-spacing: 2px;">GISTDA GeoHackathon 2026</span>
      </div>
      <h1 style="font-size: 56px; font-weight: 900; letter-spacing: -1.5px; margin: 0 0 14px 0; background: linear-gradient(180deg, #FFFFFF 0%, #94A3B8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        SubsidenceWatch
      </h1>
      <p style="font-size: 22px; color: #CBD5E1; max-width: 720px; line-height: 1.6; margin: 0 0 34px 0; font-weight: 500;">
        Space-Based Ground Motion Intelligence<br>
        <span style="color: #5EEAD4;">ตรวจจับการทรุดตัวก่อนเกิดภัยพิบัติ · เปลี่ยนข้อมูลดาวเทียมเป็นคิวลงตรวจเมือง</span>
      </p>
      <div style="display: flex; gap: 16px; align-items: center; background: rgba(15, 23, 42, 0.8); padding: 14px 30px; border-radius: 999px; border: 1.5px solid rgba(255,255,255,0.15); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        <span style="font-size: 17px; font-weight: 700; color: #F8FAFC; font-family: monospace;">github.com/P7tv/subsidencewatch</span>
      </div>
    `;
    document.body.appendChild(outro);
  });

  console.log(`[3/5] Recording ${TOTAL_FRAMES} frames (${DURATION_SEC}s @ ${FPS}fps) - Cinematic WOW Edition...`);

  const ffmpeg = spawn("ffmpeg", [
    "-y",
    "-f", "image2pipe",
    "-vcodec", "mjpeg",
    "-r", String(FPS),
    "-i", "-",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "faster",
    "-crf", "18",
    RAW_VIDEO_PATH
  ], {
    stdio: ["pipe", "ignore", "ignore"]
  });

  let playClicked = false;
  let pointClicked = false;
  let queueViewClicked = false;

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const sec = f / FPS;

    await page.evaluate((frame, s) => {
      const app = document.getElementById("app");
      const cursor = document.getElementById("cinema-cursor");
      const ripple = document.getElementById("cinema-ripple");
      const card = document.getElementById("cinema-hero-card");
      const cardDot = document.getElementById("card-dot");
      const cardPill = document.getElementById("card-pill");
      const cardTitle = document.getElementById("card-title");
      const cardDesc = document.getElementById("card-desc");
      const cardStatBox = document.getElementById("card-stat-box");
      const cardStatLabel = document.getElementById("card-stat-label");
      const cardStatVal = document.getElementById("card-stat-val");
      const radarSweep = document.getElementById("cinema-radar-sweep");
      const reticle = document.getElementById("cinema-reticle");
      const outro = document.getElementById("cinema-outro");
      const hudStatus = document.getElementById("hud-status");

      const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const lerp = (a, b, t) => a + (b - a) * t;

      // Rotate radar sweep continuously
      if (radarSweep) radarSweep.style.transform = `translate(-50%, -50%) rotate(${s * 120}deg)`;

      let curX = 960;
      let curY = 540;
      let zoom = 1.0;
      let rotX = 0;
      let rotY = 0;
      let transY = 0;
      let originX = 50;
      let originY = 50;

      // ─────────────────────────────────────────────────────────────
      // SCENE 1 (0.0s – 5.0s): 3D SPACE-TO-GROUND ORBITAL SCAN
      // ─────────────────────────────────────────────────────────────
      if (s < 5.0) {
        // Dramatic 3D perspective tilt transitioning smoothly into flat view
        const p = easeInOut(Math.min(1, s / 3.5));
        rotX = lerp(16, 0, p);
        transY = lerp(-20, 0, p);
        zoom = lerp(1.08, 1.0, p);

        window.scrollTo(0, lerp(0, 160, p));

        curX = lerp(1280, 760, p);
        curY = lerp(320, 480, p);

        cardDot.style.background = "#10B981";
        cardPill.textContent = "ACT 01 · SATELLITE RADAR INGESTION";
        cardPill.style.color = "#164B45";
        cardTitle.textContent = "3,900 จุดตรวจวัด Sentinel-1 InSAR";
        cardDesc.textContent = "สแกนทะลุเมฆฝน ครอบคลุมสามเสน 5 × 5 กม. · ตรวจจับการเคลื่อนตัวระดับมิลลิเมตร";

        cardStatBox.style.background = "#F1F5F9";
        cardStatBox.style.borderColor = "#CBD5E1";
        cardStatLabel.textContent = "SATELLITE DATA";
        cardStatLabel.style.color = "#64748B";
        cardStatVal.textContent = "64 PASSES";
        cardStatVal.style.color = "#0F172A";

        if (s > 3.8) {
          const pp = easeInOut(Math.min(1, (s - 3.8) / 1.2));
          const playBtn = document.getElementById("play-btn");
          const bRect = playBtn ? playBtn.getBoundingClientRect() : { x: 289, y: 863 };
          curX = lerp(760, bRect.x + 14, pp);
          curY = lerp(480, bRect.y + 14, pp);
        }
      }
      // ─────────────────────────────────────────────────────────────
      // SCENE 2 (5.0s – 13.0s): PRE-COLLAPSE ANOMALY & REPLAY
      // ─────────────────────────────────────────────────────────────
      else if (s < 13.0) {
        window.scrollTo(0, 160);
        rotX = 0;
        transY = 0;

        cardDot.style.background = "#EF4444";
        cardPill.textContent = "ACT 02 · PRE-COLLAPSE WARNING";
        cardPill.style.color = "#991B1B";
        cardTitle.textContent = "CUSUM ตรวจพบหลุมยุบสามเสนล่วงหน้า";
        cardDesc.textContent = "อัตราทรุด -6.9 mm/yr ต่อเนื่อง · สัญญาณเตือนขึ้นก่อนถนนถล่มจริง 24 ก.ย.";

        cardStatBox.style.background = "#FEF2F2";
        cardStatBox.style.borderColor = "#FECACA";
        cardStatLabel.textContent = "SUBSIDENCE RATE";
        cardStatLabel.style.color = "#DC2626";
        cardStatVal.textContent = "-6.9 mm/yr";
        cardStatVal.style.color = "#991B1B";

        if (hudStatus) {
          hudStatus.textContent = "STATUS: CRITICAL ANOMALY DETECTED";
          hudStatus.style.color = "#EF4444";
        }

        const playBtn = document.getElementById("play-btn");
        const bRect = playBtn ? playBtn.getBoundingClientRect() : { x: 289, y: 863 };
        const playX = bRect.x + 14;
        const playY = bRect.y + 14;

        if (s < 5.8) {
          curX = playX;
          curY = playY;
          if (s >= 5.0 && s < 5.4) {
            ripple.style.left = `${playX}px`;
            ripple.style.top = `${playY}px`;
            ripple.style.transform = "translate(-50%, -50%) scale(1.6)";
            ripple.style.opacity = "0.9";
          } else {
            ripple.style.opacity = "0";
            ripple.style.transform = "translate(-50%, -50%) scale(0)";
          }
        } else if (s < 9.5) {
          // Dynamic camera zoom into the pulsing sinkhole during playback
          const zp = easeInOut(Math.min(1, (s - 5.8) / 1.8));
          zoom = lerp(1.0, 1.28, zp);
          originX = 42;
          originY = 55;

          const p = easeInOut(Math.min(1, (s - 5.8) / 2.2));
          curX = lerp(playX, 780, p);
          curY = lerp(playY, 620, p);

          // Show holographic reticle
          if (reticle) {
            reticle.style.display = "block";
            reticle.style.left = "780px";
            reticle.style.top = "620px";
            reticle.style.transform = `translate(-50%, -50%) scale(${1 + Math.sin(s * 6) * 0.08})`;
          }
        } else {
          // Slide focus to the right panel LOS Displacement chart
          if (reticle) reticle.style.display = "none";
          const zp = easeInOut(Math.min(1, (s - 9.5) / 1.0));
          zoom = lerp(1.28, 1.0, zp);
          originX = 42;
          originY = 55;

          const p = easeInOut(Math.min(1, (s - 9.5) / 1.5));
          curX = lerp(780, 1560, p);
          curY = lerp(620, 560, p);
        }
      }
      // ─────────────────────────────────────────────────────────────
      // SCENE 3 (13.0s – 19.0s): ACTIONABLE FIELD QUEUE
      // ─────────────────────────────────────────────────────────────
      else if (s < 19.0) {
        if (reticle) reticle.style.display = "none";
        cardDot.style.background = "#0284C7";
        cardPill.textContent = "ACT 03 · ACTIONABLE CITY SAFETY";
        cardPill.style.color = "#0369A1";
        cardTitle.textContent = "Inspection Queue · คิวลงตรวจวิศวกร กทม.";
        cardDesc.textContent = "จัดลำดับ 162 จุดเสี่ยง รพ. และถนนสายหลัก พร้อม Export CSV ทันที";

        cardStatBox.style.background = "#E0F2FE";
        cardStatBox.style.borderColor = "#BAE6FD";
        cardStatLabel.textContent = "PRIORITY SITES";
        cardStatLabel.style.color = "#0284C7";
        cardStatVal.textContent = "162 SITES";
        cardStatVal.style.color = "#0369A1";

        if (hudStatus) {
          hudStatus.textContent = "STATUS: INSPECTION QUEUE DISPATCHED";
          hudStatus.style.color = "#38BDF8";
        }

        if (s < 14.5) {
          const p = easeInOut(Math.min(1, (s - 13.0) / 1.2));
          curX = lerp(1560, 110, p);
          curY = lerp(560, 155, p);
        } else if (s < 15.5) {
          curX = 110;
          curY = 155;
          if (s >= 14.5 && s < 14.9) {
            ripple.style.left = "110px";
            ripple.style.top = "155px";
            ripple.style.transform = "translate(-50%, -50%) scale(1.6)";
            ripple.style.opacity = "0.9";
          } else {
            ripple.style.opacity = "0";
            ripple.style.transform = "translate(-50%, -50%) scale(0)";
          }
        } else {
          // In Queue View: Glide to CSV export button
          window.scrollTo(0, 0);
          const p = easeInOut(Math.min(1, (s - 15.5) / 1.8));
          curX = lerp(110, 1720, p);
          curY = lerp(155, 120, p);
        }
      }
      // ─────────────────────────────────────────────────────────────
      // SCENE 4 (19.0s – 22.0s): CINEMATIC DARK OUTRO
      // ─────────────────────────────────────────────────────────────
      else {
        if (radarSweep) radarSweep.style.opacity = "0";
        if (reticle) reticle.style.display = "none";
        if (card) card.style.opacity = "0";
        if (outro) outro.style.opacity = "1";
      }

      app.style.transformOrigin = `${originX}% ${originY}%`;
      app.style.transform = `perspective(1400px) rotateX(${rotX}deg) translateY(${transY}px) scale(${zoom})`;
      cursor.style.transform = `translate(${curX}px, ${curY}px)`;
    }, f, sec);

    // Dom triggers
    if (sec >= 5.0 && !playClicked) {
      playClicked = true;
      await page.evaluate(() => {
        const btn = document.getElementById("play-btn");
        if (btn) btn.click();
      });
    }

    if (sec >= 10.0 && !pointClicked) {
      pointClicked = true;
      await page.evaluate(() => {
        const playBtn = document.getElementById("play-btn");
        if (playBtn && playBtn.getAttribute("aria-label") === "หยุดลำดับเวลา") playBtn.click();
        const pt = document.querySelector("[data-point=\"R085C119\"]") || document.querySelector("#preview-table [data-point]");
        if (pt) pt.click();
      });
    }

    if (sec >= 14.6 && !queueViewClicked) {
      queueViewClicked = true;
      await page.evaluate(() => {
        const qBtn = document.querySelector(".nav[data-view=\"queue\"]");
        if (qBtn) qBtn.click();
      });
    }

    const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 85 });
    const ok = ffmpeg.stdin.write(screenshotBuffer);
    if (!ok) {
      await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
    }

    if (f % 75 === 0 || f === TOTAL_FRAMES - 1) {
      process.stdout.write(`\r  Captured frame ${f + 1}/${TOTAL_FRAMES} (${Math.round(((f + 1) / TOTAL_FRAMES) * 100)}%)...`);
    }
  }

  console.log("\n[4/5] Finishing video encoding...");
  ffmpeg.stdin.end();

  await new Promise((resolve) => ffmpeg.on("close", resolve));
  await browser.close();
  server.close();

  console.log("[5/5] Mixing Cinematic Sci-Fi Audio Design...");

  // High-impact cinematic sound design:
  // - Sub-bass Braam drop at start
  // - Electronic synth pulse
  // - High-tech radar sweep & ping
  const audioCommand = [
    "-y",
    "-i", RAW_VIDEO_PATH,
    "-f", "lavfi",
    "-i", `sine=frequency=75:duration=${DURATION_SEC}`, // Sub boom
    "-f", "lavfi",
    "-i", `sine=frequency=150:duration=${DURATION_SEC}`, // Mid resonance
    "-f", "lavfi",
    "-i", `anoisesrc=d=${DURATION_SEC}:c=pink:r=44100`, // Atmospheric hum
    "-filter_complex",
    "[1:a]volume=0.25,lowpass=f=120[sub];" +
    "[2:a]volume=0.10,chorus=0.7:0.9:55:0.4:0.25:2[mid];" +
    "[3:a]bandpass=f=1800:width_type=h:w=400,volume=0.04[air];" +
    "[sub][mid][air]amix=inputs=3:duration=first[bed];" +
    "[bed]afade=t=in:ss=0:d=1.0,afade=t=out:st=20:d=2,loudnorm=I=-16:TP=-1.5:LRA=11[aout]",
    "-map", "0:v",
    "-map", "[aout]",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    FINAL_VIDEO_PATH
  ];

  const audioProc = spawn("ffmpeg", audioCommand);
  await new Promise((resolve, reject) => {
    audioProc.on("close", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with ${code}`)));
  });

  const mutedProc = spawn("ffmpeg", [
    "-y",
    "-i", RAW_VIDEO_PATH,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-an",
    MUTED_VIDEO_PATH
  ]);
  await new Promise((resolve, reject) => {
    mutedProc.on("close", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with ${code}`)));
  });

  fs.unlinkSync(RAW_VIDEO_PATH);

  console.log("\n🚀 Cinematic WOW Video generation complete!");
  console.log(`📁 Master Video: ${FINAL_VIDEO_PATH}`);
  console.log(`📁 Muted Video: ${MUTED_VIDEO_PATH}`);
});
