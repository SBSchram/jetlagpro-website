# Data Integrity Implementation

**Last Updated:** December 11, 2025  
**Purpose:** Practical guide for verifying data integrity safeguards

**Major Update (Dec 11, 2025):** Metadata validation removed. HMAC signatures provide all necessary security. See "Evolution of Security Architecture" section below.

---

## Overview

All research data is written to Firestore `tripCompletions` collection. Cloud Functions automatically log every operation to both Firestore `auditLog` (real-time viewing) and Google Cloud Storage `jetlagpro-audit-logs` (immutable archive). This dual-write system enables independent verification that the live database matches the permanent archive.

**Status:** All systems deployed and operational as of November 11, 2025.

---

## Data Flow

### 1. iOS App Writes

iOS app writes trip completion data directly to Firestore `tripCompletions` collection.

**What gets written:**
- Trip data (destination, dates, points completed, etc.)
- No metadata (removed Dec 11, 2025 - HMAC provides sufficient security)

**Example trip ID:** `2330B376-MXPE-251111-1622-A7F3C9E2`
- Device ID: `2330B376`
- Destination: `MXPE` (Mexico City, Eastbound)
- Date: `251111` (Nov 11, 2025)
- Time: `1622` (4:22 PM)
- HMAC signature: `A7F3C9E2` (cryptographic validation)

### 2. Web Survey Writes

Web survey updates the existing `tripCompletions` document (does not create new document).

**What gets written:**
- Survey responses (symptom ratings, comments)
- `surveyCompleted: true`
- `surveySubmittedAt: timestamp`
- No metadata (removed Dec 11, 2025 - operation type identifies survey submissions)

### 3. Cloud Functions Automatic Logging

When any write occurs to `tripCompletions`, Cloud Functions automatically trigger and write audit entries to both systems.

**Functions deployed:**
1. **auditLoggerCreate** - Logs document creation (source: ios_app)
2. **auditLoggerUpdate** - Logs document updates (source: web_survey if surveyCompleted)
3. **auditLoggerDelete** - Logs document deletions
4. **hmacValidator** - Validates HMAC signatures in trip IDs (primary security)

**Dual-write system:**
- **Firestore `auditLog` collection:** Real-time viewing, queryable, mutable
- **GCS `jetlagpro-audit-logs` bucket:** Immutable, 10-year retention, publicly readable

**Example audit entry:**
```json
{
  "operation": "CREATE",
  "collection": "tripCompletions",
  "documentId": "2330B376-MXPE-251111-1622-A7F3C9E2",
  "tripId": "2330B376-MXPE-251111-1622-A7F3C9E2",
  "timestamp": "2025-11-11T10:00:01.234Z",
  "source": "ios_app",
  "eventId": "abc123..."
}
```
*Note: Source determined by operation type (CREATE = ios_app, UPDATE with surveyCompleted = web_survey)*

---

## Verification Tools

Two web-based tools are available to help you verify the integrity of the system. These tools run entirely in your browser. No installation or command-line tools required. They provide a straightforward way to inspect the audit logs and confirm that the live database matches the immutable archive.

### Audit Log Viewer

**URL:** `https://jetlagpro.com/reviewers/audit-log.html`

The audit log viewer provides a real-time interface to explore all database operations. You can see every trip creation, survey submission, and any other changes to the database. This tool connects directly to the Firestore database, so it shows current data as it exists now.

**What it shows:**
- Real-time view of all audit log entries
- All CREATE, UPDATE, DELETE operations with timestamps
- Source identification for each operation (ios_app, web_survey, firebase_console)
- HMAC signature validation results
- Metadata validation results

**How to use:**
1. Open the URL in your browser
2. Browse the timeline of all operations (most recent first)
3. Use the filter options to focus on specific:
   - Operation types (CREATE, UPDATE, DELETE)
   - Sources (iOS app, web survey, console)
   - Date ranges
4. Click on any entry to see full details
5. Export to CSV if you want to analyze the data offline

**What to look for:**
- Trip creations should show `source: "ios_app"` or `source: "web_survey"`
- You should not see unauthorized `source: "firebase_console"` entries (except known test data from before deployment)
- HMAC validation should show `valid: true` for all trip IDs created after Build 6
- Updates should show clear `changes` fields indicating which survey fields were added

This viewer helps you understand the flow of data—when trips were created by the app, when surveys were completed, and that all operations are properly logged.

### Verification Tool

**URL:** `https://jetlagpro.com/reviewers/verify.html`

The verification tool compares the live Firestore audit log against the immutable GCS archive. Since GCS files cannot be deleted or modified (due to the 10-year retention policy), comparing these two systems confirms whether the live database has been tampered with. The tool runs entirely in your browser—it downloads both data sources and performs the comparison automatically.

**What it does:**
- Downloads audit entries from both Firestore and GCS
- Compares entries to detect any discrepancies
- Identifies missing entries, content mismatches, or potential tampering
- No gsutil or command-line tools required—everything runs in your browser

**How to use:**
1. Open the URL in your browser
2. Click "Run Verification"
3. Wait for the tool to download and compare entries (this may take a minute)
4. Review the results:
   - **Matched:** Firestore and GCS entries are identical (expected for post-deployment entries)
   - **Missing in GCS:** Pre-deployment entries that exist only in Firestore (expected, as GCS archiving started Nov 11, 2025)
   - **Missing in Firestore:** Entries in GCS but not Firestore (unexpected—would indicate data deletion)
   - **Mismatched:** Entries exist in both but content differs (unexpected—would indicate data modification)

**Expected results:**
- All post-deployment entries (after Nov 11, 2025) should show as "Matched"
- Pre-deployment entries (before Nov 11, 2025) may show as "Missing in GCS" (this is expected)
- Zero discrepancies (mismatched or missing in Firestore) for post-deployment data

If you see discrepancies in post-deployment entries, that would indicate potential issues that should be investigated further.

**Manual verification (optional):**

If you prefer to run the verification yourself using command-line tools, you can:

```bash
# Download Firestore audit data
curl -s "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/auditLog?pageSize=1000" \
  -o firestore-audit.json

# Download GCS archive
gsutil -m rsync -r gs://jetlagpro-audit-logs/audit-logs ./gcs-audit

# Run verification script
python scripts/verify_audit_consistency.py \
  --firestore firestore-audit.json \
  --gcs-dir ./gcs-audit
```

However, the web-based tool performs the same verification automatically and is recommended for most reviewers.

---

## Verification Checklist

This section guides you through verifying the key integrity safeguards. Each check confirms that a specific protection mechanism is working correctly. The verification tools make these checks straightforward—you don't need deep technical knowledge to confirm the system is functioning as designed.

### 1. Data Provenance

Every trip completion includes metadata that identifies its source. This allows you to verify that data came from legitimate sources (the iOS app or web survey) rather than manual console writes. This is important because it provides a chain of custody for each data point.

**What to verify:** Every trip has identifiable source metadata showing it came from the app or survey.

**How to verify:**
- Open `audit-log.html`
- Filter by operation: CREATE
- You should see entries showing `source: "ios_app"` or `source: "web_survey"`
- You should not see entries with `source: "firebase_console"` (except documented test data from before deployment)

**What you'll see:**
```
Trip ID: 2330B376-MXPE-251111-1622-A7F3C9E2
Source: ios_app
Device ID: 2330B376
App Version: 1.2.0 (Build 6)
Timestamp: 2025-11-11T10:00:00.000Z
```

This tells you the trip was created by the iOS app (version 1.2.0, build 6) running on device 2330B376 at the specified timestamp.

### 2. HMAC Signature Validation

Trip IDs include a cryptographic signature that prevents forgery. This signature is automatically validated when trips are created, ensuring that trip IDs cannot be fabricated without access to the app's secret key. This protects against someone creating fake trip records.

**What to verify:** All trip IDs have valid cryptographic signatures that confirm authenticity.

**How to verify:**
- Open `audit-log.html`
- Filter by operation: VALIDATION
- You should see entries showing `valid: true` or `reason: "legacy_format"` (for trips created before Build 6, which is expected)
- You should not see entries with `valid: false` and `reason: "signature_mismatch"`

**What HMAC validates:**
Trip IDs follow the format: `DEVICEID-DEST-DATE-TIME-SIGNATURE`. The signature is a cryptographic hash of the first four parts, calculated using a secret key only available in the deployed app. If any part of the trip ID is modified, the signature won't match, indicating the trip ID was fabricated.

### 3. Immutable Archive Consistency

The dual-write system logs every operation to both Firestore (for real-time viewing) and Google Cloud Storage (for immutable archiving). The verification tool compares these two systems to ensure they match. Since GCS files cannot be deleted or modified (due to the 10-year retention policy), any discrepancies would indicate tampering with the Firestore records.

**What to verify:** Firestore audit log matches the GCS immutable archive.

**How to verify:**
- Open `verify.html`
- Click "Run Verification"
- The tool will compare entries from both systems
- For post-deployment entries (after Nov 11, 2025), the discrepancy count should be 0
- The "Missing in GCS" list should only contain pre-deployment entries (which is expected, as GCS archiving started on Nov 11, 2025)

**How matching works:**
The verification tool uses a composite key (`operation-documentId`) to match entries between Firestore and GCS. This is important because:
- One document creation event can produce multiple audit entries (CREATE, METADATA_VALIDATION_FAILED, HMAC_VALIDATION_FAILED)
- These entries share the same `eventId` (which identifies the source event, not the audit entry)
- Using `operation-documentId` ensures each audit entry is matched independently
- For example: `CREATE-{tripId}` matches the CREATE entry, while `METADATA_VALIDATION_FAILED-{tripId}` matches the validation entry

**What this confirms:**
**Normalization safeguards:**
Before hashing, both Firestore and GCS entries are normalized by stripping null / undefined fields and empty metadata objects. This eliminates false mismatches caused by Firestore omitting optional values (for example, `travelDirection` or `_writeMetadata` fields set to null) while still surfacing real differences.

**If you see a discrepancy (post–Nov 21, 2025 verifier build):**
1. Check the verifier build label on `verify.html` and confirm it matches the latest commit noted in the release notes.
2. Re-run the tool after a hard refresh (Cmd/Ctrl + Shift + R) to ensure cached code isn’t being used.
3. If the mismatch references a trip before Nov 20, 2025, consult the “Known Exceptions” list—those legacy entries are documented.
4. For new data mismatches, capture the trip ID and raw Firestore/GCS payloads from the tool output and contact the research team; this indicates an actual data integrity issue.

**What this confirms:**
- No audit entries have been deleted from Firestore
- No audit entries have been modified
- The GCS archive is the authoritative source of truth

If you see discrepancies in post-deployment entries, that would indicate potential tampering with Firestore records, which should be investigated further.

### 4. Survey Data Integrity

When participants complete surveys, their responses update the existing trip record. The system preserves the original trip creation metadata while adding survey-specific metadata. This allows you to trace both when the trip was completed (from the app) and when the survey was submitted (from the web).

**What to verify:** Survey submissions are properly logged and traceable to their source.

**How to verify:**
- Open `audit-log.html`
- Filter by operation: UPDATE
- You should see updates showing `source: "web_survey"` in the `_surveyMetadata` field
- The `changes` field should show survey-related fields being added (e.g., `surveyCompleted`, `sleepPost`, `fatiguePost`, etc.)
- The original `_writeMetadata` should be preserved (not overwritten), showing the trip was originally created by the iOS app

**What you'll see:**
```
Trip ID: 2330B376-MXPE-251111-1622-A7F3C9E2
Operation: UPDATE
Source: web_survey
Changed Fields: surveyCompleted, surveySubmittedAt, sleepPost, fatiguePost, ...
Original Source: ios_app (preserved in _writeMetadata)
```

This shows the trip was created by the iOS app, and later updated with survey data from the web survey. Both metadata objects are preserved, providing a complete audit trail.

### 5. GCS Archive Accessibility

The GCS bucket is configured for public read access, allowing anyone to download and verify the immutable archive. The retention policy is locked, meaning files cannot be deleted for 10 years, even by the project owner. This makes the GCS archive the definitive record of all operations.

**What to verify:** The GCS bucket is publicly accessible and contains the expected audit log files.

**How to verify:**

If you have `gsutil` installed (part of Google Cloud SDK), you can verify directly:

```bash
# List files in GCS bucket
gsutil ls gs://jetlagpro-audit-logs/audit-logs/ | head -10

# Download a sample file to inspect
gsutil cp gs://jetlagpro-audit-logs/audit-logs/[filename].json ./sample.json

# Verify retention policy is locked
gsutil retention get gs://jetlagpro-audit-logs
# Should show: Retention Policy (LOCKED)
```

**What you should find:**
- Files are publicly readable (no authentication required)
- Files are JSON format containing complete audit entry data
- Retention policy shows as LOCKED (confirming files cannot be deleted for 10 years)

If you don't have `gsutil` installed, you can still verify accessibility using the web-based verification tool at `verify.html`, which downloads and compares GCS files automatically. The fact that the tool successfully accesses GCS files confirms the bucket is publicly readable.

---

## Technical Details

### Cloud Functions

**Location:** `functions/index.js`  
**Region:** us-east1  
**Runtime:** Node.js 22 (2nd Gen)

**Functions:**
- `auditLoggerCreate` - Triggers on `tripCompletions` document creation
- `auditLoggerUpdate` - Triggers on `tripCompletions` document update
- `auditLoggerDelete` - Triggers on `tripCompletions` document deletion
- `hmacValidator` - Validates trip ID signatures
- `metadataValidator` - Validates metadata consistency

**Dual-write implementation:**
```javascript
async function writeAuditEntry(auditEntry) {
  // Write to Firestore (real-time)
  const firestoreRef = await db.collection("auditLog").add(auditEntry);
  
  // Write to GCS (immutable)
  const fileName = `${timestamp}-${operation}-${tripId}.json`;
  const file = auditBucket.file(`audit-logs/${fileName}`);
  await file.save(JSON.stringify(auditEntry, null, 2));
}
```

### GCS Bucket Configuration

**Bucket:** `gs://jetlagpro-audit-logs`  
**Location:** us-east1  
**Retention Policy:** 10 years (LOCKED)  
**Access:** Public read (`allUsers:objectViewer`)  
**Versioning:** Enabled  
**Uniform Bucket-Level Access:** Enabled

**File naming:** `{timestamp}-{operation}-{tripId}.json`

**Example:** `1699718401234-CREATE-2330B376-MXPE-251111-1622-A7F3C9E2.json`

### Firebase Security Rules

**File:** `firestore.rules`

**Key rules:**
- Blocks creates without `_writeMetadata`
- Blocks updates after `surveyCompleted: true` (except allowed fields)
- Blocks ALL deletes
- Only allows writes from `ios_app` or `web_survey` sources

---

## Implementation Timeline

| Date | Feature | Status |
|------|---------|--------|
| November 2025 | Write Source Authentication | Deployed |
| November 11, 2025 | Audit Logging & HMAC Validation | Deployed |
| November 11, 2025 | Immutable Audit Logs (GCS) | Deployed |

---

## Resources

**Verification Tools:**
- Audit Log Viewer: `https://jetlagpro.com/reviewers/audit-log.html`
- Verification Tool: `https://jetlagpro.com/reviewers/verify.html`

**GCS Archive:**
- Public bucket: `gs://jetlagpro-audit-logs/audit-logs/`
- Direct access: `https://storage.googleapis.com/jetlagpro-audit-logs/audit-logs/`

**Source Code:**
- Cloud Functions: `https://github.com/SBSchram/jetlagpro-website/tree/main/functions`
- Verification Script: `https://github.com/SBSchram/jetlagpro-website/tree/main/scripts`

**Documentation:**
- Research Paper Appendix: `https://jetlagpro.com/research-paper.html#appendix-data-integrity`

---

## Evolution of Security Architecture

### December 11, 2025: Metadata Removal

**The Discovery:**
During routine monitoring, 9 `METADATA_VALIDATION_FAILED` entries appeared in the audit log (Nov 18 - Dec 9, 2025). Analysis revealed:
- 8 failures: `appBuild: "0"` (development builds incorrectly rejected)
- 1 failure: 16-char hex device ID from Android emulator

**All failures were false positives - bugs in our validation logic, not data quality issues.**

**The Insight:**
This prompted a fundamental question: "Why are we validating metadata at all?"

Analysis revealed that metadata validation was **redundant security theater**:

1. **`_writeMetadata`** claimed to prevent fabricated trips
   - But HMAC signatures already cryptographically prove trip authenticity
   - Developer could format metadata correctly if fabricating data
   - Device ID and timestamp already embedded in tripId
   - Firestore automatically tracks server timestamps

2. **`_surveyMetadata`** claimed to track survey source
   - But operation type (UPDATE) already identifies survey submissions
   - `surveyCompleted: true` proves survey was submitted
   - Browser info wasn't used for research analysis

**The Decision:**
Remove all metadata validation and collection. The HMAC signature and immutable audit trail provide all necessary security.

**Changes Made:**

**Removed:**
- `_writeMetadata` from iOS/React Native apps
- `_surveyMetadata` from web survey
- `metadataValidator` Cloud Function
- Metadata requirements from Firebase Security Rules
- "Threat #4: Metadata Forgery" from research paper

**Simplified:**
- Source detection now based on operation type:
  - CREATE = ios_app
  - UPDATE with surveyCompleted = web_survey  
  - Other = firebase_console

**Benefits:**
- ✅ 150+ lines of code removed
- ✅ Zero validation false positives
- ✅ No redundant data stored
- ✅ Simpler, more honest security model
- ✅ DRY principle: deviceId/timestamp not duplicated
- ✅ Cleaner research paper (7 threats instead of 9)

**What Provides Security:**
1. **HMAC Signature** - Cryptographically unforgeable proof of app origin
2. **Immutable GCS Audit Trail** - Tamper detection through dual-write system
3. **Firestore Server Timestamps** - Automatic, unforgeable timing
4. **Operation Types** - CREATE vs UPDATE identifies source

**Lesson Learned:**
Validation failures can be gifts. They expose unnecessary complexity and lead to architectural simplification. In this case, chasing down false positives revealed that an entire layer of "security" was redundant theater that added overhead without providing actual protection.

The HMAC signature was always sufficient. Metadata validation was security theater that created busywork (managing validation failures) while providing zero additional protection against the threat it claimed to address.

---

**Last Updated:** December 11, 2025  
**Maintained By:** Steven Schram PhD, DC, LAc  
**Repository:** https://github.com/SBSchram/jetlagpro-website
