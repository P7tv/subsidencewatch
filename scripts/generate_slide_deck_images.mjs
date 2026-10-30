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
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 }); // 2x Retina for presentation sharpness

  // ─────────────────────────────────────────────────────────────
  // 1. CAPTURE UI COMPONENTS FROM LIVE APP TO DIST DIRECTORY
  // ─────────────────────────────────────────────────────────────
  console.log("[2/4] Capturing high-res assets from live app...");
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

  // Capture close-up of the map + chart area (smoking gun evidence)
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
  // 2. GENERATE SLIDE 1: PRODUCT HERO & OVERVIEW
  // ─────────────────────────────────────────────────────────────
  console.log("[3/4] Generating Slide 1: Product Hero...");
  const slide1Html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 1920px;
          height: 1080px;
          background: radial-gradient(circle at 50% 15%, #132422 0%, #08100F 100%);
          font-family: Inter, "IBM Plex Sans Thai", sans-serif;
          color: #FFFFFF;
          padding: 60px 80px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 18px;
          background: rgba(22, 75, 69, 0.45);
          border: 1px solid rgba(45, 155, 142, 0.4);
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
          color: #5EEAD4;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .badge-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 10px #10B981;
        }
        .title {
          font-size: 48px;
          font-weight: 900;
          letter-spacing: -1px;
          margin-top: 14px;
          background: linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .subtitle {
          font-size: 20px;
          color: #94A3B8;
          margin-top: 6px;
          font-weight: 500;
        }
        .hackathon-tag {
          text-align: right;
          font-family: "JetBrains Mono", monospace;
          font-size: 14px;
          color: #64748B;
          border-left: 2px solid #2D9B8E;
          padding-left: 14px;
        }
        .mockup-container {
          position: relative;
          width: 100%;
          height: 680px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 20px;
        }
        .device-frame {
          position: relative;
          width: 1440px;
          height: 640px;
          background: #1E293B;
          border-radius: 20px;
          padding: 10px;
          box-shadow: 0 40px 100px -20px rgba(0,0,0,0.8), 0 0 0 2px rgba(255,255,255,0.12);
        }
        .device-screen {
          width: 100%;
          height: 100%;
          border-radius: 12px;
          overflow: hidden;
          background: #000;
        }
        .device-screen img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }
        .pill-card {
          position: absolute;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(20px);
          border: 1.5px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
          border-radius: 18px;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 10;
        }
        .pill-card.p1 { left: 40px; top: 120px; }
        .pill-card.p2 { right: 40px; top: 180px; }
        .pill-card.p3 { left: 80px; bottom: 40px; }
        .pill-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          font-size: 24px;
        }
        .pill-text strong { display: block; font-size: 19px; color: #F8FAFC; margin-bottom: 2px; }
        .pill-text span { font-size: 13.5px; color: #94A3B8; font-weight: 500; }
        .footer-note {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #64748B;
          font-size: 14px;
          font-weight: 600;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="badge"><span class="badge-dot"></span> PROTOTYPE SYSTEM · SAMSEN LAB</div>
          <h1 class="title">SubsidenceWatch</h1>
          <p class="subtitle">ระบบสำรวจหลักฐานการเคลื่อนตัวของพื้นดินและจัดลำดับคิวตรวจ จากดาวเทียม Sentinel-1</p>
        </div>
        <div class="hackathon-tag">
          <strong style="color: #F8FAFC; font-size: 16px;">GeoHackathon 2026</strong><br>
          GISTDA Space Challenge<br>
          github.com/P7tv/subsidencewatch
        </div>
      </div>

      <div class="mockup-container">
        <!-- Floating Highlight Pills -->
        <div class="pill-card p1">
          <div class="pill-icon" style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10B981;">🛰️</div>
          <div class="pill-text">
            <strong>3,900 จุดตรวจวัด InSAR</strong>
            <span>ครอบคลุมสามเสน 5×5 กม. · 64 วันถ่ายย้อนหลัง</span>
          </div>
        </div>

        <div class="pill-card p2">
          <div class="pill-icon" style="background: rgba(245, 158, 11, 0.15); border: 1px solid #F59E0B;">⚡</div>
          <div class="pill-text">
            <strong>CUSUM Anomaly Engine</strong>
            <span>ตรวจจับอัตราทรุดผิดปกติ -6.9 mm/yr ก่อนวันเกิดเหตุ</span>
          </div>
        </div>

        <div class="pill-card p3">
          <div class="pill-icon" style="background: rgba(14, 165, 233, 0.15); border: 1px solid #0EA5E9;">📋</div>
          <div class="pill-text">
            <strong>Actionable Inspection Queue</strong>
            <span>จัดลำดับคิวตรวจ 162 จุดเสี่ยง พร้อม Export CSV ให้ กทม.</span>
          </div>
        </div>

        <div class="device-frame">
          <div class="device-screen">
            <img src="http://127.0.0.1:${PORT}/cap_dashboard.png">
          </div>
        </div>
      </div>

      <div class="footer-note">
        <span>Sentinel-1 ESA Copernicus · ASF HyP3 · MintPy PSI Time-Series</span>
        <span>Ground Truth Retrospective Test: หลุมยุบถนนสามเสน 24 ก.ย. 2568</span>
      </div>
    </body>
    </html>
  `;
  await page.setContent(slide1Html);
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "slide_01_hero_dashboard.png"), type: "png" });

  // ─────────────────────────────────────────────────────────────
  // 3. GENERATE SLIDE 2: THE SMOKING GUN (EVIDENCE & DISCOVERY)
  // ─────────────────────────────────────────────────────────────
  console.log("[3/4] Generating Slide 2: Ground Truth Evidence...");
  const slide2Html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 1920px;
          height: 1080px;
          background: #0B1313;
          font-family: Inter, "IBM Plex Sans Thai", sans-serif;
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
          border-bottom: 1.5px solid rgba(255,255,255,0.1);
          padding-bottom: 24px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.5);
          border-radius: 999px;
          font-size: 13px;
          font-weight: 800;
          color: #FCA5A5;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .title {
          font-size: 42px;
          font-weight: 900;
          color: #FFFFFF;
          letter-spacing: -0.8px;
        }
        .subtitle {
          font-size: 20px;
          color: #94A3B8;
          margin-top: 6px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin: 32px 0;
        }
        .stat-card {
          background: rgba(22, 33, 33, 0.7);
          border: 1.5px solid rgba(45, 155, 142, 0.25);
          border-radius: 20px;
          padding: 26px 32px;
          position: relative;
          overflow: hidden;
        }
        .stat-card.alert {
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(38, 16, 16, 0.5);
        }
        .stat-label {
          font-size: 14px;
          font-weight: 700;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        .stat-val {
          font-size: 44px;
          font-weight: 900;
          color: #FFFFFF;
          margin: 8px 0 4px 0;
          letter-spacing: -1px;
        }
        .stat-desc {
          font-size: 15px;
          color: #CBD5E1;
          font-weight: 500;
        }
        .content-split {
          display: grid;
          grid-template-columns: 1.25fr 0.75fr;
          gap: 32px;
          flex: 1;
        }
        .preview-box {
          background: #111C1B;
          border-radius: 20px;
          border: 1.5px solid rgba(255,255,255,0.12);
          overflow: hidden;
          position: relative;
          box-shadow: 0 30px 80px rgba(0,0,0,0.6);
        }
        .preview-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }
        .evidence-notes {
          background: rgba(22, 33, 33, 0.8);
          border: 1.5px solid rgba(45, 155, 142, 0.3);
          border-radius: 20px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
        }
        .note-item {
          display: flex;
          gap: 18px;
          align-items: flex-start;
        }
        .note-num {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #164B45;
          color: #5EEAD4;
          font-weight: 800;
          display: grid;
          place-items: center;
          font-size: 17px;
          flex-shrink: 0;
        }
        .note-text h4 {
          font-size: 19px;
          font-weight: 700;
          color: #F8FAFC;
          margin-bottom: 4px;
        }
        .note-text p {
          font-size: 15px;
          color: #94A3B8;
          line-height: 1.55;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="badge">● GROUND TRUTH VALIDATION · SAMSEN SINKHOLE</div>
          <h1 class="title">หลักฐานสำคัญ: หลุมยุบถนนสามเสน 24 ก.ย. 2568</h1>
          <p class="subtitle">ผลการวิเคราะห์ Retrospective ด้วยภาพถ่ายดาวเทียม Sentinel-1 ย้อนหลัง 64 วันถ่าย</p>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 17px; font-weight: 800; color: #5EEAD4;">พิกัด 13.781°N, 100.510°E</span><br>
          <span style="font-size: 14px; color: #94A3B8;">จุดเกิดเหตุหน้า รพ.วชิรพยาบาล</span>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Sentinel-1 Passes</div>
          <div class="stat-val">64 วันถ่าย</div>
          <div class="stat-desc">ความถี่เฉลี่ยทุก 6-12 วัน (2 ม.ค. 67 – 23 ก.ย. 68)</div>
        </div>
        <div class="stat-card alert">
          <div class="stat-label" style="color: #FCA5A5;">LOS Velocity</div>
          <div class="stat-val" style="color: #EF4444;">-6.9 mm/yr</div>
          <div class="stat-desc">การเคลื่อนตัวออกจากแนวสายตาดาวเทียมสะสมต่อเนื่อง</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Control Area Ranking</div>
          <div class="stat-val" style="color: #5EEAD4;">ผิดปกติกว่า 93%</div>
          <div class="stat-desc">เมื่อเทียบกับเซลล์ควบคุมภายนอกรัศมี 400 ม.</div>
        </div>
      </div>

      <div class="content-split">
        <div class="preview-box">
          <img src="http://127.0.0.1:${PORT}/cap_evidence.png">
        </div>

        <div class="evidence-notes">
          <div class="note-item">
            <div class="note-num">1</div>
            <div class="note-text">
              <h4>ตรวจพบล่วงหน้าก่อนวันหลุมยุบ</h4>
              <p>อัลกอริทึม CUSUM ตรวจพบความเบี่ยงเบนของจุด R085C119 ล่วงหน้าก่อนเกิดเหตุจริงในเช้าวันที่ 24 ก.ย. 2568</p>
            </div>
          </div>
          <div class="note-item">
            <div class="note-num">2</div>
            <div class="note-text">
              <h4>Coherence Loss ยืนยันพิกัดแม่นยำ</h4>
              <p>ค่าความสอดคล้องของเฟสเรดาร์ (Coherence) ลดลงอย่างเฉียบพลันภายในรัศมี 300 ม. รอบสถานีรถไฟฟ้า</p>
            </div>
          </div>
          <div class="note-item">
            <div class="note-num">3</div>
            <div class="note-text">
              <h4>วิทยาศาสตร์ที่ตรวจสอบซ้ำได้ (Reproducible)</h4>
              <p>ประมวลผลด้วยโมเดลโอเพนซอร์สมาตรฐานสากล MintPy ไม่ต้องพึ่งพาข้อมูลลับหรือเซนเซอร์ใต้ดินราคาแพง</p>
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
  // 4. GENERATE SLIDE 3: ACTIONABLE INSPECTION QUEUE
  // ─────────────────────────────────────────────────────────────
  console.log("[3/4] Generating Slide 3: Inspection Queue...");
  const slide3Html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 1920px;
          height: 1080px;
          background: #091212;
          font-family: Inter, "IBM Plex Sans Thai", sans-serif;
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
          border-bottom: 1.5px solid rgba(255,255,255,0.1);
          padding-bottom: 24px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px;
          background: rgba(2, 132, 199, 0.2);
          border: 1px solid rgba(2, 132, 199, 0.5);
          border-radius: 999px;
          font-size: 13px;
          font-weight: 800;
          color: #7DD3FC;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .title {
          font-size: 42px;
          font-weight: 900;
          color: #FFFFFF;
          letter-spacing: -0.8px;
        }
        .subtitle {
          font-size: 20px;
          color: #94A3B8;
          margin-top: 6px;
        }
        .layout-grid {
          display: grid;
          grid-template-columns: 1.25fr 0.75fr;
          gap: 36px;
          margin-top: 30px;
          flex: 1;
        }
        .queue-frame {
          background: #111C1B;
          border-radius: 20px;
          border: 1.5px solid rgba(255,255,255,0.12);
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(0,0,0,0.6);
        }
        .queue-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }
        .value-props {
          display: flex;
          flex-direction: column;
          gap: 20px;
          justify-content: center;
        }
        .prop-card {
          background: rgba(20, 32, 32, 0.75);
          border: 1.5px solid rgba(45, 155, 142, 0.25);
          border-radius: 18px;
          padding: 24px;
        }
        .prop-card h3 {
          font-size: 20px;
          font-weight: 800;
          color: #5EEAD4;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .prop-card p {
          font-size: 15.5px;
          color: #CBD5E1;
          line-height: 1.55;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="badge">● ACTIONABLE CITY SAFETY</div>
          <h1 class="title">จากข้อมูลอวกาศ... สู่คิวตรวจสอบหน้างานจริง</h1>
          <p class="subtitle">ระบบแปลงจุดเรดาร์ 3,900 จุด เป็นรายการลำดับความเสี่ยงให้ทีมวิศวกร กทม. ลงพื้นที่ได้ทันที</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 32px; font-weight: 900; color: #38BDF8;">162 จุดตรวจ</div>
          <span style="font-size: 14px; color: #94A3B8;">คัดกรองจาก CUSUM 95th Percentile</span>
        </div>
      </div>

      <div class="layout-grid">
        <div class="queue-frame">
          <img src="http://127.0.0.1:${PORT}/cap_queue.png">
        </div>

        <div class="value-props">
          <div class="prop-card">
            <h3>🎯 จัดลำดับตามบริบทเมือง (Context-Weighted)</h3>
            <p>ถ่วงน้ำหนักความสำคัญของโครงสร้างพื้นฐาน: โรงพยาบาล (Weight 1.0), ถนนสายหลัก (Weight 0.65), และอาคาร เพื่อให้ทรัพยากรการลงตรวจพุ่งเป้าไปที่จุดเสี่ยงกระทบชีวิตคนสูงสุดก่อน</p>
          </div>
          <div class="prop-card">
            <h3>📥 Export CSV พร้อมพิกัด GPS ทันที</h3>
            <p>วิศวกรสามารถกดดาวน์โหลดไฟล์ CSV นำเข้าสู่ระบบ GIS ของ กทม. หรือส่งมอบให้ทีมตรวจสอบภาคสนามใช้ Leveling / GPR สแกนเจาะลึกได้ในคลิกเดียว</p>
          </div>
          <div class="prop-card">
            <h3>💰 ประหยัดงบประมาณและเวลาตรวจ 90%</h3>
            <p>แทนที่จะต้องสุ่มตรวจทุกตารางกิโลเมตร ระบบช่วยตีกรอบเหลือเพียง 162 จุดสำคัญ ช่วยให้ตรวจจับโพรงใต้ดินได้ก่อนถนนพังถล่ม</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  await page.setContent(slide3Html);
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUTPUT_DIR, "slide_03_actionable_inspection_queue.png"), type: "png" });

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
