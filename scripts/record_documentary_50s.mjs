import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";

const PORT = 4176;
const FPS = 30;
const DURATION_SEC = 50;
const TOTAL_FRAMES = FPS * DURATION_SEC; // 1,500 frames
const WIDTH = 1920;
const HEIGHT = 1080;

const OUTPUT_DIR = path.join(process.cwd(), "output_videos");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const RAW_VIDEO_PATH = path.join(OUTPUT_DIR, "documentary_50s_raw.mp4");
const FINAL_VIDEO_PATH = path.join(OUTPUT_DIR, "subsidencewatch_demo_50s.mp4");
const MUTED_VIDEO_PATH = path.join(OUTPUT_DIR, "subsidencewatch_demo_50s_muted.mp4");

// Static server serving production build
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

  console.log("[2/5] Injecting Side Spotlight Callouts & Documentary Elements...");

  await page.evaluate(() => {
    const app = document.getElementById("app");
    app.style.transformOrigin = "50% 50%";
    app.style.transition = "transform 0.05s linear";
    app.style.willChange = "transform";

    // ─────────────────────────────────────────────────────────────
    // Smooth Human Cursor
    // ─────────────────────────────────────────────────────────────
    const cursor = document.createElement("div");
    cursor.id = "doc-cursor";
    cursor.innerHTML = `
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));">
        <path d="M5.5 3.2L18.8 12.3C19.7 12.9 19.3 14.3 18.2 14.3H12.9L16.2 20.3C16.6 21 16.1 21.9 15.3 21.9C14.9 21.9 14.5 21.7 14.3 21.3L11 15.3L7.7 18.6C7 19.3 5.8 18.8 5.8 17.8V3.9C5.8 3.2 6.6 2.7 7.2 3.2L5.5 3.2Z" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.6" stroke-linejoin="round"/>
      </svg>
    `;
    cursor.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 34px;
      height: 34px;
      pointer-events: none;
      z-index: 999999;
      transform: translate(600px, 450px);
    `;
    document.body.appendChild(cursor);

    // Ripple
    const ripple = document.createElement("div");
    ripple.id = "doc-ripple";
    ripple.style.cssText = `
      position: fixed;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 3px solid #164B45;
      background: rgba(22, 75, 69, 0.2);
      pointer-events: none;
      z-index: 999998;
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
      transition: transform 0.35s ease-out, opacity 0.35s ease-out;
    `;
    document.body.appendChild(ripple);

    // Helper to create Apple/Linear-grade Spotlight Callout cards
    const createCallout = (id, styleCss, innerContent) => {
      const el = document.createElement("div");
      el.id = id;
      el.style.cssText = `
        position: fixed;
        background: #FFFFFF;
        border: 1.5px solid #E2E8F0;
        box-shadow: 0 30px 65px -12px rgba(15, 23, 42, 0.32), 0 0 0 1px rgba(0, 0, 0, 0.05);
        border-radius: 20px;
        padding: 22px 28px;
        color: #0F172A;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        z-index: 999990;
        opacity: 0;
        transform: translateY(12px);
        transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
        ${styleCss}
      `;
      el.innerHTML = innerContent;
      document.body.appendChild(el);
      return el;
    };

    // ─────────────────────────────────────────────────────────────
    // CALLOUT 1: ACT 1 - SATELLITE RADAR INGESTION (Top-Left above map)
    // ─────────────────────────────────────────────────────────────
    createCallout("callout-1", "left: 270px; top: 110px; width: 540px;", `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#164B45" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 7 9 3 5 7l4 4"/>
          <path d="m17 11 4 4-4 4-4-4"/>
          <path d="m8 12 4 4 6-6-4-4Z"/>
          <path d="m16 8 3-3"/>
          <path d="M9 21a6 6 0 0 0-6-6"/>
        </svg>
        <span style="font-size: 13px; font-weight: 800; letter-spacing: 1.6px; color: #164B45; text-transform: uppercase;">01 · RADAR SATELLITE SCAN</span>
      </div>
      <div style="font-size: 27px; font-weight: 850; color: #0F172A; letter-spacing: -0.6px; line-height: 1.25; margin-bottom: 6px;">
        3,900 Millimeter Precision Points
      </div>
      <div style="font-size: 16.5px; font-weight: 500; color: #475569; line-height: 1.5;">
        Sentinel-1 satellite scans Bangkok through clouds and rain every 6–12 days across the 5 × 5 km Samsen district.
      </div>
      <!-- Pointer pointing down -->
      <div style="position: absolute; bottom: -11px; left: 60px; width: 20px; height: 11px; overflow: hidden;">
        <div style="width: 14px; height: 14px; background: #FFFFFF; border-right: 1.5px solid #E2E8F0; border-bottom: 1.5px solid #E2E8F0; transform: rotate(45deg) translate(-5px, -5px);"></div>
      </div>
    `);

    // ─────────────────────────────────────────────────────────────
    // CALLOUT 2: ACT 2 - TIMELINE REPLAY (Bottom-Left beside scrubber)
    // ─────────────────────────────────────────────────────────────
    createCallout("callout-2", "left: 360px; bottom: 85px; width: 550px;", `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span style="font-size: 13px; font-weight: 800; letter-spacing: 1.6px; color: #991B1B; text-transform: uppercase;">02 · 64 HISTORICAL SATELLITE PASSES</span>
      </div>
      <div style="font-size: 27px; font-weight: 850; color: #0F172A; letter-spacing: -0.6px; line-height: 1.25; margin-bottom: 6px;">
        Tracking Ground Motion Over Time
      </div>
      <div style="font-size: 16.5px; font-weight: 500; color: #475569; line-height: 1.5;">
        Replaying months of radar scans before collapse — notice the pulsing red marker indicating continuous subsidence.
      </div>
      <!-- Pointer pointing down-left -->
      <div style="position: absolute; bottom: 20px; left: -11px; width: 11px; height: 20px; overflow: hidden;">
        <div style="width: 14px; height: 14px; background: #FFFFFF; border-left: 1.5px solid #E2E8F0; border-bottom: 1.5px solid #E2E8F0; transform: rotate(45deg) translate(2px, 2px);"></div>
      </div>
    `);

    // ─────────────────────────────────────────────────────────────
    // CALLOUT 3: ACT 3 - LOS DISPLACEMENT & CUSUM (Pointing right at chart)
    // ─────────────────────────────────────────────────────────────
    createCallout("callout-3", "right: 480px; top: 510px; width: 540px;", `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
          <polyline points="17 6 23 6 23 12"/>
        </svg>
        <span style="font-size: 13px; font-weight: 800; letter-spacing: 1.6px; color: #9A3412; text-transform: uppercase;">03 · EARLY ANOMALY WARNING</span>
      </div>
      <div style="font-size: 27px; font-weight: 850; color: #0F172A; letter-spacing: -0.6px; line-height: 1.25; margin-bottom: 6px;">
        Sinking at -6.9 mm / year
      </div>
      <div style="font-size: 16.5px; font-weight: 500; color: #475569; line-height: 1.5;">
        CUSUM detector flags abnormal subsidence months in advance — more anomalous than 93% of surrounding control areas.
      </div>
      <!-- Pointer pointing right -->
      <div style="position: absolute; top: 32px; right: -11px; width: 11px; height: 20px; overflow: hidden;">
        <div style="width: 14px; height: 14px; background: #FFFFFF; border-top: 1.5px solid #E2E8F0; border-right: 1.5px solid #E2E8F0; transform: rotate(45deg) translate(-2px, -2px);"></div>
      </div>
    `);

    // ─────────────────────────────────────────────────────────────
    // CALLOUT 4: ACT 4 - ACTIONABLE INSPECTION QUEUE (Pointing down at table)
    // ─────────────────────────────────────────────────────────────
    createCallout("callout-4", "left: 420px; top: 160px; width: 550px;", `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          <polyline points="9 14 12 17 17 12"/>
        </svg>
        <span style="font-size: 13px; font-weight: 800; letter-spacing: 1.6px; color: #0369A1; text-transform: uppercase;">04 · ACTIONABLE CITY SAFETY</span>
      </div>
      <div style="font-size: 27px; font-weight: 850; color: #0F172A; letter-spacing: -0.6px; line-height: 1.25; margin-bottom: 6px;">
        162 Ranked Inspection Targets
      </div>
      <div style="font-size: 16.5px; font-weight: 500; color: #475569; line-height: 1.5;">
        Prioritizes hospitals and major roads. 1-click CSV export ready for city engineering crews and field radar trucks.
      </div>
      <!-- Pointer pointing down -->
      <div style="position: absolute; bottom: -11px; left: 80px; width: 20px; height: 11px; overflow: hidden;">
        <div style="width: 14px; height: 14px; background: #FFFFFF; border-right: 1.5px solid #E2E8F0; border-bottom: 1.5px solid #E2E8F0; transform: rotate(45deg) translate(-5px, -5px);"></div>
      </div>
    `);

    // ─────────────────────────────────────────────────────────────
    // ACT 5: EXECUTIVE STUDIO OUTRO (BKK Dark Theme matching slides)
    // ─────────────────────────────────────────────────────────────
    const outro = document.createElement("div");
    outro.id = "doc-outro";
    outro.style.cssText = `
      position: fixed;
      inset: 0;
      background: #0B1325;
      z-index: 1000000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.8s ease;
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      color: #FFFFFF;
      text-align: center;
    `;
    outro.innerHTML = `
      <div style="width: 80px; height: 80px; border-radius: 24px; background: rgba(0, 229, 255, 0.15); border: 2px solid #00E5FF; display: grid; place-items: center; margin-bottom: 24px; box-shadow: 0 0 40px rgba(0, 229, 255, 0.35);">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 7 9 3 5 7l4 4"/>
          <path d="m17 11 4 4-4 4-4-4"/>
          <path d="m8 12 4 4 6-6-4-4Z"/>
          <path d="m16 8 3-3"/>
          <path d="M9 21a6 6 0 0 0-6-6"/>
        </svg>
      </div>
      <h1 style="font-size: 58px; font-weight: 900; letter-spacing: -1.5px; margin: 0 0 14px 0; color: #FFFFFF;">
        SubsidenceWatch <span style="color: #00E5FF; text-shadow: 0 0 35px rgba(0, 229, 255, 0.6);">BKK</span>
      </h1>
      <p style="font-size: 23px; color: #94A3B8; max-width: 720px; line-height: 1.5; margin: 0 0 32px 0; font-weight: 500;">
        Satellite-Based Ground-Motion Monitoring & Early Warning
      </p>

      <div style="display: flex; gap: 20px; margin-bottom: 36px;">
        <div style="background: rgba(15, 30, 54, 0.9); border: 1.5px solid rgba(0, 229, 255, 0.3); padding: 12px 24px; border-radius: 999px; font-size: 16px; font-weight: 700; color: #FFFFFF; display: flex; align-items: center; gap: 8px;">
          <span style="color: #00E5FF;">3,900</span> Radar Points
        </div>
        <div style="background: rgba(15, 30, 54, 0.9); border: 1.5px solid rgba(239, 68, 68, 0.35); padding: 12px 24px; border-radius: 999px; font-size: 16px; font-weight: 700; color: #FFFFFF; display: flex; align-items: center; gap: 8px;">
          <span style="color: #EF4444;">-6.9 mm/yr</span> Anomaly Detected
        </div>
        <div style="background: rgba(15, 30, 54, 0.9); border: 1.5px solid rgba(16, 185, 129, 0.35); padding: 12px 24px; border-radius: 999px; font-size: 16px; font-weight: 700; color: #FFFFFF; display: flex; align-items: center; gap: 8px;">
          <span style="color: #10B981;">162</span> Field Targets
        </div>
      </div>

      <div style="display: flex; gap: 16px; align-items: center; background: rgba(15, 30, 54, 0.8); padding: 14px 28px; border-radius: 999px; border: 1.5px solid #00E5FF; box-shadow: 0 0 30px rgba(0, 229, 255, 0.25);">
        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #10B981; box-shadow: 0 0 12px #10B981;"></span>
        <span style="font-size: 18px; font-weight: 700; color: #00E5FF; font-family: monospace;">https://subsidencewatch.vercel.app</span>
        <span style="color: #64748B;">·</span>
        <span style="font-size: 15px; font-weight: 700; color: #CBD5E1; letter-spacing: 0.5px;">GeoHackathon 2026 (GISTDA)</span>
      </div>
    `;
    document.body.appendChild(outro);
  });

  console.log(`[3/5] Recording ${TOTAL_FRAMES} frames (${DURATION_SEC}s @ ${FPS}fps) - Product Documentary Edition...`);

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
      const cursor = document.getElementById("doc-cursor");
      const ripple = document.getElementById("doc-ripple");
      const c1 = document.getElementById("callout-1");
      const c2 = document.getElementById("callout-2");
      const c3 = document.getElementById("callout-3");
      const c4 = document.getElementById("callout-4");
      const outro = document.getElementById("doc-outro");

      const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const lerp = (a, b, t) => a + (b - a) * t;

      let curX = 960;
      let curY = 540;
      let zoom = 1.0;
      let originX = 50;
      let originY = 50;

      // ─────────────────────────────────────────────────────────────
      // ACT 1 (0.0s – 10.0s): CONTEXT & SCALE (3,900 POINTS)
      // ─────────────────────────────────────────────────────────────
      if (s < 10.0) {
        // Slow calm scroll down
        const p = easeInOut(Math.min(1, s / 4.0));
        window.scrollTo(0, lerp(0, 160, p));

        // Cursor gently moves over the map
        curX = lerp(1200, 780, p);
        curY = lerp(380, 520, p);

        // Callout 1 appears gracefully (1.0s to 9.0s)
        if (s >= 1.0 && s < 9.0) {
          c1.style.opacity = "1";
          c1.style.transform = "translateY(0)";
        } else {
          c1.style.opacity = "0";
          c1.style.transform = "translateY(12px)";
        }

        // Near end of Act 1, cursor drifts toward Play button
        if (s >= 8.5) {
          const pp = easeInOut(Math.min(1, (s - 8.5) / 1.5));
          const playBtn = document.getElementById("play-btn");
          const bRect = playBtn ? playBtn.getBoundingClientRect() : { x: 289, y: 863 };
          curX = lerp(780, bRect.x + 14, pp);
          curY = lerp(520, bRect.y + 14, pp);
        }
      }
      // ─────────────────────────────────────────────────────────────
      // ACT 2 (10.0s – 22.0s): 64-PASS REPLAY & ANOMALY EMERGENCE
      // ─────────────────────────────────────────────────────────────
      else if (s < 22.0) {
        window.scrollTo(0, 160);
        c1.style.opacity = "0";

        const playBtn = document.getElementById("play-btn");
        const bRect = playBtn ? playBtn.getBoundingClientRect() : { x: 289, y: 863 };
        const playX = bRect.x + 14;
        const playY = bRect.y + 14;

        // Click on play button around 10.8s
        if (s < 11.5) {
          curX = playX;
          curY = playY;
          if (s >= 10.8 && s < 11.2) {
            ripple.style.left = `${playX}px`;
            ripple.style.top = `${playY}px`;
            ripple.style.transform = "translate(-50%, -50%) scale(1.6)";
            ripple.style.opacity = "0.8";
          } else {
            ripple.style.opacity = "0";
            ripple.style.transform = "translate(-50%, -50%) scale(0)";
          }
        } else {
          // Camera gently eases in (1.25x) on the sinkhole & Vajira
          const zp = easeInOut(Math.min(1, (s - 11.5) / 3.0));
          zoom = lerp(1.0, 1.25, zp);
          originX = 42;
          originY = 55;

          const p = easeInOut(Math.min(1, (s - 11.5) / 3.5));
          curX = lerp(playX, 780, p);
          curY = lerp(playY, 620, p);
        }

        // Callout 2 appears (11.5s to 21.0s)
        if (s >= 11.5 && s < 21.0) {
          c2.style.opacity = "1";
          c2.style.transform = "translateY(0)";
        } else {
          c2.style.opacity = "0";
          c2.style.transform = "translateY(12px)";
        }
      }
      // ─────────────────────────────────────────────────────────────
      // ACT 3 (22.0s – 34.0s): SCIENTIFIC PROOF - LOS DISPLACEMENT
      // ─────────────────────────────────────────────────────────────
      else if (s < 34.0) {
        c2.style.opacity = "0";

        // Glide camera smoothly to right panel
        const zp = easeInOut(Math.min(1, (s - 22.0) / 2.0));
        zoom = lerp(1.25, 1.0, zp);
        originX = 42;
        originY = 55;

        const p = easeInOut(Math.min(1, (s - 22.0) / 2.5));
        curX = lerp(780, 1580, p);
        curY = lerp(620, 560, p);

        // Callout 3 appears (23.0s to 33.0s)
        if (s >= 23.0 && s < 33.0) {
          c3.style.opacity = "1";
          c3.style.transform = "translateY(0)";
        } else {
          c3.style.opacity = "0";
          c3.style.transform = "translateY(12px)";
        }

        // Towards end of Act 3, cursor glides left towards the nav menu
        if (s >= 32.5) {
          const pp = easeInOut(Math.min(1, (s - 32.5) / 1.5));
          curX = lerp(1580, 110, pp);
          curY = lerp(560, 155, pp);
        }
      }
      // ─────────────────────────────────────────────────────────────
      // ACT 4 (34.0s – 44.0s): ACTIONABLE INSPECTION QUEUE
      // ─────────────────────────────────────────────────────────────
      else if (s < 44.0) {
        c3.style.opacity = "0";

        if (s < 35.5) {
          curX = 110;
          curY = 155;
          if (s >= 34.8 && s < 35.2) {
            ripple.style.left = "110px";
            ripple.style.top = "155px";
            ripple.style.transform = "translate(-50%, -50%) scale(1.6)";
            ripple.style.opacity = "0.8";
          } else {
            ripple.style.opacity = "0";
            ripple.style.transform = "translate(-50%, -50%) scale(0)";
          }
        } else {
          window.scrollTo(0, 0);
          // Cursor glides down the queue rows then smoothly to CSV button
          const p = easeInOut(Math.min(1, (s - 35.5) / 4.0));
          curX = lerp(110, 1720, p);
          curY = lerp(155, 120, p);
        }

        // Callout 4 appears (35.5s to 43.0s)
        if (s >= 35.5 && s < 43.0) {
          c4.style.opacity = "1";
          c4.style.transform = "translateY(0)";
        } else {
          c4.style.opacity = "0";
          c4.style.transform = "translateY(12px)";
        }
      }
      // ─────────────────────────────────────────────────────────────
      // ACT 5 (44.0s – 50.0s): EXECUTIVE STUDIO OUTRO
      // ─────────────────────────────────────────────────────────────
      else {
        c4.style.opacity = "0";
        if (outro) outro.style.opacity = "1";
      }

      app.style.transformOrigin = `${originX}% ${originY}%`;
      app.style.transform = `scale(${zoom})`;
      cursor.style.transform = `translate(${curX}px, ${curY}px)`;
    }, f, sec);

    // Dom triggers
    if (sec >= 10.8 && !playClicked) {
      playClicked = true;
      await page.evaluate(() => {
        const btn = document.getElementById("play-btn");
        if (btn) btn.click();
      });
    }

    if (sec >= 22.5 && !pointClicked) {
      pointClicked = true;
      await page.evaluate(() => {
        const playBtn = document.getElementById("play-btn");
        if (playBtn && playBtn.getAttribute("aria-label") === "หยุดลำดับเวลา") playBtn.click();
        const pt = document.querySelector("[data-point=\"R085C119\"]") || document.querySelector("#preview-table [data-point]");
        if (pt) pt.click();
      });
    }

    if (sec >= 34.8 && !queueViewClicked) {
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

    if (f % 100 === 0 || f === TOTAL_FRAMES - 1) {
      process.stdout.write(`\r  Captured frame ${f + 1}/${TOTAL_FRAMES} (${Math.round(((f + 1) / TOTAL_FRAMES) * 100)}%)...`);
    }
  }

  console.log("\n[4/5] Finishing video encoding...");
  ffmpeg.stdin.end();

  await new Promise((resolve) => ffmpeg.on("close", resolve));
  await browser.close();
  server.close();

  console.log("[5/5] Mixing Calm Keynote Tech Ambient Audio...");

  // High-end Apple Keynote / Linear style sound design:
  // - Warm, subtle sub-bass foundation (65Hz)
  // - Atmospheric acoustic/synthesizer resonance (130Hz)
  // - Gentle air texture
  const audioCommand = [
    "-y",
    "-i", RAW_VIDEO_PATH,
    "-f", "lavfi",
    "-i", `sine=frequency=65:duration=${DURATION_SEC}`,
    "-f", "lavfi",
    "-i", `sine=frequency=130:duration=${DURATION_SEC}`,
    "-f", "lavfi",
    "-i", `anoisesrc=d=${DURATION_SEC}:c=pink:r=44100`,
    "-filter_complex",
    "[1:a]volume=0.18,lowpass=f=100[sub];" +
    "[2:a]volume=0.08,chorus=0.7:0.9:55:0.4:0.25:2[mid];" +
    "[3:a]bandpass=f=1200:width_type=h:w=300,volume=0.025[air];" +
    "[sub][mid][air]amix=inputs=3:duration=first[bed];" +
    "[bed]afade=t=in:ss=0:d=1.5,afade=t=out:st=47:d=3,loudnorm=I=-16:TP=-1.5:LRA=11[aout]",
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

  console.log("\n✨ 50-Second Product Documentary Video generation complete!");
  console.log(`📁 Master Video: ${FINAL_VIDEO_PATH}`);
  console.log(`📁 Muted Video: ${MUTED_VIDEO_PATH}`);
});

