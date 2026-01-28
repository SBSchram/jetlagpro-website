# Audit Failures Export Script

## Purpose
Exports all `METADATA_VALIDATION_FAILED` audit entries from Firebase for analysis and categorization.

## Usage

```bash
cd /Users/Steve/Development/jetlagpro-website
node scripts/export_audit_failures.js
```

## Output Files

The script creates two files in the `scripts/` directory:

### 1. `audit_failures_export.json`
Complete export with:
- All validation failure entries
- Grouped by issue type
- Full metadata for each entry
- Summary statistics

**Structure:**
```json
{
  "exportDate": "2025-12-11T...",
  "totalAuditEntries": 1234,
  "validationFailures": 56,
  "summary": {
    "issueFrequency": {
      "invalid_build_number": 23,
      "missing_timestamp": 12,
      ...
    },
    "uniqueIssueTypes": 5
  },
  "issuesByType": {
    "invalid_build_number": [
      {
        "tripId": "...",
        "timestamp": "...",
        "metadata": {...}
      }
    ]
  },
  "allValidationFailures": [...]
}
```

### 2. `audit_failures_summary.txt`
Human-readable summary with:
- Issue frequency statistics
- Sample entries for each issue type
- Metadata snippets for quick review

## Next Steps

1. **Review the summary file** for quick overview
2. **Share `audit_failures_export.json`** with AI for detailed analysis
3. **Identify patterns**:
   - Which failures are bugs in our validation logic?
   - Which are legitimate data issues?
   - What date ranges do they cover?
4. **Create categorization rules** for display in audit log viewer

## What This Helps With

- Understanding historical validation issues
- Identifying false positives (bugs in our code)
- Creating display annotations for known defects
- Improving validation logic going forward
- Research data integrity assessment

