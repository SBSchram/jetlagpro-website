# Image & Video Assets Status: Demo vs iOS

## Summary
The demo is **missing all "a" variant images** (12 images) and is using **KI-10 instead of KI-3** for both images and videos.

## Current Status

### ✅ Demo Has (Base Images):
- LU-8.jpg
- LI-1.jpg
- ST-36.jpg
- SP-3.jpg
- HT-8.jpg
- SI-5.jpg
- BL-66.jpg
- **KI-10.jpg** ❌ (should be KI-3)
- PC-8.jpg
- SJ-6.jpg
- GB-41.jpg
- LIV-1.jpg

### ✅ Demo Has (Videos):
- LU-8.mp4
- LI-1.mp4
- ST-36.mp4
- SP-3.mp4
- HT-8.mp4
- SI-5.mp4
- BL-66.mp4
- **KI-10.mp4** ❌ (should be KI-3)
- PC-8.mp4
- SJ-6.mp4
- GB-41.mp4
- LIV-1.mp4

### ❌ Demo Missing (All "a" Variants):
- LU-8a.jpg
- LI-1a.jpg
- ST-36a.jpg
- SP-3a.jpg
- HT-8a.jpg
- SI-5a.jpg
- BL-66a.jpg
- **KI-3a.jpg** (not KI-10a - iOS uses KI-3)
- PC-8a.jpg
- SJ-6a.jpg
- GB-41a.jpg
- LIV-1a.jpg

### ✅ iOS Has (Confirmed):
All 12 base images + all 12 "a" variant images:
- LU-8, LU-8a
- LI-1, LI-1a
- ST-36, ST-36a
- SP-3, SP-3a
- HT-8, HT-8a
- SI-5, SI-5a
- BL-66, BL-66a
- **KI-3, KI-3a** (not KI-10 - changed in v0.95)
- PC-8, PC-8a
- SJ-6, SJ-6a
- GB-41, GB-41a
- LIV-1, LIV-1a

## Critical Issues

### 1. KI-3 vs KI-10
- **iOS uses:** KI-3 (Taixi, ankle Source point)
- **Demo uses:** KI-10 (Yin Valley, behind knee)
- **Reason:** iOS changed from KI-10 to KI-3 in version 0.95 for better accessibility
- **Action Required:**
  - Update `points.json` to use KI-3 instead of KI-10
  - Replace KI-10.jpg with KI-3.jpg
  - Replace KI-10.mp4 with KI-3.mp4 (optimized, no audio, 832KB per changelog)
  - Add KI-3a.jpg
  - Update point data (location, stimulation) to match iOS KI-3 localization

### 2. Missing "a" Variant Images
- **Total Missing:** 12 images (all "a" variants)
- **Required for:** Phase 5 - 4-state image cycling system
- **Source:** Need to extract from iOS Assets.xcassets

## Action Items

### Immediate (Before Phase 3):
1. ✅ Update `points.json` to use KI-3 instead of KI-10
2. ✅ Replace KI-10.jpg with KI-3.jpg in demo assets
3. ✅ Replace KI-10.mp4 with KI-3.mp4 in demo assets (get optimized version from iOS)
4. ✅ Update KI-3 point data (location, stimulation) to match iOS localization

### Phase 5 (Image Cycling):
1. Extract all 12 "a" variant images from iOS Assets.xcassets
2. Add all 12 "a" variant images to `demo/assets/point-images/`
3. Verify image quality and orientation match iOS

## Asset Extraction Locations

**iOS Image Source:**
- `/Users/Steve/Development/JetLagProject/JetLagPro/Assets.xcassets/[POINT]a.imageset/[POINT]a.jpg`
- `/Users/Steve/Development/JetLagProject/JetLagPro/Assets.xcassets/KI-3.imageset/KI-3.jpg`
- `/Users/Steve/Development/JetLagProject/JetLagPro/Assets.xcassets/KI-3a.imageset/KI-3a.jpg`

**iOS Video Source:**
- `/Users/Steve/Development/JetLagProject/JetLagPro/Resources/Videos/KI-3.mp4`

**Demo Destinations:**
- Images: `/Users/Steve/Development/jetlagpro-website/demo/assets/point-images/[POINT].jpg`
- Videos: `/Users/Steve/Development/jetlagpro-website/demo/assets/videos/[POINT].mp4`

## Notes

- iOS changed from KI-10 to KI-3 in version 0.95 (October 2024)
- KI-3 is easier to locate (ankle) vs KI-10 (behind knee)
- KI-3.mp4 was optimized (no audio, 832KB) in iOS v0.95
- All 12 points in iOS have "a" variants for the 4-state cycling system
- Demo currently has static images only (no cycling)
- iOS uses `point.imageName` to reference videos (e.g., "KI-3" → "KI-3.mp4")
- Videos may have been updated/optimized since demo was created - verify all videos match iOS versions

