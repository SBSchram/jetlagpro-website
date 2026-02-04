# JetLagPro image assets — definitive reservoir

This folder is the **single source of truth** for JetLagPro point images and related assets. iOS, Watch, React Native, and the website demo copy from here.

## Naming convention (point images)

| Suffix | Meaning | Use |
|--------|---------|-----|
| *(none)* | Base / main display | Demo default; research paper when no `b` |
| `a` | Video-frame / second view | App second view; demo alternate |
| `b` | Black dot (research) | Research paper figures |
| `g` | Green dot (app) | Main app display; often used as base in apps |

Examples: `KI-27.jpg` = main display; `KI-27b.jpg` = research; `KI-27g.jpg` = app green dot.

## Sync rule

When adding or updating a point image (or other project image):

1. Add or replace the file **here** first.
2. Copy to: iOS (`JetLagPro/Assets.xcassets`), Watch (`Watch App/Assets.xcassets`), RN (`JetLagProRN/assets/images`), and demo (`demo/assets/point-images` for main view) as needed.

## Other assets

- **Wheel, steps, research photos:** `wheel.jpg`, `Wheel-Complex.jpg`, `Step 3.jpg`, `research-paper step 2.jpg`, etc.
- **TestFlight / app:** `TestFlightOpen.jpg`, `TestFlightRedeem.JPG`, etc.

Last updated: 2026-02.
