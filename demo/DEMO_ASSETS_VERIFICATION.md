# Demo assets verification (match iOS)

Use this checklist to confirm the website demo uses the same images and videos as the iOS app.

## KI-27 video (fixed)

- **Issue:** Demo must use the same KI-27 video as iOS.
- **Fix:** Run `scripts\convert_ki27new_to_demo.ps1` from repo root. It converts `assets/videos/KI-27new.mov` (iOS-matching source) to `demo/assets/videos/KI-27.mp4`.
- **Source of truth:** Copy the KI-27 video from the iOS app (`JetLagPro/Resources/Videos/`) into the repo as `assets/videos/KI-27new.mov`, then re-run the script to refresh the demo.

## Videos (demo points – economy class set)

Demo `points.json` uses these 12 points. Each must have a matching `.mp4` in `demo/assets/videos/`:

| Point  | videoName   | File in demo/assets/videos | Notes        |
|--------|-------------|----------------------------|-------------|
| LU-8   | LU-8.mp4    | LU-8.mp4                   |             |
| LI-1   | LI-1.mp4    | LI-1.mp4                   |             |
| ST-36  | ST-36.mp4   | ST-36.mp4                  |             |
| SP-10  | SP-10.mp4   | SP-10.mp4                  |             |
| HT-8   | HT-8.mp4    | HT-8.mp4                   |             |
| SI-5   | SI-5.mp4    | SI-5.mp4                   |             |
| BL-2   | BL-2.mp4    | BL-2.mp4                   |             |
| KI-27  | KI-27.mp4   | KI-27.mp4                  | From KI-27new.mov (iOS) |
| PC-8   | PC-8.mp4    | PC-8.mp4                   |             |
| SJ-6   | SJ-6.mp4    | SJ-6.mp4                   |             |
| GB-20  | GB-20.mp4   | GB-20.mp4                  |             |
| LIV-8  | LIV-8.mp4   | LIV-8.mp4                  |             |

**Verification:** Compare each file with the iOS app’s `Resources/Videos/` (or equivalent). Replace any demo video with the iOS version if they differ.

## Point images (base + "a" variant)

Each point needs a base image and an "a" variant for the 4-state cycle. Path: `demo/assets/point-images/`.

| Point | Base image | "a" variant | Notes |
|-------|------------|------------|-------|
| LU-8  | LU-8.jpg   | LU-8a.jpg  |       |
| LI-1  | LI-1.jpg   | LI-1a.jpg  |       |
| ST-36 | ST-36.jpg  | ST-36a.jpg |       |
| SP-10 | SP-10.jpg  | SP-10a.jpg |       |
| HT-8  | HT-8.jpg   | HT-8a.jpg  |       |
| SI-5  | SI-5.jpg   | SI-5a.jpg  |       |
| BL-2  | BL-2.jpg   | BL-2a.jpg  |       |
| KI-27 | KI-27.jpg  | KI-27a.jpg | **KI-27a.jpg missing** – add from iOS if app uses alternate |
| PC-8  | PC-8.jpg   | PC-8a.jpg  |       |
| SJ-6  | SJ-6.jpg   | SJ-6a.jpg  |       |
| GB-20 | GB-20.jpg  | GB-20a.jpg |       |
| LIV-8 | LIV-8.jpg  | LIV-8a.jpg |       |

**Verification:** Compare with iOS `Assets.xcassets` (e.g. `[Point].imageset/`, `[Point]a.imageset/`). Replace or add any demo image so it matches iOS.

## Quick verification steps

1. **KI-27 video:** Run `.\scripts\convert_ki27new_to_demo.ps1`; open demo, go to Kidney-27 (5–7 PM); confirm video matches iOS.
2. **All videos:** Play each point’s video in the demo and in the iOS app; confirm same content and framing.
3. **All images:** Cycle through Left/Right (or equivalent) for each point; confirm base and "a" images match iOS.
