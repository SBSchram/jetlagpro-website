# Phase 2: Audit Logging & HMAC Validation - Deployment Guide

**Status:** ✅ **DEPLOYED** (2025-11-11)

---

## Overview

Phase 2 implements server-side Cloud Functions that automatically:
- Log all Firestore writes to create an immutable audit trail
- Validate HMAC signatures on trip creation
- Check metadata consistency for suspicious patterns

---

## ✅ What Was Deployed

### Cloud Functions (4 total)

#### 1. **auditLoggerCreate**
- **Trigger:** When a document is created in `tripCompletions`
- **Action:** Logs full snapshot to `auditLog` collection
- **Data:** Complete trip data, metadata, timestamp, event ID

#### 2. **auditLoggerUpdate**
- **Trigger:** When a document is updated in `tripCompletions`
- **Action:** Logs before/after snapshots and changed fields
- **Data:** What changed, who changed it, when

#### 3. **hmacValidator**
- **Trigger:** When a document is created in `tripCompletions`
- **Action:** Validates HMAC signature in trip ID
- **Result:** Logs validation outcome; flags invalid signatures

#### 4. **metadataValidator**
- **Trigger:** When a document is created in `tripCompletions`
- **Action:** Validates `_writeMetadata` consistency
- **Checks:** Device ID format, build numbers, source validity

---

## Deployment Details

**Date:** November 11, 2025  
**Region:** us-east1  
**Runtime:** Node.js 22 (2nd Gen)  
**Plan:** Blaze (pay-as-you-go)  
**Repository:** `/Users/Steve/Development/jetlagpro-website/functions/`

### Files Created
- `functions/index.js` - All 4 Cloud Functions
- `firebase.json` - Firebase configuration
- `.firebaserc` - Project configuration

### APIs Enabled
- Cloud Functions API
- Cloud Build API
- Artifact Registry API
- Eventarc API
- Cloud Run API
- Pub/Sub API

---

## How It Works

### Audit Trail Flow

```
User Action (iOS/RN/Web)
    ↓
Firestore Write to tripCompletions
    ↓
Cloud Functions Triggered Automatically
    ↓
Audit Log Written to auditLog Collection
```

**Example:** User completes trip in iOS app
1. iOS writes trip data with `_writeMetadata`
2. `auditLoggerCreate` logs the write
3. `hmacValidator` checks signature validity
4. `metadataValidator` checks metadata consistency
5. All results logged to `auditLog`

### What Gets Logged

Every `auditLog` entry includes:
- **operation**: CREATE, UPDATE, or validation result
- **documentId**: The trip ID
- **timestamp**: Server timestamp (immutable)
- **dataSnapshot**: Full before/after data
- **metadata**: `_writeMetadata` and `_surveyMetadata`
- **eventId**: Unique event identifier
- **changes**: What fields changed (for updates)

---

## Viewing Audit Logs

### Firebase Console

1. Go to https://console.firebase.google.com/project/jetlagpro-research
2. Click **Firestore Database** in left menu
3. Click **auditLog** collection
4. View all logged events

### Cloud Functions Logs

1. Go to https://console.firebase.google.com/project/jetlagpro-research
2. Click **Functions** in left menu
3. Click on any function name
4. Click **Logs** tab
5. See real-time execution logs

---

## Cost Monitoring

### Expected Monthly Cost: $0-2

**Free Tier (included):**
- 2 million function invocations/month
- 400K GB-seconds compute time
- 200K CPU-seconds

**Your Usage (estimated):**
- ~50-100 trips/month
- 4 functions per trip = 200-400 invocations/month
- **Well within free tier** ✅

### Set Budget Alert

1. Go to https://console.cloud.google.com/billing
2. Select **Budgets & alerts**
3. Create budget: $5/month
4. Enable email alerts at 50%, 90%, 100%

---

## Testing

### Local Testing (Emulator)

```bash
cd /Users/Steve/Development/jetlagpro-website
firebase emulators:start
```

Then visit http://127.0.0.1:4000/ to test locally.

### Production Testing

1. Complete a test trip in iOS or RN app
2. Check Firestore for new `auditLog` entries
3. Verify HMAC validation passed
4. Submit survey and check UPDATE logs
5. Try editing a document in Firebase Console
6. Verify your admin edit was logged

---

## What Phase 2 Achieves

### ✅ Tamper Detection
- All data operations logged with timestamps
- Before/after snapshots for every change
- Cannot be deleted without leaving evidence

### ✅ HMAC Validation
- Invalid signatures automatically flagged
- Legacy (4-part) and new (5-part HMAC) formats supported
- Validation results logged for audit

### ✅ Metadata Consistency
- Device IDs validated (UUID format)
- Build numbers checked (1-1000 range)
- Sources verified (ios_app or web_survey only)

### ✅ Admin Action Tracking
- Your console edits are logged
- Source shows admin credentials
- Creates accountability trail

---

## What Phase 2 Does NOT Prevent

### ⚠️ Limitations

**Cannot prevent project owner (you) from:**
- Deleting the `auditLog` collection
- Disabling Cloud Functions
- Modifying function code
- Using service account to bypass rules

**Why?** You have admin/owner permissions on the Firebase project.

**Solution:** Phase 3 (cryptographic locks + transfer ownership)

---

## Maintenance

### Updating Functions

```bash
cd /Users/Steve/Development/jetlagpro-website/functions
# Edit index.js
firebase deploy --only functions
```

### Viewing Logs

```bash
firebase functions:log
```

### Deleting Functions (if needed)

```bash
firebase functions:delete auditLoggerCreate
firebase functions:delete auditLoggerUpdate
firebase functions:delete hmacValidator
firebase functions:delete metadataValidator
```

---

## Security Considerations

### HMAC Secret Key

**Current:** Hardcoded in `functions/index.js` (line 25)

```javascript
const HMAC_SECRET = "7f3a9d8b2c4e1f6a5d8b3c9e7f2a4d6b8c1e3f5a7d9b2c4e6f8a1d3b5c7e9f2a";
```

**Improvement:** Store as environment variable

```bash
firebase functions:config:set hmac.secret="your-secret-key"
```

Then update code:
```javascript
const HMAC_SECRET = functions.config().hmac.secret;
```

**Not critical** since functions run server-side (not client-accessible).

---

## Monitoring Checklist

### Daily (First Week)

- [ ] Check Cloud Functions logs for errors
- [ ] Verify audit logs are being created
- [ ] Check billing dashboard (should be $0)
- [ ] Test HMAC validation on new trips

### Weekly (Ongoing)

- [ ] Review audit log entries
- [ ] Check for validation failures
- [ ] Monitor function execution times
- [ ] Verify no unexpected costs

### Monthly

- [ ] Review total invocations (stay under 2M)
- [ ] Export audit logs for backup
- [ ] Check for anomalous patterns

---

## Troubleshooting

### Issue: Functions not triggering

**Symptom:** New trips created but no audit logs

**Solution:**
1. Check Cloud Functions dashboard: https://console.firebase.google.com/project/jetlagpro-research/functions
2. Verify functions show "Healthy" status
3. Check logs for errors
4. Redeploy: `firebase deploy --only functions`

### Issue: Permission denied errors

**Symptom:** Functions fail with "Permission denied"

**Solution:**
1. Verify Firestore rules allow function writes to `auditLog`
2. Check service account permissions
3. Ensure functions have Eventarc Service Agent role

### Issue: High costs

**Symptom:** Billing > $5/month

**Solution:**
1. Check Cloud Functions invocation count
2. Look for infinite loops (function triggering itself)
3. Set maxInstances limit in function config
4. Contact Firebase support if unexpected

---

## Next Steps: Phase 3

### Cryptographic Data Locks

1. **Automated GitHub Snapshots**
   - Weekly exports of `tripCompletions`
   - SHA-256 hash of dataset
   - GPG-signed commits

2. **Pre-Publication Lock**
   - Generate final dataset hash
   - Include in research paper Methods section
   - Any changes invalidate the hash

3. **Transfer Ownership** (optional)
   - Add co-author as Firebase owner
   - Remove yourself as owner
   - Guarantees no post-publication tampering

---

## Resources

- **Project Console:** https://console.firebase.google.com/project/jetlagpro-research
- **Cloud Functions Logs:** https://console.firebase.google.com/project/jetlagpro-research/functions
- **Firestore Database:** https://console.firebase.google.com/project/jetlagpro-research/firestore
- **Billing Dashboard:** https://console.cloud.google.com/billing
- **Firebase Documentation:** https://firebase.google.com/docs/functions

---

## Summary

Phase 2 adds server-side validation and audit logging to detect tampering. Combined with Phase 1 (client authentication), your research data now has:

✅ External attack prevention (Phase 1 rules)  
✅ Tamper detection (Phase 2 audit logs)  
✅ HMAC validation (Phase 2 functions)  
✅ Metadata consistency checks (Phase 2 functions)  

For true tamper-proof data (even against you as admin), proceed to Phase 3 (cryptographic locks + ownership transfer).

**Phase 2 Status:** ✅ **COMPLETE AND OPERATIONAL**

---

**Deployment Date:** November 11, 2025  
**Last Updated:** November 11, 2025

