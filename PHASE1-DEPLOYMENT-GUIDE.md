# Phase 1: Write Source Authentication - Deployment Guide

## Overview

This guide walks you through deploying Phase 1 of the Data Integrity Safeguards system. After deployment, unauthorized Firebase Console writes will be blocked while legitimate app and web survey writes continue working.

---

## ✅ What's Already Done

### Web Survey Code
- ✅ `survey.js` has been updated with write metadata
- ✅ Both trip-based and standalone survey paths include `_writeMetadata`
- ✅ No cryptography used (Apple compliance friendly)

### Files Created
- ✅ `firestore.rules` - Firebase Security Rules (ready to deploy)
- ✅ `iOS-WriteMetadata-Template.swift` - iOS code template
- ✅ This deployment guide

---

## 📋 Pre-Deployment Checklist

Before deploying, verify:
- [ ] Web survey code changes reviewed
- [ ] iOS app will be updated (or test with rules relaxed first)
- [ ] Have Firebase Console access
- [ ] Have Firebase CLI installed (optional, for CLI deployment)
- [ ] Understand rollback procedure (see bottom)

---

## 🚀 Deployment Steps

### Step 1: Test Web Survey Locally (Optional)

**Before deploying rules, test survey still works:**

1. Open survey.html in browser
2. Complete a test survey submission
3. Check browser console for errors
4. Verify in Firebase Console that data was saved
5. Check that `_writeMetadata` field exists in document

**Expected console output:**
```
📊 Exporting survey data...
💾 Saving to unified tripCompletions collection...
✅ Flat survey data added to existing trip record: ABC12345
```

**Expected Firebase document structure:**
```json
{
  "surveyCompleted": true,
  "_writeMetadata": {
    "source": "web_survey",
    "sourceVersion": "1.0.0",
    "timestamp": "...",
    "userAgent": "Mozilla/5.0...",
    "browserInfo": "Win32; en-US",
    "surveyUrl": "https://jetlagpro.com/survey.html"
  },
  "...": "rest of survey data"
}
```

---

### Step 2: Update iOS App Code

**Follow `iOS-WriteMetadata-Template.swift` to:**

1. Add `createWriteMetadata()` function to your Firebase service
2. Update `saveTripCompletion()` to include metadata
3. Update `updateTripCompletion()` to include metadata
4. Test app locally or with TestFlight
5. Verify Firebase documents have `_writeMetadata` field

**Testing iOS app:**
- Complete a trip in the app
- Check Firebase Console
- Verify document has `_writeMetadata.source = "ios_app"`

---

### Step 3: Deploy Firebase Security Rules

**IMPORTANT:** Deploy rules AFTER both web and iOS code are updated, or users will get "permission denied" errors.

#### Option A: Firebase Console (Easiest)

1. Go to https://console.firebase.google.com
2. Select project: `jetlagpro-research`
3. Click **Firestore Database** in left menu
4. Click **Rules** tab at top
5. Copy entire contents of `firestore.rules` file
6. Paste into editor
7. Click **Publish**

**You should see:**
```
Rules published successfully
```

#### Option B: Firebase CLI (For Future Updates)

```bash
# One-time setup (if not done)
npm install -g firebase-tools
firebase login
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

**Expected output:**
```
✔  Deploy complete!
```

---

### Step 4: Verify Rules Are Active

#### Test 1: Web Survey Still Works
1. Complete a survey submission
2. Verify data appears in Firebase
3. Check for `_writeMetadata` field
4. No errors in browser console

#### Test 2: iOS App Still Works
1. Complete a trip in app
2. Verify data appears in Firebase
3. Check for `_writeMetadata` field
4. No errors reported

#### Test 3: Console Writes Are BLOCKED ⚠️
1. Go to Firebase Console
2. Navigate to **Firestore Database** → **Data** tab
3. Try to manually create a document in `tripCompletions`
4. **Expected:** Permission denied error

**This is GOOD!** It means unauthorized writes are blocked.

#### Test 4: Old Data Still Readable
1. Open analytics dashboard at `/analytics-secret.html`
2. Verify all charts load
3. Old data (without `_writeMetadata`) can still be read
4. Only NEW writes require metadata

---

## 🔍 Monitoring (First Week)

**Daily Checks:**
- [ ] Survey submissions continue working
- [ ] iOS app trip completions continue working
- [ ] No user error reports
- [ ] New documents have `_writeMetadata` field

**Firebase Console Checks:**
1. Go to Firestore Database → Data → tripCompletions
2. Click on recent documents
3. Verify all have `_writeMetadata` field
4. Verify `source` is either "ios_app" or "web_survey"

**Analytics Dashboard Check:**
1. Open `/analytics-secret.html`
2. Verify data loads normally
3. Check Trip Stats section shows correct counts

---

## 🐛 Troubleshooting

### Issue: "Permission Denied" on Survey Submission

**Symptom:** Survey can't save, browser shows error

**Cause:** Metadata not being added correctly

**Solution:**
```javascript
// Check browser console for:
console.log('Writing with metadata:', surveyUpdateData._writeMetadata);

// If undefined, survey.js didn't update correctly
// Verify cache is cleared: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### Issue: "Permission Denied" from iOS App

**Symptom:** App can't save trip data

**Cause:** iOS app not including metadata

**Solution:**
1. Verify iOS code was updated per template
2. Check Xcode console for Firebase errors
3. Temporarily relax rules (see Rollback section)

### Issue: Rules Deployed But Console Writes Still Work

**Symptom:** Can still write from Firebase Console

**Cause:** Logged in as project owner (rules testing workaround)

**Solution:**
- Use Firebase Console "Rules Playground" to test as non-admin
- OR sign in with different Firebase account

### Issue: Old Survey Cache

**Symptom:** Some users can't submit, others can

**Cause:** Browser serving old JavaScript

**Solution:**
```html
<!-- Update survey.html to force cache refresh -->
<script src="survey.js?v=20251106"></script>
```

---

## 🔄 Rollback Procedure

### If Issues Arise After Deployment

**Temporary Permissive Rules:**

1. Go to Firebase Console → Firestore → Rules
2. Replace with this temporary rule:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tripCompletions/{tripId} {
      allow read: if true;
      allow write: if true;  // TEMPORARY - allows all writes
    }
  }
}
```
3. Click Publish
4. Fix the issue in code
5. Redeploy proper rules when ready

**This gives you time to fix issues without blocking users.**

---

## 📊 Success Metrics

Phase 1 is successful when:
- ✅ Survey submissions work normally (100% success rate)
- ✅ iOS app trip completions work normally (100% success rate)
- ✅ All new documents have `_writeMetadata` field (100% coverage)
- ✅ Console write attempts are blocked (0 unauthorized writes)
- ✅ Zero user-facing errors reported
- ✅ Analytics dashboard loads normally

---

## 📝 Post-Deployment Tasks

### Update Research Paper

Edit `research-paper.html` line 593:

**Before:**
```html
<p>A: Security rules were deployed on [DATE - to be filled in upon implementation]
```

**After:**
```html
<p>A: Security rules were deployed on November 6, 2025
```

### Document in Scratchpad

Add to `.cursor/scratchpad.md`:

```markdown
## Phase 1: Write Source Authentication - COMPLETED

**Deployment Date:** November 6, 2025

**Changes Deployed:**
- Web survey includes write metadata (survey.js lines 972-980, 1051-1059)
- iOS app includes write metadata (per iOS-WriteMetadata-Template.swift)
- Firebase Security Rules deployed (firestore.rules)

**Verification:**
- ✅ Survey submissions working (tested)
- ✅ iOS app working (tested)
- ✅ Console writes blocked (verified)
- ✅ All new documents have _writeMetadata

**Monitoring:**
- Daily checks for 7 days
- No user errors reported
- 100% of new writes include metadata
```

---

## 🎯 Next Steps After Phase 1

Once Phase 1 is stable (1-2 weeks of monitoring):

1. **Begin Phase 2:** Implement audit logging
2. **Monitor Weekly:** Check that no permission denied errors
3. **User Communication:** Inform users if any downtime planned
4. **iOS App Store:** Update app with metadata changes

---

## 📞 Support Contacts

**If you encounter issues:**
- Firebase Support: https://firebase.google.com/support
- This codebase: Check `.cursor/scratchpad.md` for context
- Rollback: Use temporary permissive rules (see above)

---

## ✅ Deployment Checklist Summary

- [ ] Tested web survey locally
- [ ] Updated iOS app code
- [ ] Tested iOS app
- [ ] Deployed Firebase Security Rules
- [ ] Verified web survey works
- [ ] Verified iOS app works
- [ ] Verified console writes blocked
- [ ] Verified old data readable
- [ ] Updated research paper date
- [ ] Documented in scratchpad
- [ ] Set up monitoring schedule

**Once all checked:** Phase 1 deployment is complete! ✅

---

## Timeline Estimate

- **Testing:** 1-2 hours
- **iOS App Update:** 2-3 hours
- **Rules Deployment:** 15 minutes
- **Verification:** 1 hour
- **Documentation:** 30 minutes

**Total:** ~5-7 hours

**Monitoring:** 15 minutes/day for first week

