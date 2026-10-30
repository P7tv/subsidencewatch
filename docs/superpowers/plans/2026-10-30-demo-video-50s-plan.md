# 50-Second Product Documentary Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and render a 50.0-second (1,500 frames @ 30 fps), Apple/Linear-grade product documentary video (`subsidencewatch_demo_50s.mp4` & muted version) with dynamic Side Spotlight Callouts, steady 2D camera framing, real Sentinel-1 InSAR data, and clean tech ambient audio.

**Architecture:** Node.js + Puppeteer-core + Chromium running headless at 1920×1080, capturing 1,500 deterministic frames piped into FFmpeg `image2pipe`, followed by multi-bus ambient sound design and MP4 encoding.

**Tech Stack:** Node.js, Puppeteer-Core, FFmpeg, Leaflet, HTML/CSS.

## Global Constraints
- Target duration: Exactly 50.0 seconds (1,500 frames at 30 fps).
- Aspect ratio: 16:9 (1920 × 1080).
- Visual style: Pure 2D UI with smooth human-like pan/zooms. Zero 3D tilts, zero arcade/sci-fi overlays.
- Dynamic elements: Side Spotlight Callouts with directional pointers pointing to active UI elements.
- Outputs: Both master (audio) and muted versions in `output_videos/`.

---

### Task 1: Create the 50-Second Documentary Recording Script

**Files:**
- Create: `scripts/record_documentary_50s.mjs`

**Interfaces:**
- Consumes: Built static web assets in `dist/`
- Produces: `output_videos/subsidencewatch_demo_50s.mp4` and `output_videos/subsidencewatch_demo_50s_muted.mp4`

- [ ] **Step 1: Write `scripts/record_documentary_50s.mjs`**
  - Implement static HTTP server on port 4176 serving `dist/`.
  - Inject 4 Side Spotlight Callouts with SVG pointers:
    - Callout 1: 3,900 จุดตรวจวัด Sentinel-1 InSAR (pointing down at map).
    - Callout 2: Replay ย้อนหลัง 64 วันถ่าย (pointing left at timeline scrubber).
    - Callout 3: อัตราการเคลื่อนตัวสะสม -6.9 mm/yr (pointing right at LOS chart).
    - Callout 4: Smart Inspection Queue 162 จุดเสี่ยง (pointing down at table).
  - Inject clean minimal studio outro card.
  - Implement 5-Act timeline interpolation across 1,500 frames (50s @ 30fps).
  - Add backpressure handling (`stream.drain`) on `ffmpeg.stdin.write`.
  - Add dual-export: master with ambient sound bed + muted version.

- [ ] **Step 2: Syntax and sanity check the script**
  - Verify script parses with `node --check scripts/record_documentary_50s.mjs`.

---

### Task 2: Render and Encode the 50-Second Video

**Files:**
- Executes: `node scripts/record_documentary_50s.mjs`
- Produces:
  - `output_videos/subsidencewatch_demo_50s.mp4`
  - `output_videos/subsidencewatch_demo_50s_muted.mp4`

- [ ] **Step 1: Execute rendering script**
  - Run `node scripts/record_documentary_50s.mjs` and monitor frame progression (1 to 1,500).

- [ ] **Step 2: Verify video encoding and duration**
  - Use `ffprobe` to verify video duration (exactly 50.0s), resolution (1920x1080), framerate (30 fps), and audio stream.

---

### Task 3: Quality Verification and Frame Inspection

**Files:**
- Creates: Sample frames in `output_videos/doc_act*.jpg`

- [ ] **Step 1: Extract verification frames for each of the 5 acts**
  - Act 1 (5s): Overview with Callout 1.
  - Act 2 (16s): Playback with Callout 2 & pulsing sinkhole.
  - Act 3 (28s): Chart focus with Callout 3.
  - Act 4 (39s): Inspection Queue with Callout 4.
  - Act 5 (48s): Outro card.

- [ ] **Step 2: Visually verify frames with `read_file`**
  - Ensure pointers align accurately, text is crisp and legible, and no UI elements are obstructed.

- [ ] **Step 3: Commit plan and deliverables**
  - Run git commit.

