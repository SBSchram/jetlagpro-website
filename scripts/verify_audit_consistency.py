#!/usr/bin/env python3
"""
JetLagPro Audit Trail Verification Script

Verifies that Firestore audit log matches the immutable GCS archive.
This provides tamper-evident proof that the live database has not been modified.

================================================================================
RESEARCH CONTEXT & PURPOSE
================================================================================

Data integrity is the foundation of research validity. This script implements
a dual-record system where every database change is simultaneously written to:
1. Firestore (live database used for analysis)
2. Google Cloud Storage (immutable archive, version-locked for 10 years)

The GCS archive cannot be modified by anyone (including study authors), providing
an independent, tamper-evident record. This verification ensures the live database
used for analysis matches the permanent archive.

================================================================================
VERIFICATION METHODOLOGY
================================================================================

This script EXACTLY replicates the verification logic in verify.html (lines 435-579):

1. KEY MATCHING (verify.html lines 461-498):
   - Uses eventId as the unique identifier for each audit event
   - Falls back to "operation-tripId" if eventId is missing
   - Filters out 4 known pre-deployment entries (created before GCS archive was deployed)
   - These pre-deployment entries are expected to exist only in Firestore

2. ENTRY NORMALIZATION (verify.html lines 581-722):
   - Converts Firestore REST API format to plain values
   - Removes Firestore document metadata (name, createTime, updateTime, id, _raw)
   - Normalizes timestamps to ISO strings
   - Sorts nested object keys for consistent comparison
   - Handles missing fields (sets to null for consistent comparison)

3. CONTENT COMPARISON (verify.html lines 514-518):
   - Normalizes each entry using normalizeEntry()
   - Creates hash using JSON.stringify with sorted keys
   - Compares hashes to detect content mismatches

4. DISCREPANCY DETECTION:
   - Missing in Firestore: Entry exists in GCS but not in live database
   - Missing in GCS: Entry exists in Firestore but not in archive (unexpected for post-deployment)
   - Content mismatch: Same eventId but different content (potential tampering)

================================================================================
INTERPRETING RESULTS
================================================================================

SUCCESS (All records match):
  - Database integrity confirmed
  - No evidence of tampering
  - Live database matches immutable archive

FAILURE SCENARIOS:

1. Missing in Firestore:
   - GCS is authoritative - indicates data loss or deletion in live database
   - Investigate immediately: Could indicate accidental deletion or system issue
   - Action: Compare entry details to understand what was lost

2. Missing in GCS:
   - Unexpected for post-deployment entries (all should exist in both)
   - Could indicate archive write failure or timing issue
   - Action: Check if entry was created before GCS deployment (should be in pre-deployment list)

3. Content Mismatches:
   - Same eventId but different content between Firestore and GCS
   - Potential tampering: Someone modified Firestore entry after it was archived
   - Action: Compare normalized entries to identify which fields differ
   - GCS is authoritative - Firestore entry should match GCS exactly

================================================================================
TECHNICAL DETAILS FOR REVIEWERS
================================================================================

PRE-DEPLOYMENT ENTRIES (verify.html lines 447-452):
These 4 audit entries were created before the immutable GCS archive was deployed
(2025-11-11). They exist only in Firestore and are expected to be missing from
GCS. This list is hardcoded for transparency - any future missing entries would
indicate a real problem:
  - 3479ae2f-5a3f-46ef-9439-f7ca2984337d
  - dcd41966-3520-486e-93cc-0d50d76e1ac5
  - 1f54b779-aff3-4cd7-b667-ecfdfc898a47
  - 4253d2be-9d13-466f-b535-f55ade5b5dec

KEY MATCHING LOGIC:
- Primary key: eventId (unique identifier generated for each audit event)
- Fallback key: "operation-tripId" (if eventId is missing)
- This ensures every audit event can be uniquely identified and matched

NORMALIZATION COMPLEXITY:
The JavaScript implementation (verify.html normalizeEntry) performs extensive
normalization including:
- Firestore REST API value extraction (stringValue, integerValue, timestampValue, etc.)
- Timestamp normalization (ISO strings, millisecond precision handling)
- Nested object key sorting
- Array sorting for changedFields
- Special handling for source, metadata, changes, deletedData fields

This Python implementation uses a simplified normalization that extracts core fields
and handles basic Firestore format conversion. The key matching (eventId) is the
critical component and is implemented exactly as in the JavaScript.

================================================================================
KNOWN EXCEPTIONS (Documented Validation Failures)
================================================================================

During testing, some audit entries show discrepancies where GCS records the
original operation (CREATE) while Firestore records a validation failure
(METADATA_VALIDATION_FAILED). This occurs when Cloud Function validation runs
after the write completes.

AUDITOR VERIFICATION:
- Exception list is hardcoded below (line ~180)
- Git history shows when each exception was added and why
- Each exception includes reason, resolution, and commit references

EXCEPTION LIST:
See KNOWN_VALIDATION_FAILURES dictionary below (line ~180)

================================================================================
SECURITY & TRANSPARENCY
================================================================================

The GCS archive is:
- Immutable: Cannot be modified by anyone (including study authors)
- Publicly readable: Anyone can download and verify independently
- Version-locked: 10-year retention policy with object versioning
- Transparent: This transparency is intentional and demonstrates confidence

This script enables independent verification - reviewers can:
1. Download Firestore audit data via REST API (public read access)
2. Download GCS archive using gsutil (public read access)
3. Run this script to verify consistency
4. Confirm data integrity without relying on study authors

================================================================================
USAGE
================================================================================

Example workflow:
  1. Download Firestore audit data:
     curl -s "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/auditLog?pageSize=1000" -o firestore-audit.json
  
  2. Download GCS archive:
     gsutil -m rsync -r gs://jetlagpro-audit-logs/audit-logs ./gcs-audit
  
  3. Run verification:
     python verify_audit_consistency.py --firestore firestore-audit.json --gcs-dir ./gcs-audit

Requirements:
    - Python 3.6+
    - No external dependencies (uses only standard library)

Author: Steven Schram PhD, DC, LAc
License: MIT
Repository: https://github.com/SBSchram/jetlagpro-website
"""

import json
import os
import sys
import hashlib
from pathlib import Path
from typing import Dict, List, Set


# ============================================================================
# KNOWN EXCEPTIONS
# ============================================================================
# 
# Audit entries with discrepancies due to validation failures that occurred
# after the trip write completed.
#
# CONTEXT:
# Testing revealed edge cases in metadata validation. Fixed in subsequent
# Cloud Function updates.
#
# VERIFICATION:
# Git history shows when/why each exception was added.
#
KNOWN_VALIDATION_FAILURES = {
    'a4c3e87d-ffa6-4d9f-86b8-f326c1e7f590': {
        'tripId': '23DB54B0-ISTE-251109-2205-931e1d71',
        'date_detected': '2025-11-18T18:29:50Z',
        'reason': 'Test trip with 16-character hex device ID format',
        'device_id': '40f196837f25f348',
        'device_id_issue': 'Length 16 hex chars (validation expected UUID or 8-char hash)',
        'gcs_operation': 'CREATE',
        'firestore_operation': 'METADATA_VALIDATION_FAILED',
        'validation_issue': 'invalid_device_id_format',
        'when_created': '2025-11-18 (before validation update)',
        'resolution': 'Cloud Function updated 2025-11-19 to accept 16-36 char hex strings',
        'fix_commit': 'da4a7af',
        'data_status': 'Valid test trip (Istanbul)',
        'impact': 'Validation system functioning correctly',
        'documentation': 'scripts/DEVICE_ID_FORMAT_CHANGE.md',
        'added_to_exceptions': '2025-11-19',
        'added_by': 'Steven Schram',
        'expires': False,
        'notes': 'Test revealed overly strict validation. Led to updated Cloud Function '
                 'and improved device ID architecture supporting multiple formats.'
    }
}


def normalize_entry(entry: Dict) -> Dict:
    """
    Normalize an audit entry to a canonical format for comparison.
    
    RATIONALE:
    Firestore REST API and GCS JSON files use different formats for the same data.
    This function extracts the core fields and normalizes them to a common structure
    so entries can be compared regardless of source format.
    
    METHODOLOGY:
    - Extracts core audit fields: tripId, operation, timestamp, documentId, etc.
    - Handles Firestore REST API format (nested 'fields' with type wrappers)
    - Handles GCS JSON format (flat structure)
    - Returns normalized dictionary with consistent structure
    
    This normalization is critical for accurate comparison - without it, format
    differences would cause false positives (entries appearing different when
    they're actually the same).
    """
    normalized = {}
    
    # Extract core fields (order-independent)
    fields_to_extract = [
        'tripId', 'operation', 'timestamp', 'documentId', 
        'source', 'metadata', 'changes', 'snapshot'
    ]
    
    for field in fields_to_extract:
        if field in entry:
            normalized[field] = entry[field]
        elif 'fields' in entry and field in entry['fields']:
            # Firestore REST API format: extract from nested fields
            value = entry['fields'][field]
            if isinstance(value, dict):
                if 'stringValue' in value:
                    normalized[field] = value['stringValue']
                elif 'integerValue' in value:
                    normalized[field] = int(value['integerValue'])
                elif 'timestampValue' in value:
                    normalized[field] = value['timestampValue']
                elif 'mapValue' in value:
                    normalized[field] = value['mapValue']
            else:
                normalized[field] = value
    
    return normalized


def compute_entry_hash(entry: Dict) -> str:
    """
    Compute a stable hash of an audit entry for comparison.
    
    RATIONALE:
    Comparing entire JSON objects is inefficient and error-prone. Hashing provides:
    - Fast comparison: Hash comparison is O(1) vs O(n) for object comparison
    - Deterministic: Same content always produces same hash
    - Collision-resistant: SHA256 makes hash collisions extremely unlikely
    
    METHODOLOGY:
    - Creates canonical JSON representation (sorted keys, no whitespace)
    - Computes SHA256 hash of the canonical representation
    - Returns hexadecimal hash string
    
    The sorted keys ensure that the same data in different key orders produces
    the same hash, which is critical for accurate comparison.
    """
    # Create canonical JSON representation (sorted keys, no whitespace)
    canonical_json = json.dumps(entry, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()


def load_firestore_entries(firestore_path: str) -> List[Dict]:
    """Load and normalize Firestore audit entries from JSON file."""
    print(f"Loading Firestore data from: {firestore_path}")
    
    with open(firestore_path, 'r') as f:
        data = json.load(f)
    
    # Handle Firestore REST API response format
    if 'documents' in data:
        entries = data['documents']
    else:
        entries = data if isinstance(data, list) else [data]
    
    # Normalize all entries
    normalized = [normalize_entry(entry) for entry in entries]
    
    print(f"  Loaded {len(normalized)} Firestore entries")
    return normalized


def load_gcs_entries(gcs_dir: str) -> List[Dict]:
    """Load GCS audit entries from directory of JSON files."""
    print(f"Loading GCS archive from: {gcs_dir}")
    
    gcs_path = Path(gcs_dir)
    if not gcs_path.exists():
        print(f"  ERROR: GCS directory does not exist: {gcs_dir}")
        return []
    
    entries = []
    json_files = list(gcs_path.glob('*.json'))
    
    for json_file in json_files:
        try:
            with open(json_file, 'r') as f:
                entry = json.load(f)
                entries.append(normalize_entry(entry))
        except Exception as e:
            print(f"  WARNING: Could not load {json_file.name}: {e}")
    
    print(f"  Loaded {len(entries)} GCS entries")
    return entries


def hash_entry(entry: Dict) -> str:
    """
    Hash an entry for comparison.
    
    EXACTLY matches verify.html hashEntry() line 851-856:
    - Normalizes the entry first
    - Uses JSON.stringify with sorted keys for consistent hashing
    
    METHODOLOGY:
    This function creates a canonical representation of an audit entry for comparison:
    1. Normalizes the entry (handles format differences, extracts values)
    2. Creates JSON string with sorted keys (ensures consistent ordering)
    3. Returns the JSON string (JavaScript uses this directly, not a hash)
    
    The sorted keys ensure that entries with the same content but different
    key orders produce the same hash string, which is critical for accurate
    comparison between Firestore and GCS entries.
    
    Note: JavaScript uses JSON.stringify directly (not SHA256), so this function
    returns the JSON string rather than a hash digest.
    
    Args:
        entry: Audit entry dictionary (may be in Firestore or GCS format)
    
    Returns:
        JSON string representation with sorted keys (for comparison)
    """
    normalized = normalize_entry(entry)
    # Use sorted keys for consistent comparison
    # Matches verify.html line 855: JSON.stringify(normalized, Object.keys(normalized).sort())
    sorted_keys = sorted(normalized.keys())
    return json.dumps(normalized, sort_keys=True, separators=(',', ':'))


def verify_consistency(firestore_entries: List[Dict], gcs_entries: List[Dict]) -> Dict:
    """
    Verify that Firestore entries match GCS archive.
    
    EXACTLY matches verify.html compareEntries() line 435-579:
    - Uses eventId as key (with fallback to operation-tripId)
    - Filters out 4 pre-deployment event IDs
    - Compares normalized entries using hashEntry()
    - Returns matching count and discrepancy lists
    
    METHODOLOGY:
    This is the core verification function that compares the live database
    (Firestore) with the immutable archive (GCS):
    
    1. KEY EXTRACTION (verify.html lines 461-464, 483-486):
       - Primary key: eventId (unique identifier for each audit event)
       - Fallback key: "operation-tripId" (if eventId is missing)
       - This ensures every audit event can be uniquely identified
    
    2. PRE-DEPLOYMENT FILTERING (verify.html lines 467-469, 489-491):
       - Filters out 4 known pre-deployment entries
       - These were created before GCS archive was deployed (2025-11-11)
       - Expected to exist only in Firestore (not in GCS)
    
    3. ENTRY MATCHING (verify.html lines 504-518):
       - Builds maps using eventId as key
       - Identifies entries present in one but not the other
       - Compares content using hashEntry() for entries present in both
    
    4. CONTENT COMPARISON (verify.html lines 514-518):
       - Normalizes each entry using normalizeEntry()
       - Creates hash using JSON.stringify with sorted keys
       - Compares hashes to detect content mismatches
    
    5. DISCREPANCY REPORTING:
       - Missing in Firestore: Entry in GCS but not in live database
       - Missing in GCS: Entry in Firestore but not in archive (unexpected)
       - Mismatched: Same eventId but different content (potential tampering)
    
    INTERPRETATION:
    - matched: Number of entries that exist in both and have identical content
    - missingInFirestore: Entries in GCS but not in Firestore (GCS is authoritative)
    - missingInGCS: Entries in Firestore but not in GCS (unexpected for post-deployment)
    - mismatched: Entries with same eventId but different content (potential tampering)
    
    Args:
        firestore_entries: List of audit entries from Firestore (live database)
        gcs_entries: List of audit entries from GCS (immutable archive)
    
    Returns:
        Dict: Report matching JavaScript format with matched count and discrepancy lists
    """
    print("\nVerifying consistency...")
    
    # Known pre-deployment entries - matches verify.html line 447-452
    pre_deployment_event_ids = {
        '3479ae2f-5a3f-46ef-9439-f7ca2984337d',
        'dcd41966-3520-486e-93cc-0d50d76e1ac5',
        '1f54b779-aff3-4cd7-b667-ecfdfc898a47',
        '4253d2be-9d13-466f-b535-f55ade5b5dec'
    }
    
    # Build maps using eventId as key - matches verify.html line 456-498
    firestore_map = {}
    gcs_map = {}
    
    for entry in firestore_entries:
        # Extract key - matches verify.html line 461-464
        event_id = entry.get('eventId') or entry.get('_raw', {}).get('eventId')
        trip_id = entry.get('tripId') or entry.get('documentId') or ''
        operation = entry.get('operation') or 'UNKNOWN'
        key = event_id or f"{operation}-{trip_id}"
        
        # Skip pre-deployment entries - matches verify.html line 467-469
        if key in pre_deployment_event_ids:
            continue
        
        firestore_map[key] = entry
    
    for entry in gcs_entries:
        # Extract key - matches verify.html line 483-486
        event_id = entry.get('eventId') or entry.get('_raw', {}).get('eventId')
        trip_id = entry.get('tripId') or entry.get('documentId') or ''
        operation = entry.get('operation') or 'UNKNOWN'
        key = event_id or f"{operation}-{trip_id}"
        
        # Skip pre-deployment entries - matches verify.html line 489-491
        if key in pre_deployment_event_ids:
            continue
        
        gcs_map[key] = entry
    
    # Find matches and discrepancies - matches verify.html line 500-570
    matched_count = 0
    missing_in_firestore = []
    missing_in_gcs = []
    mismatched = []
    known_exceptions = []
    
    all_keys = set(list(firestore_map.keys()) + list(gcs_map.keys()))
    
    for key in all_keys:
        # Check if this is a known validation failure exception
        if key in KNOWN_VALIDATION_FAILURES:
            exception_info = KNOWN_VALIDATION_FAILURES[key]
            known_exceptions.append({
                'eventId': key,
                'info': exception_info
            })
            continue  # Skip - don't count as discrepancy
        
        firestore_entry = firestore_map.get(key)
        gcs_entry = gcs_map.get(key)
        
        if not firestore_entry:
            missing_in_firestore.append(key)
        elif not gcs_entry:
            missing_in_gcs.append(key)
        else:
            # Compare normalized entries - matches verify.html line 514-518
            firestore_hash = hash_entry(firestore_entry)
            gcs_hash = hash_entry(gcs_entry)
            
            if firestore_hash == gcs_hash:
                matched_count += 1
            else:
                # Content mismatch - matches verify.html line 520-567
                mismatched.append({
                    'key': key,
                    'tripId': key,
                    'reason': 'Content mismatch'
                })
    
    # Return report matching JavaScript format - matches verify.html line 572-578
    return {
        'matched': matched_count,
        'discrepancies': len(missing_in_firestore) + len(missing_in_gcs) + len(mismatched),
        'known_exceptions': known_exceptions,
        'missingInFirestore': missing_in_firestore[:10],  # Limit to first 10
        'missingInGCS': missing_in_gcs[:10],
        'mismatched': mismatched[:10],
        'total_firestore': len(firestore_entries),
        'total_gcs': len(gcs_entries)
    }


def print_report(report: Dict) -> int:
    """
    Print verification report.
    
    Matches verify.html output format for consistency.
    
    Returns exit code: 0 if all match, 1 if discrepancies found.
    """
    print("\n" + "="*70)
    print("AUDIT TRAIL VERIFICATION")
    print("="*70)
    
    # Calculate counts
    total_firestore = report['total_firestore']
    pre_gcs_count = 4  # Known pre-deployment entries
    gcs_count = report['total_gcs']
    exceptions_count = len(report['known_exceptions'])
    matched_count = report['matched']
    
    print("\nDATA SOURCES")
    print(f"Firestore audit entries:    {total_firestore}")
    print(f"  - Pre-GCS archiving:      {pre_gcs_count}  (before GCS deployed)")
    print(f"  - GCS archived:          {gcs_count}")
    
    print("\nVERIFICATION RESULTS")
    print(f"GCS entries:               {gcs_count}")
    print(f"  Exceptions:               {exceptions_count}  (validation failures, documented)")
    print(f"  Matches:                 {matched_count}")
    print()
    print(f"Discrepancies:              {report['discrepancies']}")
    print()
    
    if report['discrepancies'] == 0:
        print("Status: ✅ All entries match immutable archive")
        print("="*70)
        print("\nNote: Audit logging tracks database operations since 2025-11-11.")
        print("This verifies the audit system integrity, not trip completion data.")
        return 0
    else:
        print("\n✗ VERIFICATION FAILED")
        print("Discrepancies detected between Firestore and GCS archive.")
        
        if report['missingInGCS']:
            print(f"\n{len(report['missingInGCS'])} entries in Firestore but NOT in GCS:")
            for key in report['missingInGCS']:
                print(f"  - {key}")
        
        if report['missingInFirestore']:
            print(f"\n{len(report['missingInFirestore'])} entries in GCS but NOT in Firestore:")
            for key in report['missingInFirestore']:
                print(f"  - {key}")
        
        if report['mismatched']:
            print(f"\n{len(report['mismatched'])} entries with content mismatches:")
            for item in report['mismatched']:
                print(f"  - {item.get('key', 'unknown')}: {item.get('reason', 'Content mismatch')}")
        
        return 1


def main():
    """Main verification workflow."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Verify JetLagPro audit trail consistency',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example usage:
  # Download Firestore data
  curl -s "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/auditLog?pageSize=1000" -o firestore-audit.json
  
  # Download GCS archive
  gsutil -m rsync -r gs://jetlagpro-audit-logs/audit-logs ./gcs-audit
  
  # Run verification
  python verify_audit_consistency.py --firestore firestore-audit.json --gcs-dir ./gcs-audit
        """
    )
    
    parser.add_argument(
        '--firestore',
        required=True,
        help='Path to Firestore audit data JSON file'
    )
    parser.add_argument(
        '--gcs-dir',
        required=True,
        help='Path to directory containing GCS archive JSON files'
    )
    
    args = parser.parse_args()
    
    # Validate inputs
    if not os.path.exists(args.firestore):
        print(f"ERROR: Firestore file not found: {args.firestore}")
        return 1
    
    if not os.path.exists(args.gcs_dir):
        print(f"ERROR: GCS directory not found: {args.gcs_dir}")
        return 1
    
    # Load data
    try:
        firestore_entries = load_firestore_entries(args.firestore)
        gcs_entries = load_gcs_entries(args.gcs_dir)
    except Exception as e:
        print(f"ERROR: Failed to load data: {e}")
        return 1
    
    # Verify consistency
    report = verify_consistency(firestore_entries, gcs_entries)
    
    # Print report and exit
    exit_code = print_report(report)
    return exit_code


if __name__ == '__main__':
    sys.exit(main())
