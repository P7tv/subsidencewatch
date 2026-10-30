import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";

const PORT = 4173;
const FPS = 30;
const DURATION_SEC = 24;
const TOTAL_FRAMES = FPS * DURATION_SEC; // 720 frames
const WIDTH = 1920;
const HEIGHT = 1080;

const OUTPUT_DIR = path.join(process.cwd(), "output_videos");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const RAW_VIDEO_PATH = path.join(OUTPUT_DIR, "demo_raw_big_white.mp4");
const FINAL_VIDEO_PATH = path.join(OUTPUT_DIR, "subsidencewatch_demo_16x9.mp4");
const MUTED_VIDEO_PATH = path.join(OUTPUT_DIR, "subsidencewatch_demo_16x9_muted.mp4");

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

  console.log("[2/5] Injecting Prominent Centered Minimal White Card (Keynote Banner)...");

  await page.evaluate(() => {
    const app = document.getElementById("app");
    app.style.transformOrigin = "50% 50%";
    app.style.transition = "transform 0.05s linear";

    // Custom Cursor
    const cursor = document.createElement("div");
    cursor.id = "demo-cursor";
    cursor.innerHTML = `
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.45));">
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
      transform: translate(500px, 400px);
    `;
    document.body.appendChild(cursor);

    // Click Ripple
    const ripple = document.createElement("div");
    ripple.id = "demo-ripple";
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

    // Prominent Centered Bottom Floating Island Card (Minimal White)
    const card = document.createElement("div");
    card.id = "demo-hero-card";
    card.style.cssText = `
      position: fixed;
      bottom: 32px;
      left: calc(50% + 117px);
      transform: translateX(-50%);
      width: 940px;
      background: #FFFFFF;
      border: 2px solid #E2E8F0;
      box-shadow: 0 25px 60px -12px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.04);
      border-radius: 22px;
      padding: 22px 36px;
      color: #0F172A;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "IBM Plex Sans Thai", sans-serif;
      z-index: 999990;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      transition: opacity 0.3s ease, transform 0.3s ease;
      opacity: 1;
    `;
    card.innerHTML = `
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
          <span id="card-dot" style="display: inline-block; width: 11px; height: 11px; border-radius: 50%; background: #10B981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);"></span>
          <span id="card-pill" style="font-size: 13px; font-weight: 800; letter-spacing: 2px; color: #164B45; text-transform: uppercase;">STEP 01 · DATA INGESTION</span>
        </div>
        <div id="card-title" style="font-size: 28px; font-weight: 800; color: #0F172A; letter-spacing: -0.6px; line-height: 1.25; margin-bottom: 4px;">
          3,900 จุดตรวจวัด Sentinel-1 InSAR
        </div>
        <div id="card-desc" style="font-size: 15.5px; font-weight: 500; color: #475569; line-height: 1.45;">
          ครอบคลุมพื้นที่สามเสน 5 × 5 กม. · ตรวจจับการเคลื่อนตัวรอบสถานีรถไฟฟ้า
        </div>
      </div>
      <div id="card-stat-box" style="background: #F1F5F9; border: 1.5px solid #CBD5E1; border-radius: 14px; padding: 14px 22px; text-align: center; white-space: nowrap; min-width: 140px;">
        <span id="card-stat-label" style="display: block; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">SATELLITE DATA</span>
        <strong id="card-stat-val" style="font-size: 22px; font-weight: 800; color: #0F172A;">64 PASSES</strong>
      </div>
    `;
    document.body.appendChild(card);

    // Clean Minimal Outro Overlay
    const outro = document.createElement("div");
    outro.id = "demo-outro-card";
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
      transition: opacity 0.6s ease;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "IBM Plex Sans Thai", sans-serif;
      color: #0F172A;
      text-align: center;
    `;
    outro.innerHTML = `
      <div style="width: 68px; height: 68px; border-radius: 20px; background: #164B45; display: grid; place-items: center; margin-bottom: 22px; box-shadow: 0 16px 36px rgba(22, 75, 69, 0.25);">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <h1 style="font-size: 46px; font-weight: 800; letter-spacing: -1.2px; margin: 0 0 12px 0; color: #0F172A;">
        SubsidenceWatch
      </h1>
      <p style="font-size: 20px; color: #475569; max-width: 660px; line-height: 1.6; margin: 0 0 28px 0; font-weight: 500;">
        ต้นแบบการสำรวจหลักฐานการเคลื่อนตัวของพื้นดิน<br>และจัดลำดับจุดลงตรวจ · พื้นที่สามเสน–วชิรพยาบาล
      </p>
      <div style="display: flex; gap: 14px; align-items: center; background: #F8FAFC; padding: 12px 26px; border-radius: 999px; border: 1.5px solid #E2E8F0; box-shadow: 0 4px 15px rgba(0,0,0,0.04);">
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #10B981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);"></span>
        <span style="font-size: 16px; font-weight: 600; color: #1E293B; font-family: monospace;">github.com/P7tv/subsidencewatch</span>
      </div>
    `;
    document.body.appendChild(outro);
  });

  console.log(`[3/5] Recording ${TOTAL_FRAMES} frames (${DURATION_SEC}s @ ${FPS}fps) - Prominent Big Card Edition...`);

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
  ]);

  ffmpeg.stderr.on("data", () => {});
  ffmpeg.on("error", (err) => console.error("FFmpeg error:", err));

  let playClicked = false;
  let pointClicked = false;
  let queueViewClicked = false;

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const sec = f / FPS;

    await page.evaluate((frame, s) => {
      const app = document.getElementById("app");
      const cursor = document.getElementById("demo-cursor");
      const ripple = document.getElementById("demo-ripple");
      const card = document.getElementById("demo-hero-card");
      const cardDot = document.getElementById("card-dot");
      const cardPill = document.getElementById("card-pill");
      const cardTitle = document.getElementById("card-title");
      const cardDesc = document.getElementById("card-desc");
      const cardStatBox = document.getElementById("card-stat-box");
      const cardStatLabel = document.getElementById("card-stat-label");
      const cardStatVal = document.getElementById("card-stat-val");
      const outro = document.getElementById("demo-outro-card");

      const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const lerp = (a, b, t) => a + (b - a) * t;

      let curX = 960;
      let curY = 540;
      let zoom = 1.0;
      let originX = 50;
      let originY = 50;

      // ─────────────────────────────────────────────────────────────
      // CARD 01 (0.0s – 5.5s): DATA INGESTION
      // ─────────────────────────────────────────────────────────────
      if (s < 5.5) {
        const p = easeInOut(Math.min(1, s / 2.8));
        window.scrollTo(0, lerp(0, 160, p));

        curX = lerp(1200, 780, p);
        curY = lerp(350, 480, p);

        cardDot.style.background = "#10B981";
        cardDot.style.boxShadow = "0 0 8px rgba(16, 185, 129, 0.7)";
        cardPill.textContent = "STEP 01 · DATA INGESTION";
        cardPill.style.color = "#164B45";
        cardTitle.textContent = "3,900 จุดตรวจวัด Sentinel-1 InSAR";
        cardDesc.textContent = "ครอบคลุมพื้นที่สามเสน 5 × 5 กม. · ตรวจจับการเคลื่อนตัวรอบสถานีรถไฟฟ้า";

        cardStatBox.style.background = "#F1F5F9";
        cardStatBox.style.borderColor = "#CBD5E1";
        cardStatLabel.textContent = "SATELLITE DATA";
        cardStatLabel.style.color = "#64748B";
        cardStatVal.textContent = "64 PASSES";
        cardStatVal.style.color = "#0F172A";

        if (s > 4.2) {
          const pp = easeInOut(Math.min(1, (s - 4.2) / 1.1));
          const playBtn = document.getElementById("play-btn");
          const bRect = playBtn ? playBtn.getBoundingClientRect() : { x: 289, y: 863, width: 29, height: 29 };
          curX = lerp(780, bRect.x + 14, pp);
          curY = lerp(480, bRect.y + 14, pp);
        }
      }
      // ─────────────────────────────────────────────────────────────
      // CARD 02 (5.5s – 14.5s): ANOMALY ENGINE & REPLAY
      // ─────────────────────────────────────────────────────────────
      else if (s < 14.5) {
        window.scrollTo(0, 160);

        cardDot.style.background = "#D97706";
        cardDot.style.boxShadow = "0 0 8px rgba(217, 119, 6, 0.7)";
        cardPill.textContent = "STEP 02 · ANOMALY ENGINE";
        cardPill.style.color = "#9A3412";
        cardTitle.textContent = "CUSUM Detection ย้อนหลัง 64 วันถ่าย";
        cardDesc.textContent = "ตรวจพบจุดทรุดตัว 6.9 mm/yr และแจ้งเตือนก่อนวันเกิดเหตุ";

        cardStatBox.style.background = "#FEF3C7";
        cardStatBox.style.borderColor = "#FDE68A";
        cardStatLabel.textContent = "SUBSIDENCE RATE";
        cardStatLabel.style.color = "#B45309";
        cardStatVal.textContent = "6.9 mm/yr";
        cardStatVal.style.color = "#92400E";

        const playBtn = document.getElementById("play-btn");
        const bRect = playBtn ? playBtn.getBoundingClientRect() : { x: 289, y: 863, width: 29, height: 29 };
        const playX = bRect.x + 14;
        const playY = bRect.y + 14;

        if (s < 6.4) {
          curX = playX;
          curY = playY;
          if (s >= 5.5 && s < 5.9) {
            ripple.style.left = `${playX}px`;
            ripple.style.top = `${playY}px`;
            ripple.style.transform = "translate(-50%, -50%) scale(1.6)";
            ripple.style.opacity = "0.8";
          } else {
            ripple.style.opacity = "0";
            ripple.style.transform = "translate(-50%, -50%) scale(0)";
          }
        } else if (s < 10.5) {
          // Dynamic camera zoom into the pulsing sinkhole during playback
          const zp = easeInOut(Math.min(1, (s - 6.4) / 2.0));
          zoom = lerp(1.0, 1.25, zp);
          originX = 42;
          originY = 55;

          const p = easeInOut(Math.min(1, (s - 6.4) / 2.5));
          curX = lerp(playX, 780, p);
          curY = lerp(playY, 620, p);
        } else {
          // Slide camera focus to the right panel LOS Displacement chart
          const zp = easeInOut(Math.min(1, (s - 10.5) / 1.0));
          zoom = lerp(1.25, 1.0, zp);
          originX = 42;
          originY = 55;

          const p = easeInOut(Math.min(1, (s - 10.5) / 1.5));
          curX = lerp(780, 1560, p);
          curY = lerp(620, 560, p);
        }
      }
      // ─────────────────────────────────────────────────────────────
      // CARD 03 (14.5s – 21.0s): FIELD ACTION & QUEUE
      // ─────────────────────────────────────────────────────────────
      else if (s < 21.0) {
        cardDot.style.background = "#0284C7";
        cardDot.style.boxShadow = "0 0 8px rgba(2, 132, 199, 0.7)";
        cardPill.textContent = "STEP 03 · FIELD ACTION";
        cardPill.style.color = "#0369A1";
        cardTitle.textContent = "Inspection Queue · จัดคิวทีมลงตรวจ";
        cardDesc.textContent = "จัดลำดับความเสี่ยง รพ. และถนนใหญ่ พร้อมส่งออก CSV";

        cardStatBox.style.background = "#E0F2FE";
        cardStatBox.style.borderColor = "#BAE6FD";
        cardStatLabel.textContent = "PRIORITY SITES";
        cardStatLabel.style.color = "#0284C7";
        cardStatVal.textContent = "162 SITES";
        cardStatVal.style.color = "#0369A1";

        if (s < 16.0) {
          const p = easeInOut(Math.min(1, (s - 14.5) / 1.2));
          curX = lerp(1560, 110, p);
          curY = lerp(560, 155, p);
        } else if (s < 17.0) {
          curX = 110;
          curY = 155;
          if (s >= 16.0 && s < 16.4) {
            ripple.style.left = "110px";
            ripple.style.top = "155px";
            ripple.style.transform = "translate(-50%, -50%) scale(1.6)";
            ripple.style.opacity = "0.8";
          } else {
            ripple.style.opacity = "0";
            ripple.style.transform = "translate(-50%, -50%) scale(0)";
          }
        } else {
          // In Queue View: Glide to CSV export button
          window.scrollTo(0, 0);
          const p = easeInOut(Math.min(1, (s - 17.0) / 1.8));
          curX = lerp(110, 1720, p);
          curY = lerp(155, 120, p);
        }
      }
      // ─────────────────────────────────────────────────────────────
      // OUTRO CARD (21.0s – 24.0s)
      // ─────────────────────────────────────────────────────────────
      else {
        outro.style.opacity = "1";
        if (card) card.style.opacity = "0";
      }

      app.style.transformOrigin = `${originX}% ${originY}%`;
      app.style.transform = `scale(${zoom})`;
      cursor.style.transform = `translate(${curX}px, ${curY}px)`;
    }, f, sec);

    // Dom triggers
    if (sec >= 5.5 && !playClicked) {
      playClicked = true;
      await page.evaluate(() => {
        const btn = document.getElementById("play-btn");
        if (btn) btn.click();
      });
    }

    if (sec >= 11.0 && !pointClicked) {
      pointClicked = true;
      await page.evaluate(() => {
        const playBtn = document.getElementById("play-btn");
        if (playBtn && playBtn.getAttribute("aria-label") === "หยุดลำดับเวลา") playBtn.click();
        const pt = document.querySelector("[data-point=\"R085C119\"]") || document.querySelector("#preview-table [data-point]");
        if (pt) pt.click();
      });
    }

    if (sec >= 16.1 && !queueViewClicked) {
      queueViewClicked = true;
      await page.evaluate(() => {
        const qBtn = document.querySelector(".nav[data-view=\"queue\"]");
        if (qBtn) qBtn.click();
      });
    }

    const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 85 });
    ffmpeg.stdin.write(screenshotBuffer);

    if (f % 75 === 0 || f === TOTAL_FRAMES - 1) {
      process.stdout.write(`\r  Captured frame ${f + 1}/${TOTAL_FRAMES} (${Math.round(((f + 1) / TOTAL_FRAMES) * 100)}%)...`);
    }
  }

  console.log("\n[4/5] Finishing video encoding...");
  ffmpeg.stdin.end();

  await new Promise((resolve) => ffmpeg.on("close", resolve));
  await browser.close();
  server.close();

  console.log("[5/5] Mixing ambient tech audio with click sound design...");

  const audioCommand = [
    "-y",
    "-i", RAW_VIDEO_PATH,
    "-f", "lavfi",
    "-i", `sine=frequency=110:duration=${DURATION_SEC}`,
    "-f", "lavfi",
    "-i", `sine=frequency=220:duration=${DURATION_SEC}`,
    "-f", "lavfi",
    "-i", `anoisesrc=d=${DURATION_SEC}:c=pink:r=44100`,
    "-filter_complex",
    "[1:a]volume=0.20[sub];" +
    "[2:a]volume=0.08,chorus=0.7:0.9:55:0.4:0.25:2[mid];" +
    "[3:a]bandpass=f=1200:width_type=h:w=300,volume=0.03[hats];" +
    "[sub][mid][hats]amix=inputs=3:duration=first[bed];" +
    "[bed]afade=t=in:ss=0:d=1.5,afade=t=out:st=22:d=2,loudnorm=I=-16:TP=-1.5:LRA=11[aout]",
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

  console.log("\n✨ Prominent Bottom Card Video generation complete!");
  console.log(`📁 Master Video: ${FINAL_VIDEO_PATH}`);
  console.log(`📁 Muted Video: ${MUTED_VIDEO_PATH}`);
});
