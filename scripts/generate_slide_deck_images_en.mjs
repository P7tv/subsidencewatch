import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const PORT = 4174;
const OUTPUT_DIR = path.join(process.cwd(), "output_slides");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Static server for app and captured assets
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
      ".jpg": "image/jpeg",
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
  console.log(`[1/4] Server running on http://127.0.0.1:${PORT}`);

  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1920,1080"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 }); // 2x Retina sharpness

  console.log("[2/4] Capturing UI components from live app...");
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForSelector("#play-btn", { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Select Vajira Point R085C119
  await page.evaluate(() => {
    const pt = document.querySelector("[data-point=\"R085C119\"]") || document.querySelector("#preview-table [data-point]");
    if (pt) pt.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const capDashboardPath = path.join(process.cwd(), "dist", "cap_dashboard.png");
  await page.screenshot({ path: capDashboardPath, type: "png" });

  // Capture close-up of map + chart
  await page.evaluate(() => {
    window.scrollTo(0, 160);
  });
  await new Promise(r => setTimeout(r, 500));
  const capEvidencePath = path.join(process.cwd(), "dist", "cap_evidence.png");
  await page.screenshot({ path: capEvidencePath, type: "png" });

  // Switch to Queue View
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const qBtn = document.querySelector(".nav[data-view=\"queue\"]");
    if (qBtn) qBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  const capQueuePath = path.join(process.cwd(), "dist", "cap_queue.png");
  await page.screenshot({ path: capQueuePath, type: "png" });

  // ─────────────────────────────────────────────────────────────
  // SLIDE 1: SUBSIDENCEWATCH BKK - HOW IT WORKS (MATCHING ATTACHED THEME)
  // ─────────────────────────────────────────────────────────────
  console.log("[3/4] Generating Slide 1: How It Works (BKK Dark Theme)...");
  const slide1Html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 1920px;
          height: 1080px;
          background: #0B1325;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          color: #FFFFFF;
          padding: 60px 80px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        /* Subtle city skyline backdrop effect */
        .skyline-bg {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 240px;
          background: linear-gradient(180deg, transparent 0%, rgba(14, 28, 54, 0.45) 50%, rgba(10, 20, 40, 0.85) 100%);
          pointer-events: none;
          z-index: 1;
        }
        .header {
          position: relative;
          z-index: 2;
        }
        .brand-title {
          font-size: 56px;
          font-weight: 900;
          letter-spacing: -1.2px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .brand-bkk {
          color: #00E5FF;
          text-shadow: 0 0 35px rgba(0, 229, 255, 0.6);
        }
        .subtitle {
          font-size: 26px;
          color: #94A3B8;
          font-weight: 500;
          margin-top: 8px;
          letter-spacing: -0.3px;
        }
        .cards-row {
          display: grid;
          grid-template-columns: 1fr 40px 1fr 40px 1fr;
          align-items: center;
          gap: 0;
          margin: 40px 0;
          position: relative;
          z-index: 2;
        }
        .step-card {
          background: rgba(15, 30, 54, 0.85);
          border: 1.5px solid rgba(0, 229, 255, 0.28);
          border-radius: 24px;
          padding: 34px 28px;
          height: 480px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
        }
        .step-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .step-badge {
          background: rgba(0, 229, 255, 0.15);
          color: #00E5FF;
          font-size: 13px;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 999px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .step-title {
          font-size: 28px;
          font-weight: 800;
          color: #FFFFFF;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
        }
        .step-desc {
          font-size: 18px;
          color: #CBD5E1;
          line-height: 1.55;
          font-weight: 500;
        }
        .step-visual {
          width: 100%;
          height: 200px;
          border-radius: 16px;
          background: #091220;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .step-arrow {
          font-size: 32px;
          color: #00E5FF;
          text-align: center;
          font-weight: 900;
          text-shadow: 0 0 15px rgba(0, 229, 255, 0.8);
        }
        .footer-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 2;
        }
        .pilot-pill {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(14, 28, 54, 0.9);
          border: 1.5px solid #00E5FF;
          border-radius: 999px;
          padding: 12px 28px;
          font-size: 18px;
          font-weight: 700;
          color: #FFFFFF;
          box-shadow: 0 0 25px rgba(0, 229, 255, 0.25);
        }
        .pilot-icon {
          color: #00E5FF;
          font-size: 20px;
        }
        .cta-note {
          font-size: 22px;
          font-weight: 700;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cta-arrow {
          color: #00E5FF;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="skyline-bg"></div>

      <div class="header">
        <h1 class="brand-title">
          <span>SubsidenceWatch</span>
          <span class="brand-bkk">BKK</span>
        </h1>
        <p class="subtitle">Satellite-based ground-motion monitoring for urban safety</p>
      </div>

      <div class="cards-row">
        <!-- Card 1 -->
        <div class="step-card">
          <div>
            <div class="step-header">
              <span class="step-badge">STEP 1</span>
            </div>
            <h2 class="step-title">Satellite radar images</h2>
            <p class="step-desc">European Sentinel-1 radar satellites scan Bangkok every 6–12 days through clouds and rain.</p>
          </div>
          <div class="step-visual">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
              <svg width="72" height="72" viewBox="0 0 68 68" fill="none">
                <!-- Radar cone -->
                <path d="M34 26 L12 62 L56 62 Z" fill="url(#radarConeGrad)" opacity="0.45"/>
                <path d="M18 52 Q34 56 50 52" stroke="#00E5FF" stroke-width="2" stroke-dasharray="4 3" opacity="0.8"/>
                <path d="M24 44 Q34 47 44 44" stroke="#00E5FF" stroke-width="1.8" stroke-dasharray="3 2" opacity="0.9"/>
                <!-- Satellite Body -->
                <rect x="30" y="16" width="8" height="12" rx="2" fill="#00E5FF"/>
                <!-- Solar Panels -->
                <rect x="13" y="19" width="14" height="6" rx="1.5" fill="#38BDF8" stroke="#0284C7" stroke-width="1.2"/>
                <rect x="41" y="19" width="14" height="6" rx="1.5" fill="#38BDF8" stroke="#0284C7" stroke-width="1.2"/>
                <line x1="27" y1="22" x2="30" y2="22" stroke="#FFFFFF" stroke-width="2"/>
                <line x1="38" y1="22" x2="41" y2="22" stroke="#FFFFFF" stroke-width="2"/>
                <!-- Satellite Dish/Antenna -->
                <path d="M34 28 L34 32" stroke="#00E5FF" stroke-width="2.5" stroke-linecap="round"/>
                <circle cx="34" cy="33" r="2.5" fill="#00E5FF"/>
                <defs>
                  <linearGradient id="radarConeGrad" x1="34" y1="26" x2="34" y2="62" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.7"/>
                    <stop offset="100%" stop-color="#00E5FF" stop-opacity="0.05"/>
                  </linearGradient>
                </defs>
              </svg>
              <div style="text-align: center;">
                <strong style="font-size: 20px; color: #00E5FF; display: block; font-weight: 800;">3,900 Radar Points</strong>
                <span style="font-size: 14px; color: #94A3B8; font-weight: 500;">Samsen 5 × 5 km Grid</span>
              </div>
            </div>
          </div>
        </div>

        <div class="step-arrow">➔</div>

        <!-- Card 2 -->
        <div class="step-card">
          <div>
            <div class="step-header">
              <span class="step-badge" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B;">STEP 2</span>
            </div>
            <h2 class="step-title">Track ground movement</h2>
            <p class="step-desc">InSAR algorithms calculate millimeter-scale elevation changes across 64 historical satellite passes.</p>
          </div>
          <div class="step-visual">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
              <svg width="180" height="74" viewBox="0 0 180 74" fill="none">
                <!-- Stacked Isometric City Layers -->
                <path d="M25 16 L90 5 L155 16 L90 27 Z" fill="rgba(56, 189, 248, 0.16)" stroke="#38BDF8" stroke-width="1.4"/>
                <path d="M25 28 L90 17 L155 28 L90 39 Z" fill="rgba(148, 163, 184, 0.14)" stroke="#94A3B8" stroke-width="1.2"/>
                <path d="M25 40 L90 29 L155 40 L90 51 Z" fill="rgba(245, 158, 11, 0.18)" stroke="#F59E0B" stroke-width="1.4"/>
                <!-- Dipping trend line below layers -->
                <path d="M25 64 Q65 64 90 60 T130 46 T155 35" stroke="#F59E0B" stroke-width="2.6" stroke-linecap="round"/>
                <circle cx="130" cy="46" r="4.5" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.8"/>
              </svg>
              <div style="text-align: center;">
                <strong style="font-size: 21px; color: #F59E0B; display: block; font-weight: 800;">-6.9 mm / year</strong>
                <span style="font-size: 14px; color: #94A3B8; font-weight: 500;">LOS Velocity Trend</span>
              </div>
            </div>
          </div>
        </div>

        <div class="step-arrow">➔</div>

        <!-- Card 3 -->
        <div class="step-card">
          <div>
            <div class="step-header">
              <span class="step-badge" style="background: rgba(239, 68, 68, 0.15); color: #EF4444;">STEP 3</span>
            </div>
            <h2 class="step-title">Flag unusual patterns</h2>
            <p class="step-desc">Statistical CUSUM engine automatically flags dangerous sinking zones for engineering review.</p>
          </div>
          <div class="step-visual">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
              <svg width="180" height="74" viewBox="0 0 180 74" fill="none">
                <!-- Baseline Wave -->
                <path d="M15 36 Q45 28 75 34 T120 32" stroke="#64748B" stroke-width="2.5" stroke-linecap="round"/>
                <!-- Severe drop curve -->
                <path d="M120 32 Q136 34 150 50 T168 62" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>
                <!-- Glowing alert marker -->
                <circle cx="138" cy="40" r="14" fill="rgba(239, 68, 68, 0.22)"/>
                <circle cx="138" cy="40" r="8" fill="rgba(239, 68, 68, 0.45)"/>
                <circle cx="138" cy="40" r="4.5" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.6"/>
                <text x="12" y="64" fill="#94A3B8" font-size="11.5" font-weight="600" font-family="'Plus Jakarta Sans', sans-serif">For engineering review</text>
              </svg>
              <div style="text-align: center;">
                <strong style="font-size: 21px; color: #EF4444; display: block; font-weight: 800;">162 Target Sites</strong>
                <span style="font-size: 14px; color: #94A3B8; font-weight: 500;">Ranked for BMA Inspection</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bar">
        <div class="pilot-pill">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>Pilot area: Samsen, Bangkok (Vajira Hospital)</span>
        </div>
        <div class="cta-note">
          <span>Let us show you how it works</span>
          <span class="cta-arrow">➔</span>
        </div>
      </div>
    </body>
    </html>
  `;
  await page.setContent(slide1Html);
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "slide_01_hero_dashboard.png"), type: "png" });

  // ─────────────────────────────────────────────────────────────
  // SLIDE 2: THE SMOKING GUN - SAMSEN SINKHOLE EVIDENCE (ELI5 & LARGE TEXT)
  // ─────────────────────────────────────────────────────────────
  console.log("[3/4] Generating Slide 2: Samsen Evidence (Large Text)...");
  const slide2Html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 1920px;
          height: 1080px;
          background: #0B1325;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          color: #FFFFFF;
          padding: 60px 80px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 24px;
        }
        .tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid #EF4444;
          color: #FCA5A5;
          font-size: 14px;
          font-weight: 800;
          padding: 6px 16px;
          border-radius: 999px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .title {
          font-size: 48px;
          font-weight: 900;
          letter-spacing: -1px;
        }
        .subtitle {
          font-size: 22px;
          color: #94A3B8;
          margin-top: 6px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
          margin: 32px 0;
        }
        .stat-card {
          background: rgba(15, 30, 54, 0.85);
          border: 1.5px solid rgba(0, 229, 255, 0.25);
          border-radius: 22px;
          padding: 28px 32px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }
        .stat-card.alert {
          border-color: #EF4444;
          background: rgba(45, 15, 20, 0.65);
        }
        .stat-label {
          font-size: 15px;
          font-weight: 800;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        .stat-val {
          font-size: 54px;
          font-weight: 900;
          color: #FFFFFF;
          margin: 6px 0;
          letter-spacing: -1.5px;
        }
        .stat-desc {
          font-size: 16px;
          color: #CBD5E1;
          font-weight: 500;
        }
        .content-split {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 36px;
          flex: 1;
        }
        .preview-box {
          background: #091220;
          border-radius: 22px;
          border: 1.5px solid rgba(0, 229, 255, 0.3);
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
        }
        .preview-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }
        .takeaways {
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          background: rgba(15, 30, 54, 0.8);
          border: 1.5px solid rgba(0, 229, 255, 0.25);
          border-radius: 22px;
          padding: 32px;
        }
        .takeaway-item {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }
        .takeaway-num {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(0, 229, 255, 0.15);
          border: 1.5px solid #00E5FF;
          color: #00E5FF;
          font-size: 20px;
          font-weight: 900;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .takeaway-text h3 {
          font-size: 22px;
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 6px;
        }
        .takeaway-text p {
          font-size: 17px;
          color: #94A3B8;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="tag-pill">● GROUND TRUTH VALIDATION · SAMSEN ROAD</div>
          <h1 class="title">The Evidence: Samsen Road Sinkhole (24 Sept 2025)</h1>
          <p class="subtitle">Did the satellite see the ground collapse before it happened?</p>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 18px; font-weight: 800; color: #00E5FF;">13.781°N, 100.510°E</span><br>
          <span style="font-size: 15px; color: #94A3B8;">Samsen MRT / Vajira Hospital</span>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Satellite Observations</div>
          <div class="stat-val">64 Passes</div>
          <div class="stat-desc">Jan 2024 to morning of collapse (23 Sept 2025)</div>
        </div>
        <div class="stat-card alert">
          <div class="stat-label" style="color: #FCA5A5;">Subsidence Speed</div>
          <div class="stat-val" style="color: #EF4444;">-6.9 mm/yr</div>
          <div class="stat-desc">Steady downward movement away from satellite</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Anomaly Severity</div>
          <div class="stat-val" style="color: #00E5FF;">Top 93%</div>
          <div class="stat-desc">More anomalous than 93% of surrounding control areas</div>
        </div>
      </div>

      <div class="content-split">
        <div class="preview-box">
          <img src="http://127.0.0.1:${PORT}/cap_evidence.png">
        </div>

        <div class="takeaways">
          <div class="takeaway-item">
            <div class="takeaway-num">1</div>
            <div class="takeaway-text">
              <h3>Detected Months Before Collapse</h3>
              <p>The CUSUM anomaly engine detected a statistically significant departure from baseline well before the road collapsed.</p>
            </div>
          </div>
          <div class="takeaway-item">
            <div class="takeaway-num">2</div>
            <div class="takeaway-text">
              <h3>Radar Coherence Lost at Epicenter</h3>
              <p>Phase coherence dropped sharply within 300 meters of the station, pinpointing the exact ground disturbance.</p>
            </div>
          </div>
          <div class="takeaway-item">
            <div class="takeaway-num">3</div>
            <div class="takeaway-text">
              <h3>100% Transparent & Scientific</h3>
              <p>Built on open-source MintPy time-series processing — fully reproducible by city engineers and universities.</p>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  await page.setContent(slide2Html);
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "slide_02_smoking_gun_samsen.png"), type: "png" });

  // ─────────────────────────────────────────────────────────────
  // SLIDE 3: ACTIONABLE INSPECTION QUEUE (ELI5 & LARGE TEXT)
  // ─────────────────────────────────────────────────────────────
  console.log("[3/4] Generating Slide 3: Inspection Queue (Large Text)...");
  const slide3Html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 1920px;
          height: 1080px;
          background: #0B1325;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          color: #FFFFFF;
          padding: 60px 80px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 24px;
        }
        .tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 229, 255, 0.15);
          border: 1px solid #00E5FF;
          color: #00E5FF;
          font-size: 14px;
          font-weight: 800;
          padding: 6px 16px;
          border-radius: 999px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .title {
          font-size: 48px;
          font-weight: 900;
          letter-spacing: -1px;
        }
        .subtitle {
          font-size: 22px;
          color: #94A3B8;
          margin-top: 6px;
        }
        .layout-grid {
          display: grid;
          grid-template-columns: 1.25fr 0.75fr;
          gap: 36px;
          margin-top: 32px;
          flex: 1;
        }
        .queue-box {
          background: #091220;
          border-radius: 22px;
          border: 1.5px solid rgba(0, 229, 255, 0.3);
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
        }
        .queue-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }
        .values-column {
          display: flex;
          flex-direction: column;
          gap: 22px;
          justify-content: center;
        }
        .value-card {
          background: rgba(15, 30, 54, 0.85);
          border: 1.5px solid rgba(0, 229, 255, 0.25);
          border-radius: 20px;
          padding: 26px 30px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
        }
        .value-card h3 {
          font-size: 23px;
          font-weight: 800;
          color: #00E5FF;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .value-card p {
          font-size: 17px;
          color: #CBD5E1;
          line-height: 1.55;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="tag-pill">● ACTIONABLE CITY SAFETY</div>
          <h1 class="title">From Space Data to City Action: The Inspection Queue</h1>
          <p class="subtitle">Turning 3,900 raw radar dots into a prioritized task list for Bangkok engineers</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 38px; font-weight: 900; color: #00E5FF;">162 Target Sites</div>
          <span style="font-size: 15px; color: #94A3B8;">Filtered via 95th Percentile CUSUM</span>
        </div>
      </div>

      <div class="layout-grid">
        <div class="queue-box">
          <img src="http://127.0.0.1:${PORT}/cap_queue.png">
        </div>

        <div class="values-column">
          <div class="value-card">
            <h3 style="display: flex; align-items: center; gap: 10px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 6v12M6 12h12"/>
                <path d="M3 21h18"/>
                <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
              </svg>
              <span>1. Life-Critical Context Weighting</span>
            </h3>
            <p>Hospitals (Weight 1.0) and major arterial roads (Weight 0.65) rank highest. City resources immediately focus where ground failure threatens lives.</p>
          </div>
          <div class="value-card">
            <h3 style="display: flex; align-items: center; gap: 10px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>2. One-Click CSV Export for Field Teams</span>
            </h3>
            <p>Engineers can export complete GPS coordinates, velocity rates, and risk scores in one click to load into field leveling or GPR radar trucks.</p>
          </div>
          <div class="value-card">
            <h3 style="display: flex; align-items: center; gap: 10px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span>3. Cuts Survey Costs by 90%</span>
            </h3>
            <p>Instead of blind random road drilling across square kilometers, engineers inspect only the 162 pre-flagged danger hotspots.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  await page.setContent(slide3Html);
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "slide_03_actionable_inspection_queue.png"), type: "png" });

  // ─────────────────────────────────────────────────────────────
  // SLIDE 4: SYSTEM ARCHITECTURE - HOW IT WORKS (ELI5 & LARGE TEXT)
  // ─────────────────────────────────────────────────────────────
  console.log("[3/4] Generating Slide 4: System Architecture (Large Text)...");
  const slide4Html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 1920px;
          height: 1080px;
          background: #0B1325;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          color: #FFFFFF;
          padding: 60px 80px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 24px;
        }
        .tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 229, 255, 0.15);
          border: 1px solid #00E5FF;
          color: #00E5FF;
          font-size: 14px;
          font-weight: 800;
          padding: 6px 16px;
          border-radius: 999px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .title {
          font-size: 48px;
          font-weight: 900;
          letter-spacing: -1px;
        }
        .subtitle {
          font-size: 22px;
          color: #94A3B8;
          margin-top: 6px;
        }
        .pipeline-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 20px;
          margin: 40px 0;
          flex: 1;
        }
        .step-box {
          background: rgba(15, 30, 54, 0.85);
          border: 1.5px solid rgba(0, 229, 255, 0.25);
          border-radius: 24px;
          padding: 32px 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }
        .step-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 800;
          color: #00E5FF;
          letter-spacing: 1px;
        }
        .step-icon {
          font-size: 48px;
          margin: 16px 0;
        }
        .step-head {
          font-size: 23px;
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 8px;
        }
        .step-sub {
          font-size: 15px;
          color: #94A3B8;
          line-height: 1.55;
        }
        .step-tag {
          display: inline-block;
          font-size: 12.5px;
          font-weight: 700;
          color: #00E5FF;
          background: rgba(0, 229, 255, 0.12);
          padding: 4px 10px;
          border-radius: 6px;
          margin-top: 12px;
        }
        .bottom-banner {
          background: rgba(15, 30, 54, 0.9);
          border: 1.5px solid rgba(0, 229, 255, 0.35);
          border-radius: 20px;
          padding: 22px 36px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .banner-item strong {
          display: block;
          font-size: 19px;
          color: #FFFFFF;
          margin-bottom: 2px;
        }
        .banner-item span {
          font-size: 15px;
          color: #94A3B8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="tag-pill">● END-TO-END DATA FLOW</div>
          <h1 class="title">How It Works: Space-to-Ground Architecture</h1>
          <p class="subtitle">From European Space Agency radar imagery directly to city safety action</p>
        </div>
        <div style="text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 15px; color: #64748B;">
          OPEN SOURCE STACK<br>
          GISTDA · ESA · MINT-PY
        </div>
      </div>

      <div class="pipeline-row">
        <!-- 1 -->
        <div class="step-box">
          <div>
            <span class="step-num">01 · INGEST</span>
            <div class="step-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 10a7.5 7.5 0 0 0 10 10"/>
                <path d="M4 6a11.5 11.5 0 0 0 14 14"/>
                <path d="M4 2a15.5 15.5 0 0 0 18 18"/>
                <circle cx="4" cy="20" r="2"/>
              </svg>
            </div>
            <div class="step-head">Sentinel-1 SAR</div>
            <p class="step-sub">Free satellite radar scans through clouds every 6–12 days across Bangkok.</p>
          </div>
          <span class="step-tag">64 Radar Passes</span>
        </div>

        <!-- 2 -->
        <div class="step-box">
          <div>
            <span class="step-num">02 · PROCESS</span>
            <div class="step-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
                <rect x="9" y="9" width="6" height="6"/>
                <line x1="9" y1="1" x2="9" y2="4"/>
                <line x1="15" y1="1" x2="15" y2="4"/>
                <line x1="9" y1="20" x2="9" y2="23"/>
                <line x1="15" y1="20" x2="15" y2="23"/>
                <line x1="20" y1="9" x2="23" y2="9"/>
                <line x1="20" y1="14" x2="23" y2="14"/>
                <line x1="1" y1="9" x2="4" y2="9"/>
                <line x1="1" y1="14" x2="4" y2="14"/>
              </svg>
            </div>
            <div class="step-head">HyP3 InSAR</div>
            <p class="step-sub">Computes phase coherence pairs and removes orbital atmospheric distortion.</p>
          </div>
          <span class="step-tag">Coherence ≥ 0.65</span>
        </div>

        <!-- 3 -->
        <div class="step-box">
          <div>
            <span class="step-num">03 · TRACK</span>
            <div class="step-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div class="step-head">MintPy PSI</div>
            <p class="step-sub">Inverts interferograms into millimeter-precision displacement time-series.</p>
          </div>
          <span class="step-tag">3,900 Valid Points</span>
        </div>

        <!-- 4 -->
        <div class="step-box">
          <div>
            <span class="step-num">04 · DETECT</span>
            <div class="step-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div class="step-head">CUSUM AI</div>
            <p class="step-sub">Statistical anomaly detector benchmarks against surrounding control areas.</p>
          </div>
          <span class="step-tag">-6.9 mm/yr Alarm</span>
        </div>

        <!-- 5 -->
        <div class="step-box">
          <div>
            <span class="step-num">05 · DISPATCH</span>
            <div class="step-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                <polyline points="9 14 12 17 17 12"/>
              </svg>
            </div>
            <div class="step-head">BMA Queue</div>
            <p class="step-sub">Prioritizes hospitals and roads; exports CSV for immediate engineering inspection.</p>
          </div>
          <span class="step-tag">162 Field Sites</span>
        </div>
      </div>

      <div class="bottom-banner">
        <div class="banner-item">
          <strong style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            <span>100% Free Satellite Data</span>
          </strong>
          <span>Zero sensor hardware installation costs required.</span>
        </div>
        <div class="banner-item">
          <strong style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span>Instantly Scalable Citywide</span>
          </strong>
          <span>Can be deployed to all 50 Bangkok districts immediately.</span>
        </div>
        <div class="banner-item">
          <strong style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <span>Runs in Any Web Browser</span>
          </strong>
          <span>No heavy backend server needed — fast client-side analysis.</span>
        </div>
      </div>
    </body>
    </html>
  `;
  await page.setContent(slide4Html);
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "slide_04_system_architecture.png"), type: "png" });

  console.log("[4/4] Slide generation completed successfully!");
  console.log(`📁 Slides saved in: ${OUTPUT_DIR}`);

  // Clean up temporary screenshots in dist
  try {
    fs.unlinkSync(capDashboardPath);
    fs.unlinkSync(capEvidencePath);
    fs.unlinkSync(capQueuePath);
  } catch (e) {}

  await browser.close();
  server.close();
});

