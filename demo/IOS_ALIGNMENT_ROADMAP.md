# Demo iOS Alignment Roadmap

## Overview
This roadmap outlines the step-by-step plan to align the demo's behavior with the iOS app, ensuring consistent user experience across platforms.

## Current Status
- ✅ Notification schedule generation with `transitionNumber` (1-12) is already implemented
- ❌ Point ordering doesn't use `transitionNumber` for sorting
- ❌ Stimulation text formatting doesn't match iOS
- ❌ Time formatting may differ from iOS
- ❌ Journey order uses array index instead of `transitionNumber`
- ❌ **Point images missing "a" variants** (e.g., LU-8a, LI-1a, etc.)
- ❌ **No 4-state image cycling system** (original → alternate → mirrored original → mirrored alternate)
- ❌ **No Left/Right labeling** below images
- ❌ **No image mirroring** for left/right transitions

---

## Phase 1: Foundation & Time Formatting

### Step 1.1: Create iOS-Compatible Time Formatter
**Priority:** High  
**Dependencies:** None  
**Estimated Time:** 30 minutes

**Tasks:**
- Create `formatTimeIOS()` helper function that matches iOS behavior:
  - Format: "h a" (e.g., "3 PM") when minutes are 0
  - Format: "h:mm a" (e.g., "3:30 PM") when minutes are not 0
  - Use 12-hour format with AM/PM
  - Locale: en_US
- Replace `TimeUtils.formatTime()` calls in point formatting with new formatter
- Test with various times (on the hour, 30 minutes past, etc.)

**Success Criteria:**
- Time displays match iOS exactly (e.g., "3 PM" not "3:00 PM")
- Minutes only shown when non-zero

**Files to Modify:**
- `demo/script.js` - Add `formatTimeIOS()` method

---

## Phase 2: Point Ordering & Journey Order

### Step 2.1: Fix Point Ordering to Use transitionNumber
**Priority:** High  
**Dependencies:** None (transitionNumber already exists)  
**Estimated Time:** 45 minutes

**Tasks:**
- Modify `getOrderedPoints()` to sort by `transitionNumber` instead of array order
- Ensure points are sorted: `notificationSchedule.sort((a, b) => a.transitionNumber - b.transitionNumber)`
- Update `generatePointsList()` to use sorted schedule
- Handle edge case: if `transitionNumber` is missing, fall back to current behavior

**Success Criteria:**
- Points appear in order 1-12 based on `transitionNumber`
- Order matches iOS app exactly

**Files to Modify:**
- `demo/script.js` - `getOrderedPoints()` method (line ~536)
- `demo/script.js` - `generatePointsList()` method (line ~476)

---

### Step 2.2: Use transitionNumber for Journey Order
**Priority:** High  
**Dependencies:** Step 2.1  
**Estimated Time:** 30 minutes

**Tasks:**
- Modify `formatStimulationText()` to get `journeyOrder` from `scheduleItem.transitionNumber`
- Update `generatePointsList()` to pass `transitionNumber` instead of array index
- Remove `journeyOrder = index + 1` logic
- Ensure `transitionNumber` is used consistently throughout

**Success Criteria:**
- Point numbers match iOS (Point 1, Point 2, etc. based on transitionNumber)
- Journey order is consistent with iOS

**Files to Modify:**
- `demo/script.js` - `formatStimulationText()` method (line ~583)
- `demo/script.js` - `generatePointsList()` method (line ~476)

---

## Phase 3: Stimulation Text Formatting

### Step 3.0: Update Point Location and Stimulation Texts
**Priority:** High  
**Dependencies:** None  
**Estimated Time:** 30 minutes

**Tasks:**
- Update `demo/points.json` to match iOS localization strings exactly
- Fix 11 points with differences in location/stimulation text:
  - LU-8: Remove "it" from stimulation
  - ST-36: Fix grammar ("may be sore" not "may sore")
  - SP-3: "base of the bone" not "the bone", "often" not "likely"
  - HT-8: Update location and stimulation to match iOS
  - BL-66: Update stimulation ending
  - KI-10: Update stimulation method
  - PC-8: Update stimulation method
  - SJ-6: Add wrist movement instruction
  - GB-41: Add positioning instruction
  - LIV-1: Update with full iOS text
  - LI-1: Update stimulation ending
- See `POINT_TEXT_COMPARISON.md` for detailed differences

**Success Criteria:**
- All point location texts match iOS exactly
- All point stimulation texts match iOS exactly

**Files to Modify:**
- `demo/points.json` - Update all point texts

---

### Step 3.1: Fix Current Point Text
**Priority:** High  
**Dependencies:** Step 2.2  
**Estimated Time:** 30 minutes

**Tasks:**
- Change current point text from: `"Point X tells your body it is ${code} time"`
- To: `"Massage Point X now"` (when not completed)
- To: `"Massage Point X Complete"` (when completed)
- Check `completedPoints` set to determine which text to show
- Update point name formatting to use `transitionNumber`

**Success Criteria:**
- Current point shows "Massage Point X now" (matches iOS)
- Completed points show "Massage Point X Complete" (matches iOS)

**Files to Modify:**
- `demo/script.js` - `formatStimulationText()` method (line ~601)

---

### Step 3.2: Fix Past Point Text
**Priority:** High  
**Dependencies:** Step 2.2  
**Estimated Time:** 20 minutes

**Tasks:**
- Change past point text from: `"Point X is no longer active"`
- To: Just the point name: `"Point X"` (no additional text)
- Note: Styling (strikethrough) will be handled in CSS/HTML rendering

**Success Criteria:**
- Past points show only "Point X" (matches iOS)
- No "is no longer active" text

**Files to Modify:**
- `demo/script.js` - `formatStimulationText()` method (line ~606)

---

### Step 3.3: Fix Future Point Text
**Priority:** High  
**Dependencies:** Step 1.1, Step 2.2  
**Estimated Time:** 45 minutes

**Tasks:**
- Change future point text from: `"Do point X (${destTime}) at your ${localTime}"`
- To: `"Rub Point X at ${localTime}"` (using iOS time formatter)
- Remove destination time display
- Remove "Do" prefix
- Use "Rub" instead of "Do"
- Capitalize "Point X" (not "point X")
- Add "NEXT UP" suffix if `isNextUp` is true (space before "NEXT UP")
- Use `formatTimeIOS()` for local time formatting

**Success Criteria:**
- Future points show "Rub Point X at 3 PM" (matches iOS)
- No destination time shown
- "NEXT UP" appears for next upcoming point

**Files to Modify:**
- `demo/script.js` - `formatStimulationText()` method (line ~608)
- `demo/script.js` - Add `isNextUp` detection logic

---

### Step 3.4: Implement isNextUp Detection
**Priority:** Medium  
**Dependencies:** Step 3.3  
**Estimated Time:** 30 minutes

**Tasks:**
- Add logic to detect if a point is the "next up" point:
  - Next up = first future point after current point
  - Only show "NEXT UP" when current point is completed
- Pass `isNextUp` flag to `formatStimulationText()`
- Append " NEXT UP" to formatted text when flag is true

**Success Criteria:**
- "NEXT UP" appears only on the next upcoming point
- Only shows when current point is completed

**Files to Modify:**
- `demo/script.js` - `generatePointsList()` method
- `demo/script.js` - `formatStimulationText()` method

---

## Phase 4: Testing & Validation ✅ COMPLETE

### Step 4.1: Cross-Reference Testing ✅
**Priority:** High  
**Dependencies:** All previous steps  
**Estimated Time:** 1 hour  
**Status:** Complete

**Tasks:**
- ✅ Test with various scenarios:
  - No destination selected
  - Destination selected, current point active
  - Destination selected, current point completed
  - Multiple points completed
  - Points transitioning (past → current → future)
- ✅ Code review completed
- ✅ Verify all text formats match exactly
- ✅ Verify point ordering matches
- ✅ Verify time formatting matches

**Test Cases:**
1. **No Destination:**
   - Current point: "Point X is active now" ✅
   - Future points: "Point X will be active at X AM/PM" ✅

2. **Destination Selected - Current Point:**
   - Not completed: "Massage Point X now" ✅
   - Completed: "Massage Point X Complete" ✅

3. **Destination Selected - Past Points:**
   - Show: "Point X" ✅ (strikethrough styling pending Phase 6)

4. **Destination Selected - Future Points:**
   - Show: "Rub Point X at 3 PM" ✅
   - Next up: "Rub Point X at 3 PM NEXT UP" ✅

**Success Criteria:**
- ✅ All test cases verified in code
- ✅ Demo matches iOS behavior exactly (code review)
- ⚠️ Manual testing recommended before production

**Test Report:** See `PHASE_4_TEST_REPORT.md` for detailed analysis

---

### Step 4.2: Edge Case Testing ✅
**Priority:** Medium  
**Dependencies:** Step 4.1  
**Estimated Time:** 30 minutes  
**Status:** Complete

**Tasks:**
- ✅ Code review for timezone edge cases
- ✅ Code review for incomplete notification schedule
- ✅ Code review for midnight transitions
- ✅ Code review for all points completed
- ✅ Code review for no points completed

**Edge Cases Reviewed:**
- ✅ Missing schedule items: Handled gracefully with fallback message
- ✅ Missing transitionNumber: Fallback to 999 (warning logged in test report)
- ✅ No future points: isNextUp logic handles correctly
- ✅ Current point is last: Logic verified
- ✅ Time formatting edge cases: All handled (midnight, noon, AM/PM)

**Success Criteria:**
- ✅ No errors in edge cases (code review)
- ✅ Graceful handling of missing data
- ⚠️ Manual testing recommended for timezone edge cases

**Test Report:** See `PHASE_4_TEST_REPORT.md` for detailed edge case analysis

---

## Phase 4.5: Cascading Point Animation System

### Step 4.5.1: Implement Sequential Point Animation
**Priority:** High  
**Dependencies:** Phase 2 (point ordering)  
**Estimated Time:** 2 hours

**Tasks:**
- Implement sequential animation where points appear one by one over 5 seconds
- Each point starts with:
  - `opacity: 0`
  - `transform: translateY(20px)` (offset down)
- Animate to:
  - `opacity: 1`
  - `transform: translateY(0)`
- Use CSS transitions or JavaScript animation
- Calculate delay: `5 seconds / total points` between each point
- Track animation state (in progress vs complete)

**Success Criteria:**
- Points cascade down sequentially over 5 seconds
- Smooth fade-in and slide-up animation for each point
- Animation only runs on initial load or new destination

**Files to Modify:**
- `demo/script.js` - Add animation state management
- `demo/script.js` - Add `animatePointsSequentially()` method
- `demo/styles.css` - Add animation classes

---

### Step 4.5.2: Implement Border Color Changes
**Priority:** High  
**Dependencies:** Step 4.5.1  
**Estimated Time:** 1 hour

**Tasks:**
- During animation: All points show black borders
- After animation completes:
  - Current point: Green border (#34c759)
  - Upcoming points: Blue border (or orange if notification cancelled)
  - Past/inactive points: Black border
- Add `animationComplete` state tracking
- Update border colors based on animation state and point status

**Success Criteria:**
- Black borders during animation
- Color-coded borders after animation (green for current, blue for upcoming)
- Border colors update when current point changes

**Files to Modify:**
- `demo/script.js` - Add border color logic
- `demo/styles.css` - Add border color classes
- `demo/script.js` - Update `generatePointsList()` to apply border classes

---

### Step 4.5.3: Auto-Expand Current Point After Animation
**Priority:** High  
**Dependencies:** Step 4.5.1  
**Estimated Time:** 30 minutes

**Tasks:**
- After all points finish animating, auto-expand the current point
- Add 0.3 second delay after animation completes before expanding
- Use smooth expand animation (CSS transition)
- Only expand if animation just completed (not on every render)

**Success Criteria:**
- Current point auto-expands after cascade animation completes
- Smooth expand animation
- Only happens once per animation sequence

**Files to Modify:**
- `demo/script.js` - Add auto-expand logic after animation
- `demo/styles.css` - Ensure expand animation is smooth

---

### Step 4.5.4: Disable Interactions During Animation
**Priority:** Medium  
**Dependencies:** Step 4.5.1  
**Estimated Time:** 20 minutes

**Tasks:**
- Disable point card taps during animation
- Disable point expansion/collapse during animation
- Re-enable interactions after `animationComplete` is true
- Add visual indicator (cursor: not-allowed) during animation

**Success Criteria:**
- Users cannot interact with points during animation
- Interactions enabled after animation completes

**Files to Modify:**
- `demo/script.js` - Add interaction blocking logic
- `demo/styles.css` - Add disabled state styling

---

## Phase 5: Point Image Cycling System

### Step 5.0: Fix KI-3 vs KI-10 and Update Videos
**Priority:** Critical  
**Dependencies:** None  
**Estimated Time:** 30 minutes

**Tasks:**
- **CRITICAL:** Replace KI-10 with KI-3 (iOS changed in v0.95):
  - Update `points.json`: Change point 8 from KI-10 to KI-3
  - Replace `KI-10.jpg` with `KI-3.jpg` in demo assets
  - Replace `KI-10.mp4` with `KI-3.mp4` in demo assets (get optimized version from iOS)
  - Update point data (location, stimulation, name) to match iOS KI-3 localization
- Verify all videos match iOS versions (may have been optimized/updated)
- See `IMAGE_ASSETS_STATUS.md` for details

**Success Criteria:**
- Demo uses KI-3 (not KI-10) matching iOS
- KI-3 image and video are correct versions
- Point data matches iOS localization

**Files to Modify:**
- `demo/points.json` - Update point 8 to KI-3
- `demo/assets/point-images/` - Replace KI-10.jpg with KI-3.jpg
- `demo/assets/videos/` - Replace KI-10.mp4 with KI-3.mp4

---

### Step 5.1: Add "a" Variant Images ⚠️ PENDING ASSETS
**Priority:** High  
**Dependencies:** Step 5.0  
**Estimated Time:** 1 hour (requires image assets)  
**Status:** Code ready, waiting for image assets

**Note:** The code implementation is complete and will work once the "a" variant images are added. The system gracefully handles missing images by falling back to the base image.

**Tasks:**
- **CRITICAL:** Obtain all "a" variant images from iOS app:
  - LU-8a.jpg, LI-1a.jpg, ST-36a.jpg, SP-3a.jpg, HT-8a.jpg, SI-5a.jpg
  - BL-66a.jpg, **KI-3a.jpg** (not KI-10a), PC-8a.jpg, SJ-6a.jpg, GB-41a.jpg, LIV-1a.jpg
- Add all "a" variant images to `demo/assets/point-images/` directory
- Verify all 12 points have both base and "a" variants (24 images total)

**Success Criteria:**
- All "a" variant images exist in demo assets
- Images match iOS app images exactly

**Files to Add:**
- `demo/assets/point-images/LU-8a.jpg` (and all other "a" variants)

---

### Step 5.2: Implement 4-State Image Cycle System ✅
**Priority:** High  
**Dependencies:** Step 5.1  
**Estimated Time:** 2 hours  
**Status:** Complete

**Tasks:**
- ✅ Implement cycle state management (0, 1, 2, 3):
  - State 0: Original image (e.g., "LU-8")
  - State 1: Alternate image (e.g., "LU-8a")
  - State 2: Mirrored original (CSS transform: scaleX(-1))
  - State 3: Mirrored alternate (CSS transform: scaleX(-1))
- ✅ Add `pointCycleStates` Map to track cycle state per point
- ✅ Create `getImageNameForCycle(point)` function
- ✅ Create `getCycleState(pointId)` and `setCycleState(pointId, state)` methods
- ✅ Update image rendering to use cycle state
- ✅ Add CSS for mirroring: `transform: scaleX(-1)`

**Success Criteria:**
- ✅ Images cycle through 4 states correctly
- ✅ Mirroring works for states 2 and 3

**Files Modified:**
- ✅ `demo/script.js` - Added cycle state management (Map-based)
- ✅ `demo/script.js` - Updated `generatePointsList()` to use cycle state
- ✅ `demo/styles.css` - Added mirror transform class

---

### Step 5.3: Implement Video Loop Observer for Cycle Advancement ✅
**Priority:** High  
**Dependencies:** Step 5.2  
**Estimated Time:** 1.5 hours  
**Status:** Complete

**Tasks:**
- ✅ Add video `ended` event listener to advance cycle state
- ✅ When video finishes playing, advance: `cycleState = (cycleState + 1) % 4`
- ✅ Removed `loop` attribute from video, handle looping manually
- ✅ Only set up observer for points that have alternate images
- ✅ Added `hasAlternateImage(point)` helper (returns true for all points once assets are added)
- ✅ Added `setupVideoLoopObserver(pointId)` and `cleanupVideoObserver(pointId)` methods
- ✅ Ensure video loops correctly and triggers cycle advancement

**Success Criteria:**
- ✅ Video loop completion advances cycle state
- ✅ Cycle advances: 0 → 1 → 2 → 3 → 0 (repeats)
- ✅ Only points with "a" variants cycle (once assets are added)

**Files Modified:**
- ✅ `demo/script.js` - Added video event listeners
- ✅ `demo/script.js` - Added `hasAlternateImage()` helper
- ✅ `demo/script.js` - Added `advanceCycle()` method
- ✅ `demo/script.js` - Added `setupVideoLoopObserver()` and cleanup methods

---

### Step 5.4: Implement Left/Right Labeling ✅
**Priority:** High  
**Dependencies:** Step 5.2  
**Estimated Time:** 45 minutes  
**Status:** Complete

**Tasks:**
- ✅ Add "Left" or "Right" label below point image
- ✅ Implement `getLeftRightLabel(point)` function:
  - KI-3, LI-1, PC-8: States 0,1 = "Left"; States 2,3 = "Right"
  - All other points: States 0,1 = "Right"; States 2,3 = "Left"
- ✅ Update HTML template to include label below image in `point-image-container`
- ✅ Style label to match iOS (gray text, medium weight, 16px font)

**Success Criteria:**
- ✅ Left/Right label appears below image
- ✅ Label changes correctly as cycle advances
- ✅ Label matches iOS positioning and styling

**Files Modified:**
- ✅ `demo/script.js` - Added `getLeftRightLabel()` method
- ✅ `demo/script.js` - Updated `generatePointsList()` HTML template
- ✅ `demo/styles.css` - Styled left/right label (`.point-left-right-label`)

---

### Step 5.5: Mirror Video on States 2 and 3 ✅
**Priority:** High  
**Dependencies:** Step 5.2  
**Estimated Time:** 30 minutes  
**Status:** Complete

**Tasks:**
- ✅ Apply mirror transform to video element when `cycleState >= 2`
- ✅ Use CSS: `transform: scaleX(-1)` on video element (`.mirrored` class)
- ✅ Ensure video mirrors in sync with static image
- ✅ Added `isMirrored(pointId)` helper method
- ✅ Added `updatePointImage(pointId)` to update both image and video mirroring

**Success Criteria:**
- ✅ Video mirrors horizontally for states 2 and 3
- ✅ Video and image mirror together

**Files Modified:**
- ✅ `demo/script.js` - Apply mirror class to video element in HTML template
- ✅ `demo/script.js` - Added `isMirrored()` and `updatePointImage()` methods
- ✅ `demo/styles.css` - Added video mirror transform (`.point-video video.mirrored`)

---

## Phase 6: UI Styling ✅ COMPLETE

### Step 6.1: Add Strikethrough for Past Points ✅
**Priority:** Low  
**Dependencies:** Step 3.2  
**Estimated Time:** 20 minutes  
**Status:** Complete

**Tasks:**
- ✅ Add CSS class for past points (strikethrough + dimmed)
- ✅ Apply class in `generatePointsList()` for past points
- ✅ Match iOS visual styling (secondary color + strikethrough)

**Success Criteria:**
- ✅ Past points visually match iOS (strikethrough, dimmed)
- ✅ Only applies to past points when destination is selected
- ✅ Uses iOS secondary color (#8e8e93) for dimmed effect

**Files Modified:**
- ✅ `demo/styles.css` - Added `.point-card.past .point-stimulation-text` styling
- ✅ `demo/script.js` - Added `past` class to point cards when `isPast` is true

---

## Implementation Order Summary

1. **Phase 1:** Time formatting (foundation)
2. **Phase 2:** Point ordering & journey order (core logic)
3. **Phase 3:** Text formatting (user-facing changes)
4. **Phase 4:** Testing & validation
5. **Phase 4.5:** Cascading point animation system (NEW)
6. **Phase 5:** Point image cycling system (major feature)
7. **Phase 6:** UI polish (if needed)

**Note:** Phase 5 can be done in parallel with Phases 1-3, but requires image assets first.

---

## Estimated Total Time
- **Phase 1:** 30 minutes
- **Phase 2:** 75 minutes (1.25 hours)
- **Phase 3:** 155 minutes (2.6 hours) - **Updated: Added Step 3.0 for point text updates**
- **Phase 4:** 90 minutes (1.5 hours)
- **Phase 4.5:** 230 minutes (3.8 hours) - **NEW: Cascading animation system**
- **Phase 5:** 345 minutes (5.75 hours) - **NEW: Image cycling system + KI-3 fix**
- **Phase 6:** 20 minutes
- **Total:** ~15 hours (increased from 5.5 hours)

---

## Risk Assessment

**Low Risk:**
- Time formatting changes (isolated function)
- Text string changes (straightforward replacements)

**Medium Risk:**
- Point ordering changes (affects display logic)
- Journey order changes (affects multiple functions)

**Mitigation:**
- Test each phase independently
- Keep backup of working version
- Test with multiple destinations/timezones

---

## Notes

- The notification schedule already has `transitionNumber` correctly set (1-12)
- The main work is using `transitionNumber` consistently and fixing text formats
- CSS styling for past points may need adjustment after text changes
- Consider adding console logging during development to verify `transitionNumber` values
- **CRITICAL:** Phase 5 requires obtaining all "a" variant images from iOS app assets
- iOS uses 4-state cycle: original → alternate → mirrored original → mirrored alternate
- Only points with "a" variants participate in cycling (all 12 points in iOS)
- Video loop completion triggers cycle advancement
- KI-3, LI-1, PC-8 start with "Left" (others start with "Right")

---

## Completion Checklist

- [ ] Phase 1: Time formatting implemented
- [ ] Phase 2: Point ordering fixed
- [ ] Phase 2: Journey order uses transitionNumber
- [ ] Phase 3: Point location/stimulation texts updated to match iOS
- [ ] Phase 3: Current point text fixed
- [ ] Phase 3: Past point text fixed
- [ ] Phase 3: Future point text fixed
- [ ] Phase 3: isNextUp detection implemented
- [ ] Phase 4: All test cases pass
- [ ] Phase 4: Edge cases handled
- [ ] Phase 4.5: Sequential animation implemented
- [ ] Phase 4.5: Border color changes working
- [ ] Phase 4.5: Auto-expand current point working
- [ ] Phase 4.5: Interactions disabled during animation
- [ ] Phase 5: KI-3 vs KI-10 fixed (images, videos, data)
- [ ] Phase 5: All "a" variant images added
- [ ] Phase 5: 4-state cycle system implemented
- [ ] Phase 5: Video loop observer working
- [ ] Phase 5: Left/Right labeling implemented
- [ ] Phase 5: Video mirroring working
- [ ] Phase 6: UI styling matches iOS (if needed)

