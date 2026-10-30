import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const SLIDES_DIR = path.join(process.cwd(), "output_slides");
const PDF_OUTPUT = path.join(SLIDES_DIR, "SubsidenceWatch_BKK_Presentation.pdf");

const slides = [
  "slide_01_hero_dashboard.png",
  "slide_02_smoking_gun_samsen.png",
  "slide_03_actionable_inspection_queue.png",
  "slide_04_system_architecture.png"
];

async function generatePdf() {
  console.log("Generating Presentation PDF from slides...");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: 1920px 1080px;
          margin: 0;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          margin: 0;
          padding: 0;
          background: #0B1325;
        }
        .slide-page {
          width: 1920px;
          height: 1080px;
          page-break-after: always;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .slide-page:last-child {
          page-break-after: avoid;
        }
        .slide-img {
          width: 1920px;
          height: 1080px;
          display: block;
        }
      </style>
    </head>
    <body>
      ${slides.map(file => {
        const filePath = path.join(SLIDES_DIR, file);
        const base64 = fs.readFileSync(filePath).toString("base64");
        return `
          <div class="slide-page">
            <img class="slide-img" src="data:image/png;base64,${base64}" />
          </div>
        `;
      }).join("")}
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  await page.pdf({
    path: PDF_OUTPUT,
    width: "1920px",
    height: "1080px",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  await browser.close();
  console.log(`✅ Presentation PDF generated successfully: ${PDF_OUTPUT}`);
  const stats = fs.statSync(PDF_OUTPUT);
  console.log(`📊 File Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

generatePdf().catch(err => {
  console.error("Failed to generate PDF:", err);
  process.exit(1);
});

