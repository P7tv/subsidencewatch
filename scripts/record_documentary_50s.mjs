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
        box-shadow: 0 24px 50px -10px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.04);
        border-radius: 18px;
        padding: 20px 24px;
        color: #0F172A;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "IBM Plex Sans Thai", sans-serif;
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
    createCallout("callout-1", "left: 280px; top: 120px; width: 440px;", `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #10B981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);"></span>
        <span style="font-size: 12px; font-weight: 800; letter-spacing: 1.5px; color: #164B45; text-transform: uppercase;">01 · SATELLITE INGESTION</span>
      </div>
      <div style="font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px; line-height: 1.3; margin-bottom: 4px;">
        3,900 จุดตรวจวัด Sentinel-1 InSAR
      </div>
      <div style="font-size: 14.5px; font-weight: 500; color: #475569; line-height: 1.45;">
        ครอบคลุมพื้นที่สามเสน 5 × 5 กม. · ตรวจจับการเคลื่อนตัวระดับมิลลิเมตรจากภาพเรดาร์ C-band
      </div>
      <!-- Pointer pointing down -->
      <div style="position: absolute; bottom: -11px; left: 60px; width: 20px; height: 11px; overflow: hidden;">
        <div style="width: 14px; height: 14px; background: #FFFFFF; border-right: 1.5px solid #E2E8F0; border-bottom: 1.5px solid #E2E8F0; transform: rotate(45deg) translate(-5px, -5px);"></div>
      </div>
    `);

    // ─────────────────────────────────────────────────────────────
    // CALLOUT 2: ACT 2 - TIMELINE REPLAY (Bottom-Left beside scrubber)
    // ─────────────────────────────────────────────────────────────
    createCallout("callout-2", "left: 380px; bottom: 80px; width: 480px;", `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #EF4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);"></span>
        <span style="font-size: 12px; font-weight: 800; letter-spacing: 1.5px; color: #991B1B; text-transform: uppercase;">02 · INCIDENT REPLAY (64 PASSES)</span>
      </div>
      <div style="font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px; line-height: 1.3; margin-bottom: 4px;">
        Replay ย้อนหลัง 64 วันถ่ายดาวเทียม
      </div>
      <div style="font-size: 14.5px; font-weight: 500; color: #475569; line-height: 1.45;">
        สังเกตพิกัดถนนสามเสน (วงแหวนสีแดงกะพริบ) เริ่มส่งสัญญาณการทรุดตัวสะสมชัดเจน
      </div>
      <!-- Pointer pointing down-left -->
      <div style="position: absolute; bottom: 20px; left: -11px; width: 11px; height: 20px; overflow: hidden;">
        <div style="width: 14px; height: 14px; background: #FFFFFF; border-left: 1.5px solid #E2E8F0; border-bottom: 1.5px solid #E2E8F0; transform: rotate(45deg) translate(2px, 2px);"></div>
      </div>
    `);

    // ─────────────────────────────────────────────────────────────
    // CALLOUT 3: ACT 3 - LOS DISPLACEMENT & CUSUM (Pointing right at chart)
    // ─────────────────────────────────────────────────────────────
    createCallout("callout-3", "right: 480px; top: 520px; width: 460px;", `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #D97706; box-shadow: 0 0 8px rgba(217, 119, 6, 0.7);"></span>
        <span style="font-size: 12px; font-weight: 800; letter-spacing: 1.5px; color: #9A3412; text-transform: uppercase;">03 · CUSUM ANOMALY DETECTION</span>
      </div>
      <div style="font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px; line-height: 1.3; margin-bottom: 4px;">
        อัตราการทรุดตัวสะสม -6.9 mm/yr
      </div>
      <div style="font-size: 14.5px; font-weight: 500; color: #475569; line-height: 1.45;">
        ตรวจพบสัญญาณเตือนก่อนวันเกิดเหตุจริง · บริเวณนี้ผิดปกติกว่า 93% ของพื้นที่ควบคุม
      </div>
      <!-- Pointer pointing right -->
      <div style="position: absolute; top: 32px; right: -11px; width: 11px; height: 20px; overflow: hidden;">
        <div style="width: 14px; height: 14px; background: #FFFFFF; border-top: 1.5px solid #E2E8F0; border-right: 1.5px solid #E2E8F0; transform: rotate(45deg) translate(-2px, -2px);"></div>
      </div>
    `);

    // ─────────────────────────────────────────────────────────────
    // CALLOUT 4: ACT 4 - ACTIONABLE INSPECTION QUEUE (Pointing down at table)
    // ─────────────────────────────────────────────────────────────
    createCallout("callout-4", "left: 450px; top: 180px; width: 490px;", `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #0284C7; box-shadow: 0 0 8px rgba(2, 132, 199, 0.7);"></span>
        <span style="font-size: 12px; font-weight: 800; letter-spacing: 1.5px; color: #0369A1; text-transform: uppercase;">04 · ACTIONABLE CITY SAFETY</span>
      </div>
      <div style="font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px; line-height: 1.3; margin-bottom: 4px;">
        จัดคิวลงตรวจ 162 จุดเสี่ยง (Inspection Queue)
      </div>
      <div style="font-size: 14.5px; font-weight: 500; color: #475569; line-height: 1.45;">
        ถ่วงน้ำหนักความสำคัญ รพ. และถนนใหญ่ · พร้อม Export CSV ให้วิศวกร กทม. นำไปใช้งานทันที
      </div>
      <!-- Pointer pointing down -->
      <div style="position: absolute; bottom: -11px; left: 80px; width: 20px; height: 11px; overflow: hidden;">
        <div style="width: 14px; height: 14px; background: #FFFFFF; border-right: 1.5px solid #E2E8F0; border-bottom: 1.5px solid #E2E8F0; transform: rotate(45deg) translate(-5px, -5px);"></div>
      </div>
    `);

    // ─────────────────────────────────────────────────────────────
    // ACT 5: EXECUTIVE STUDIO OUTRO
    // ─────────────────────────────────────────────────────────────
    const outro = document.createElement("div");
    outro.id = "doc-outro";
    outro.style.cssText = `
      position: fixed;
      inset: 0;
      background: #FFFFFF;
      z-index: 1000000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.8s ease;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "IBM Plex Sans Thai", sans-serif;
      color: #0F172A;
      text-align: center;
    `;
    outro.innerHTML = `
      <div style="width: 72px; height: 72px; border-radius: 22px; background: #164B45; display: grid; place-items: center; margin-bottom: 24px; box-shadow: 0 20px 40px rgba(22, 75, 69, 0.25);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <h1 style="font-size: 50px; font-weight: 900; letter-spacing: -1.2px; margin: 0 0 12px 0; color: #0F172A;">
        SubsidenceWatch
      </h1>
      <p style="font-size: 21px; color: #475569; max-width: 680px; line-height: 1.6; margin: 0 0 32px 0; font-weight: 500;">
        ต้นแบบการสำรวจหลักฐานการเคลื่อนตัวของพื้นดิน<br>และจัดลำดับจุดลงตรวจ · พื้นที่สามเสน–วชิรพยาบาล
      </p>
      <div style="display: flex; gap: 16px; align-items: center; background: #F8FAFC; padding: 14px 28px; border-radius: 999px; border: 1.5px solid #E2E8F0; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #10B981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);"></span>
        <span style="font-size: 16px; font-weight: 600; color: #1E293B; font-family: monospace;">github.com/P7tv/subsidencewatch</span>
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

