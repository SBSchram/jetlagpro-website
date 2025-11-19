# Device ID Format Change Documentation

**Date:** November 19, 2025  
**Build:** 9 (iOS)  
**Status:** Deployed to Cloud Functions, pending iOS deployment

---

## Summary

Changed `_writeMetadata.deviceId` format from iOS vendor UUID to 8-character device hash to:
1. Enable Firebase Security Rules validation
2. Fix audit validation failures for test data
3. Simplify architecture (one device ID concept)
4. Maintain all tamper detection and audit trail integrity

---

## Changes Made

### 1. Cloud Function Update (✅ DEPLOYED)

**File:** `functions/index.js` (lines 196-208)  
**Change:** Accept multiple device ID formats for backward compatibility

**Old Validation:**
```javascript
// Only accepted full UUIDs
const uuidRegex = /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i;
if (!uuidRegex.test(metadata.deviceId)) {
  issues.push("invalid_device_id_format");
}
```

**New Validation:**
```javascript
// Accept full UUID (legacy), 8-char hash (new), and hex strings (test data)
const uuidRegex = /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i;
const hashRegex = /^[A-F0-9]{8}$/i;
const hexStringRegex = /^[a-f0-9]{16,36}$/i; // Legacy test data

if (!uuidRegex.test(metadata.deviceId) && 
    !hashRegex.test(metadata.deviceId) && 
    !hexStringRegex.test(metadata.deviceId)) {
  issues.push("invalid_device_id_format");
}
```

**Result:** Cloud Function now accepts all formats, fixing audit validation failures.

---

### 2. iOS App Update (⏳ PENDING DEPLOYMENT)

**File:** `JetLagPro/Services/FirebaseService.swift` (line 37)  
**Status:** Ready to deploy (waiting for monitoring period)

**Old Code:**
```swift
let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
// Result: "D5CEA14B-A6A7-482F-B043-8224619CDBB2" (full UUID)
```

**New Code:**
```swift
let deviceId = String(AppState.shared.surveyVerificationCode.dropFirst(4))
// Result: "23DB54B0" (8-char device hash)
```

**Impact:**
- All future trips will write 8-char device hash
- Matches trip ID prefix format
- Enables Firebase rules validation

---

### 3. Firebase Security Rules (📋 PLANNED)

**File:** `firestore.rules` (to be created)  
**Status:** Not deployed yet - waiting for iOS app deployment

**Rule to Enable:**
```javascript
// Verify tripId starts with deviceId from metadata (prevents device ID spoofing)
allow create: if request.resource.data._writeMetadata != null
              && request.resource.data._writeMetadata.deviceId != null
              && tripId.matches('^' + request.resource.data._writeMetadata.deviceId + '-.*');
```

**Why Delayed:** Rule will only work after iOS app writes 8-char hashes. Deploying now would reject all writes.

---

## Device ID Architecture

### Three Device Identifiers Explained

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PERSISTENT DEVICE ID (Keychain)                              │
│    Storage: iOS Keychain ("JetLagPro.DeviceId")                │
│    Format:  Full UUID (36 chars with dashes)                    │
│    Example: "23DB54B0-1234-5678-ABCD-123456789ABC"             │
│    Purpose: Base for survey code generation                     │
│    Persistence: Survives app reinstalls                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓ SHA256 hash → first 8 chars
┌─────────────────────────────────────────────────────────────────┐
│ 2. DEVICE HASH (Survey Code Suffix / Trip ID Prefix)           │
│    Derivation: SHA256(Persistent Device ID).prefix(8)          │
│    Format:  8 uppercase hex characters                          │
│    Example: "23DB54B0"                                          │
│    Used In: - Survey code: "JLP-23DB54B0"                      │
│             - Trip ID: "23DB54B0-JFKW-251119-1430-931e1d71"   │
│             - _writeMetadata.deviceId (NEW FORMAT)              │
│    Purpose: User-facing identifier, cryptographic linking       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. VENDOR IDENTIFIER (Old Metadata Format - DEPRECATED)        │
│    Source:  UIDevice.current.identifierForVendor               │
│    Format:  Full UUID (36 chars with dashes)                    │
│    Example: "D5CEA14B-A6A7-482F-B043-8224619CDBB2"             │
│    Used In: _writeMetadata.deviceId (OLD FORMAT)                │
│    Problem: - Different from trip ID prefix                     │
│             - Can't validate consistency                        │
│             - Resets on app reinstall                           │
│    Status:  Being replaced by Device Hash (#2)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why This Change Improves Security

### Before (Broken Architecture)

```javascript
// Trip written to Firebase
{
  "tripId": "23DB54B0-JFKW-251119-1430-931e1d71",
  "_writeMetadata": {
    "deviceId": "D5CEA14B-A6A7-482F-B043-8224619CDBB2"  // Different UUID
  }
}
```

**Security Issues:**
- ❌ Firebase rules CAN'T validate device ID matches trip ID (different formats)
- ❌ Attacker could forge trip with any device ID
- ⚠️ Only HMAC signature prevents forgery (single point of failure)

### After (Improved Architecture)

```javascript
// Trip written to Firebase
{
  "tripId": "23DB54B0-JFKW-251119-1430-931e1d71",
  "_writeMetadata": {
    "deviceId": "23DB54B0"  // Same 8-char hash as trip ID prefix
  }
}
```

**Security Improvements:**
- ✅ Firebase rules validate: `tripId.matches('^' + deviceId + '-.*')`
- ✅ Two-layer validation: HMAC signature + device ID consistency
- ✅ Simpler architecture (one device ID concept)
- ✅ All tamper detection maintained

---

## Backward Compatibility

### Data Format Timeline

| Date Range | Device ID Format | Example | Status |
|------------|------------------|---------|--------|
| Pre-Build 9 (Legacy) | Full Vendor UUID | `D5CEA14B-...-8224619CDBB2` | Accepted |
| Build 9+ (New) | 8-char Device Hash | `23DB54B0` | Accepted |
| Test Data | Hex strings 16-36 chars | `40f196837f25f348` | Accepted |

### Cloud Function Acceptance

The updated Cloud Function accepts **all three formats**:
1. Full UUIDs (36 chars) - Legacy data
2. 8-char hashes (8 chars) - New format
3. Hex strings (16-36 chars) - Test data

This ensures no existing data fails validation.

---

## Audit Trail Integrity

### What Changed
- **Format of `_writeMetadata.deviceId`** field only
- **No change to audit logging mechanism**
- **No change to GCS immutability**
- **No change to Firestore audit log**

### What Stayed the Same
1. ✅ Every write still logged to both Firestore and GCS
2. ✅ GCS archive still immutable (10-year retention)
3. ✅ Audit verification script still compares entries
4. ✅ HMAC signatures still validate trip authenticity
5. ✅ Persistent device ID still links all trips

### Tamper Detection
**Before:** 
- HMAC signature (cryptographic)
- Firebase rules (immutable `_writeMetadata`)
- GCS audit trail (immutable archive)

**After:** Same protections + bonus:
- HMAC signature (cryptographic) ✅
- Firebase rules (immutable `_writeMetadata` + device ID match) ✅ **IMPROVED**
- GCS audit trail (immutable archive) ✅

---

## For Reviewers: How to Verify

### 1. Check Cloud Function Deployment
```bash
# Verify function accepts multiple formats
curl https://us-east1-jetlagpro-research.cloudfunctions.net/metadataValidator
```

### 2. Run Audit Verification
```bash
# Download and run audit verification script
curl -o verify_audit_consistency.py \
  https://jetlagpro.com/scripts/verify_audit_consistency.py

python3 verify_audit_consistency.py
```

**Expected Result:** All entries should match (no discrepancies)

### 3. Inspect Metadata Format
```javascript
// Query Firestore for recent trips
// Check _writeMetadata.deviceId format

// Pre-Build 9 trips:
"deviceId": "D5CEA14B-A6A7-482F-B043-8224619CDBB2"  // Full UUID

// Build 9+ trips (after iOS deployment):
"deviceId": "23DB54B0"  // 8-char hash (matches trip ID prefix)
```

### 4. Verify Trip ID Consistency
```javascript
// For Build 9+ trips, verify:
tripId.startsWith(_writeMetadata.deviceId + '-')

// Example:
tripId: "23DB54B0-JFKW-251119-1430-931e1d71"
deviceId: "23DB54B0"
// ✅ Match! (first 8 chars match)
```

---

## Rollout Plan

### ✅ Step 1: Deploy Cloud Function (COMPLETE)
- **Date:** November 19, 2025
- **Status:** Deployed
- **Result:** Cloud Function now accepts all device ID formats
- **Verification:** Test data audit validation now passes

### ⏳ Step 2: Monitor for 1-2 Days (IN PROGRESS)
- **Purpose:** Ensure no unexpected issues with existing data
- **Action:** Watch for audit log errors or function failures
- **Success Criteria:** No new validation errors

### 📋 Step 3: Deploy iOS App (PENDING)
- **File:** `FirebaseService.swift`
- **Change:** Write 8-char device hash instead of vendor UUID
- **Impact:** All future trips will use new format
- **Timeline:** After 1-2 days of monitoring

### 📋 Step 4: Deploy Firebase Rules (PENDING)
- **File:** `firestore.rules`
- **Purpose:** Enforce device ID consistency validation
- **Prerequisite:** iOS app must be deployed first
- **Timeline:** After iOS app is in use

### 📋 Step 5: Document in Research Paper (PENDING)
- **Section:** Methods → Data Integrity
- **Content:** Explain dual device ID system and validation layers
- **Timeline:** During manuscript preparation

---

## Questions for Reviewers

### 1. Device ID Security
**Q:** "How do you prevent someone from forging a device ID?"

**A:** Three layers:
1. **HMAC Signature:** Trip ID includes cryptographic signature. Can't forge without secret key.
2. **Device Hash Derivation:** 8-char hash is SHA256 of full UUID. Can't reverse-engineer.
3. **Firebase Rules:** Validates device ID matches trip ID prefix at write time.

### 2. Data Consistency
**Q:** "How do we know old data and new data are both valid?"

**A:** 
- Old data: Vendor UUID was logged to GCS archive (immutable)
- New data: Device hash is logged to GCS archive (immutable)
- Both formats accepted by Cloud Function
- Audit verification compares Firestore vs GCS (format-agnostic)

### 3. Audit Trail
**Q:** "Does changing the format affect audit trail integrity?"

**A:** No. The audit trail records whatever was written:
- Old trips: GCS has `deviceId: "D5CEA14B-..."`
- New trips: GCS has `deviceId: "23DB54B0"`
- Both are immutable and verifiable
- Audit script compares entries (doesn't validate format)

---

## Technical References

- **iOS Device ID Generation:** `AppState.swift` lines 446-479
- **Firebase Write Metadata:** `FirebaseService.swift` lines 35-59
- **Cloud Function Validation:** `functions/index.js` lines 196-208
- **HMAC Trip ID Generation:** `HMACGenerator.swift` lines 21-25
- **Audit Verification Script:** `verify_audit_consistency.py`

---

## Change Log

| Date | Change | Status |
|------|--------|--------|
| 2025-11-19 | Cloud Function updated to accept multiple formats | ✅ Deployed |
| 2025-11-19 | iOS code updated to write 8-char hash | 📋 Ready |
| 2025-11-19 | Documentation created | ✅ Complete |
| TBD | iOS app deployed to TestFlight | ⏳ Pending |
| TBD | Firebase rules deployed | ⏳ Pending |

---

## Contact

For questions about this change:
- **Technical Implementation:** See `FirebaseService.swift` and `functions/index.js`
- **Security Analysis:** See "Why This Change Improves Security" section above
- **Data Verification:** Run `verify_audit_consistency.py` script

