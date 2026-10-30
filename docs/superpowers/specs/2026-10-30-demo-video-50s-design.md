# 50-Second Product Documentary Video Design Spec

**Project:** SubsidenceWatch · Samsen Lab  
**Event:** GeoHackathon 2026 (GISTDA)  
**Target Duration:** ~50.0 seconds (1,500 frames @ 30 fps)  
**Resolution & Format:** 1920 × 1080 (16:9), H.264 / AAC, 30 fps  
**Style:** Apple / Linear Product Documentary (clean, authoritative, steady camera, no sci-fi gimmicks)  

---

## 1. Executive Summary & Goals

The user requested a refined, dignified, and authoritative ~50-second product demo video to replace the previous fast/gimmicky versions. The video will be submitted to GISTDA judges alongside the PDF slide deck and GitHub repository before the 12:00 PM deadline.

Key objectives:
1. **Credibility First**: Present real Sentinel-1 InSAR radar data (3,900 points, 64 satellite passes) and real retrospective analysis of the Samsen Road sinkhole (24 Sept 2025).
2. **Side Spotlight Callouts**: Guide the viewer's attention with clean, white, minimal floating callout cards that feature directional pointers directly to the active UI component.
3. **Pacing for Humans**: Allow 10–12 seconds per act so judges can read text, absorb metrics, and comprehend the scientific rigor.
4. **Zero Gimmicks**: Eliminate 3D perspective tilts, spinning radar sweeps, and fake target lock HUDs.

---

## 2. Storyboard & Act Breakdown

```
Total: 50.0s (1,500 frames @ 30 fps)
```

### Act 1: The Context & Scale (0.0s – 10.0s · 300 frames)
- **Camera:** Start at top-level overview, gently easing down (scroll 0 -> 160px) to reveal the 5×5 km AOI and 3,900 points.
- **UI State:** Initial overview showing 3,900 points with standard color-coding.
- **Spotlight Callout 1 (Top-Left above map):**
  - Icon & Pill: `🛰️ SATELLITE RADAR INGESTION`
  - Headline: **3,900 จุดตรวจวัด Sentinel-1 InSAR**
  - Detail: ครอบคลุมพื้นที่สามเสน–วชิรพยาบาล 5 × 5 กม. · ตรวจจับการเคลื่อนตัวระดับมิลลิเมตร
  - Pointer: Arrow pointing down towards the Leaflet map container.
- **Timing:** Callout fades in at 1.0s, holds until 9.0s, smoothly fades out by 10.0s.

### Act 2: Timeline Replay & Anomaly Formation (10.0s – 22.0s · 360 frames)
- **Cursor Action:** Cursor moves from map to the `#play-btn` (x~303, y~877) and clicks at 10.8s.
- **UI State:** Playback starts; timeline scrubber scrubs through 64 acquisition passes from Jan 2024 to 23 Sept 2025 morning.
- **Camera:** Smooth 1.25x camera punch-in centered on Samsen Road & Vajira Hospital (x: 42%, y: 55%).
- **Map Detail:** The red pulsing marker (`.event-pulse`) expands and beats continuously at the sinkhole epicenter.
- **Spotlight Callout 2 (Bottom-Left next to timeline scrubber):**
  - Icon & Pill: `⏱️ 64-PASS REPLAY (2024 - 2025)`
  - Headline: **Replay ย้อนหลัง 64 วันถ่ายดาวเทียม**
  - Detail: จุดพัลส์สีแดงตรงพิกัดถนนสามเสน เริ่มส่งสัญญาณทรุดตัวสะสมชัดเจน
  - Pointer: Arrow pointing left-down towards the active timeline scrubber.
- **Timing:** Callout fades in at 11.0s, holds until 21.0s, fades out by 22.0s.

### Act 3: Scientific Proof — LOS Displacement Evidence (22.0s – 34.0s · 360 frames)
- **Cursor Action:** Cursor glides from the map to point `R085C119` (Vajira Hospital) at 22.5s, clicking to lock focus.
- **Camera:** Smooth glide to the right side of the screen, focusing on the Point Insight panel and the LOS Displacement Chart.
- **UI State:** LOS displacement chart highlights the downward slope, the baseline fit, the CUSUM threshold crossing, and the vertical red event line (`24 Sept 25`).
- **Spotlight Callout 3 (Left of Point Insight card, pointing right):**
  - Icon & Pill: `📉 CUSUM ANOMALY DETECTION`
  - Headline: **อัตราการเคลื่อนตัวสะสม -6.9 mm/yr**
  - Detail: ตรวจพบสัญญาณเตือนก่อนวันเกิดเหตุจริง · บริเวณนี้ผิดปกติกว่า 93% ของพื้นที่ควบคุม
  - Pointer: Arrow pointing right directly to the displacement chart.
- **Timing:** Callout fades in at 23.0s, holds until 33.0s, fades out by 34.0s.

### Act 4: From Space Science to City Action — Inspection Queue (34.0s – 44.0s · 300 frames)
- **Cursor Action:** Cursor moves across to the left sidebar, clicking `[รายการจุดตรวจ]` (Inspection Queue) at 34.8s.
- **UI State:** Screen transitions cleanly to the Inspection Queue table showing 162 priority sites.
- **Cursor Action:** Cursor moves over top rows (Vajira Hospital Score 73, Samsen Road Score 66), then glides to the `[ดาวน์โหลด CSV]` button (x~1720, y~120).
- **Spotlight Callout 4 (Top-Right above the queue table):**
  - Icon & Pill: `📋 ACTIONABLE CITY SAFETY`
  - Headline: **จัดคิวลงตรวจ 162 จุดเสี่ยง (Inspection Queue)**
  - Detail: ถ่วงน้ำหนักความสำคัญ รพ. และถนนใหญ่ · Export CSV ส่งต่อทีมวิศวกร กทม. ทันที
  - Pointer: Arrow pointing down-right toward the prioritized table rows.
- **Timing:** Callout fades in at 35.0s, holds until 43.0s, fades out by 44.0s.

### Act 5: Executive Outro (44.0s – 50.0s · 180 frames)
- **Visual:** Fade-in to a minimal white studio card with deep navy typography.
- **Content:**
  - SubsidenceWatch icon & typography
  - Tagline: "ระบบสำรวจหลักฐานการเคลื่อนตัวของพื้นดินและจัดลำดับจุดลงตรวจ · พื้นที่สามเสน–วชิรพยาบาล"
  - Badges: `GeoHackathon 2026 · GISTDA` | `ESA Sentinel-1 Open InSAR Stack`
  - Repository: `github.com/P7tv/subsidencewatch`
- **Audio:** Smooth resolving ambient decay.

---

## 3. Visual & Technical Implementation Details

1. **Spotlight Callout Component Design:**
   - Background: `#FFFFFF`
   - Border: `1.5px solid #E2E8F0`
   - Shadow: `0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04)`
   - Border-Radius: `16px`
   - Typography: Inter + IBM Plex Sans Thai, Title `22px` bold (`#0F172A`), subtitle `14px` (`#475569`).
   - SVG Directional Pointers: Clean triangular SVG beak matching the card border and fill.
2. **Deterministic Frame Capture:**
   - Native Puppeteer Chromium rendering at 1920x1080.
   - Deterministic 30 fps capture (1,500 frames) piped into FFmpeg `image2pipe`.
   - Native OS pipe backpressure handling via `stream.drain`.
3. **Dual Export Deliverables:**
   - Master: `output_videos/subsidencewatch_demo_50s.mp4` (with subtle tech ambient sound design)
   - Muted: `output_videos/subsidencewatch_demo_50s_muted.mp4` (for live presentation speaking)

