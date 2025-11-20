# Phase 2.5: Immutable Audit Logs (GCS)

**Status:** 📋 **READY FOR DEPLOYMENT**  
**Date:** November 11, 2025

## Overview

Dual-write audit logs to Google Cloud Storage with 10-year locked retention policy. Makes audit trail truly immutable - even project owner cannot delete files.

## Architecture

```
Trip Event → Cloud Function → Firestore (real-time) + GCS (immutable)
```

- **Firestore:** Fast queries, real-time viewer
- **GCS:** Immutable archive, publicly readable, authoritative source

## Deployment Steps

### 1. Install SDK
```bash
cd functions
npm install @google-cloud/storage
```

### 2. Create GCS Bucket
```bash
gcloud config set project jetlagpro-research
gsutil mb -c STANDARD -l us-east1 gs://jetlagpro-audit-logs
gsutil retention set 10y gs://jetlagpro-audit-logs
gsutil versioning set on gs://jetlagpro-audit-logs
gsutil uniformbucketlevelaccess set on gs://jetlagpro-audit-logs
gsutil iam ch allUsers:objectViewer gs://jetlagpro-audit-logs
```

### 3. Update Cloud Functions

**File:** `functions/index.js`

Add imports:
```javascript
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const auditBucket = storage.bucket('jetlagpro-audit-logs');
```

Add helper function:
```javascript
async function writeAuditEntry(auditEntry) {
  // Write to Firestore
  const firestoreRef = await db.collection('auditLog').add(auditEntry);
  
  // Write to GCS
  const timestamp = Date.now();
  const operation = auditEntry.operation || 'UNKNOWN';
  const tripId = auditEntry.tripId || auditEntry.documentId || 'unknown';
  const fileName = `${timestamp}-${operation}-${tripId}.json`;
  const file = auditBucket.file(`audit-logs/${fileName}`);
  
  await file.save(JSON.stringify(auditEntry, null, 2), {
    metadata: {
      contentType: 'application/json',
      operation: operation,
      tripId: tripId,
      severity: auditEntry.severity || 'INFO',
      firestoreDocId: firestoreRef.id
    }
  });
}
```

Replace all `db.collection('auditLog').add()` calls with `await writeAuditEntry()`.

### 4. Deploy & Test
```bash
firebase deploy --only functions
```

Test:
- Create test trip
- Verify entries in Firestore Console
- Verify files in GCS: `gsutil ls gs://jetlagpro-audit-logs/audit-logs/`
- Test deletion (should fail): `gsutil rm gs://jetlagpro-audit-logs/audit-logs/[file]`

### 5. Lock Retention Policy ⚠️ IRREVERSIBLE

**Only after 48+ hours of successful testing:**

```bash
gsutil retention lock gs://jetlagpro-audit-logs
# Type bucket name to confirm: jetlagpro-audit-logs
```

**Verify locked:**
```bash
gsutil retention get gs://jetlagpro-audit-logs
# Should show: Retention Policy (LOCKED)
```

## Cost

~$0.06/year for 100 trips/month (essentially free)

## Testing Checklist

- [ ] GCS bucket created
- [ ] Cloud Functions deployed
- [ ] Test trip creates entries in both Firestore + GCS
- [ ] GCS files publicly readable
- [ ] Deletion fails (retention policy working)
- [ ] Run for 48+ hours
- [ ] Lock retention policy (when ready)

## Rollback (Before Locking Only)

```bash
gsutil retention clear gs://jetlagpro-audit-logs
gsutil -m rm -r gs://jetlagpro-audit-logs/**
gsutil rb gs://jetlagpro-audit-logs
```

**After locking:** No rollback possible - files are immutable for 10 years.

## Resources

- [GCS Retention Policies](https://cloud.google.com/storage/docs/bucket-lock)
- [HIPAA Compliance on GCP](https://cloud.google.com/security/compliance/hipaa)
