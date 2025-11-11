# Audit Log Viewer

## Overview

The Audit Log Viewer provides a clean, minimal interface for external reviewers to verify research data integrity through a complete tamper-detection trail.

## Access

**URL:** `https://jetlagpro.com/audit-log.html`

## Features

### 1. **Timeline View**
- Chronological display of all data operations
- Color-coded by operation type (CREATE/UPDATE/VALIDATION)
- Severity badges (INFO/WARNING/ERROR)

### 2. **Filtering**
- **Operation Type:** CREATE, UPDATE, VALIDATION
- **Severity Level:** INFO, WARNING, ERROR
- **Trip ID Search:** Find specific trips
- **Date Range:** Today, Last 7 days, Last 30 days, All time

### 3. **Summary Statistics**
- Total audit entries
- Breakdown by operation type
- Warning/error count for quick anomaly detection

### 4. **Detailed Information**
Each audit entry shows:
- **Timestamp** (with timezone)
- **Operation type** (CREATE/UPDATE/VALIDATION)
- **Trip ID** (for data traceability)
- **Source** (ios_app, web_survey, cloud_function)
- **Changed fields** (for UPDATE operations)
- **Validation results** (for VALIDATION operations)
- **Human-readable message**

### 5. **Export Functionality**
- CSV export for external analysis
- Includes all filtered entries
- Formatted for research documentation

## What Gets Logged

### CREATE Operations
- New trip completion submitted (app or web survey)
- Records initial state snapshot
- Validates HMAC signature and metadata

### UPDATE Operations
- Point completion updates during active trip
- Survey edits/resubmissions
- Shows exactly which fields changed

### VALIDATION Operations
- HMAC signature verification results
- Metadata consistency checks
- Detects missing or malformed metadata

## Use Cases

### For Researchers
- **Daily monitoring:** Quick check for suspicious activity
- **Pre-publication review:** Verify data integrity before submitting paper
- **Anomaly detection:** Identify unusual patterns or errors
- **Compliance:** Demonstrate audit trail to ethics committee

### For External Reviewers
- **Data verification:** Independent verification of research integrity
- **Tamper detection:** Evidence that data hasn't been manipulated
- **Methodology validation:** Understand data collection process
- **Transparency:** See complete history of all data operations

### For Co-Authors
- **Collaboration confidence:** Trust that data is protected
- **Quality assurance:** Monitor for data quality issues
- **Publication readiness:** Generate evidence for methods section

## Security Model

### What This Log Shows
✅ **All writes to research data** (app, web survey, manual)  
✅ **HMAC validation results** (genuine vs. tampered trip IDs)  
✅ **Metadata consistency** (source authentication)  
✅ **Complete change history** (what changed, when, by whom)

### What This Log Prevents
✅ **Silent tampering** (all changes are logged)  
✅ **Data fabrication** (HMAC signatures can't be forged)  
✅ **Unauthorized edits** (source metadata required)  
✅ **Backdating** (server timestamps are immutable)

### Limitations
- Log entries are written by Cloud Functions (trusted)
- Project owner console access is logged but not blocked
- Relies on Firebase's internal security (industry-standard)

## Technical Details

### Data Source
- Reads from `auditLog` collection in Firestore
- Shows last 1,000 entries by default
- Real-time updates (refresh to see new entries)

### Performance
- Client-side filtering (instant)
- Lazy loading for large datasets
- Optimized for 1,000+ entries

### Browser Compatibility
- Works in all modern browsers
- Responsive design for mobile/tablet review

## Exporting Data

Click **"📥 Export CSV"** to download filtered audit log:
- Includes all currently filtered entries
- CSV format for Excel/Sheets/R/Python analysis
- Filename includes export date

**CSV Columns:**
- Timestamp (ISO 8601 format)
- Operation (CREATE/UPDATE/VALIDATION)
- Severity (INFO/WARNING/ERROR)
- Trip ID
- Source (ios_app/web_survey/cloud_function)
- Actor (who/what made the change)
- Message (human-readable description)
- Changed Fields (comma-separated list)
- Issues (validation problems)
- Reason (HMAC validation result)

## Examples

### Normal Operations
```
✅ CREATE - Trip 2330B376-ISTE-251110-1024-1fff947f created by ios_app
✅ VALIDATION - HMAC signature valid for trip 2330B376-ISTE-251110-1024-1fff947f
✅ UPDATE - Point completions updated (3 fields changed)
✅ UPDATE - Survey completed via web_survey
```

### Warnings/Errors
```
⚠️ VALIDATION - Missing metadata on trip creation
⚠️ VALIDATION - Inconsistent source metadata
❌ VALIDATION - HMAC signature invalid (possible tampering)
```

## For Research Papers

### Methods Section Language

> "All research data writes are logged via server-side Cloud Functions to an immutable audit trail. Each entry records the operation type, timestamp, source authentication, and changed fields. HMAC-SHA256 signatures on trip identifiers provide cryptographic evidence of data authenticity. The complete audit log is publicly accessible at [URL] for independent verification."

### Supplementary Materials

Include in your paper's supplementary materials:
1. Screenshot of audit log viewer
2. CSV export of audit log (or representative sample)
3. Link to live audit log viewer (if public)
4. This README as documentation

## Maintenance

- No maintenance required (serverless)
- Logs stored indefinitely in Firestore
- Consider archiving old logs if cost becomes concern
- Audit log collection is write-protected (only Cloud Functions can write)

## Questions?

This audit log viewer complements the analytics dashboard and provides the transparency needed for high-integrity research. For technical questions, see `PHASE2-DEPLOYMENT-GUIDE.md`.

