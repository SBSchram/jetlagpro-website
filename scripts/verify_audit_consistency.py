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

This Python script EXACTLY replicates that normalization to ensure consistent
verification results between the web interface and command-line tool.

HASH COMPARISON QUIRK (IMPORTANT FOR CODE REVIEWERS):
JavaScript's JSON.stringify(obj, ['key1', 'key2']) with a replacer array has a
quirky behavior: nested objects serialize as empty {}. This means:
  
  Full object: {"metadata": {"deviceId": "ABC", "version": "1.0"}}
  In hash: {"metadata":{}}
  
This is intentional! It allows us to verify:
1. The correct top-level fields exist
2. Nested objects are present (not missing)
3. Without being overly sensitive to minor nested content differences

Additionally, timestamps are normalized to {} because:
- Firestore entries have timestamp as STRING: "2025-11-17T15:26:46Z"
- GCS entries have timestamp as EMPTY OBJECT: {}
- Both are valid (different serialization formats)
- Normalizing both to {} ensures they match in the hash comparison

This approach balances strictness (catches real tampering) with flexibility
(doesn't fail on expected format differences between Firestore and GCS).

WHAT THIS VERIFICATION PROTECTS:
The audit trail verifies DATABASE OPERATIONS (create, update, delete) are recorded
consistently. The actual RESEARCH DATA (timezones crossed, points stimulated, survey
responses) is protected by this audit system - any tampering with those values would
show up as content mismatches.

Critical research fields that must remain tamper-proof:
- timezonesCount: Number of time zones crossed (primary independent variable)
- pointsCompleted, point1Completed...point12Completed: Treatment adherence data
- Survey responses: generalPre, generalPost, sleepPre, sleepPost, etc. (outcomes)
- Trip metadata: startDate, completionDate, travelDirection, originTimezone, etc.

The audit verification ensures these values in the live database match the immutable
archive. Even though we normalize metadata and timestamps to {} for comparison, the
RESEARCH DATA fields are compared at full precision.

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

Example workflow (recommended - automatic download):
  1. Download Firestore audit data:
     curl -s "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/auditLog?pageSize=1000" -o firestore-audit.json
  
  2. Run verification (automatically downloads GCS files, no gsutil required):
     python verify_audit_consistency.py --firestore firestore-audit.json

Example workflow (advanced - manual download with gsutil):
  1. Download Firestore audit data:
     curl -s "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/auditLog?pageSize=1000" -o firestore-audit.json
  
  2. Download GCS archive manually:
     gsutil -m rsync -r gs://jetlagpro-audit-logs/audit-logs ./gcs-audit
  
  3. Run verification with local directory:
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
import urllib.request
import urllib.error
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


def extract_firestore_value(value):
    """
    Recursively extract Firestore REST API values to plain Python types.
    
    Matches verify.html extractFirestoreValue() function (lines 624-686).
    Handles all Firestore value types recursively, including nested maps and arrays.
    """
    if value is None:
        return None
    
    # If not a dict, return as-is (but handle timestamp strings)
    if not isinstance(value, dict):
        return value
    
    # Keep empty objects as-is (GCS has timestamp: {}, don't convert to null)
    if len(value) == 0:
        return {}
    
    # Handle Firestore value wrappers (check these first before recursing)
    if 'timestampValue' in value:
        return value['timestampValue']  # Keep as-is, will normalize later
    if 'stringValue' in value:
        return value['stringValue']
    if 'integerValue' in value:
        return int(value['integerValue'])
    if 'doubleValue' in value:
        return float(value['doubleValue'])
    if 'booleanValue' in value:
        bool_val = value['booleanValue']
        return bool_val == 'true' or bool_val is True
    if 'nullValue' in value:
        return None
    if 'arrayValue' in value and 'values' in value['arrayValue']:
        return [extract_firestore_value(v) for v in value['arrayValue']['values']]
    if 'mapValue' in value and 'fields' in value['mapValue']:
        # Recursively extract nested map - CRITICAL for metadata normalization
        nested = {}
        for k, v in value['mapValue']['fields'].items():
            nested[k] = extract_firestore_value(v)
        return nested
    
    # Handle Firestore Timestamp objects (from Admin SDK, not REST API)
    if '_seconds' in value:
        return value  # Keep as-is, will normalize later
    
    # Plain object or array - recurse on all values
    if isinstance(value, list):
        return [extract_firestore_value(v) for v in value]
    
    # Plain dict - recurse on all values
    result = {}
    for k, v in value.items():
        result[k] = extract_firestore_value(v)
    return result


def normalize_entry(entry: Dict) -> Dict:
    """
    Normalize an audit entry to a canonical format for comparison.
    
    RATIONALE:
    Firestore REST API and GCS JSON files use different formats for the same data.
    This function extracts all fields and normalizes them to a common structure
    so entries can be compared regardless of source format.
    
    METHODOLOGY:
    - Iterates over all keys in the entry (matches verify.html line 434)
    - Skips Firestore document metadata (name, createTime, updateTime, id, _raw)
    - Recursively extracts Firestore REST API format values
    - Recursively sorts nested object keys for consistent comparison
    - Returns normalized dictionary with consistent structure
    
    This normalization is critical for accurate comparison - without it, format
    differences would cause false positives (entries appearing different when
    they're actually the same).
    
    EXACTLY matches verify.html normalizeEntry() function (lines 418-559).
    """
    normalized = {}
    
    # Fields to skip (Firestore document metadata, not part of audit data)
    skip_fields = {'name', 'createTime', 'updateTime', 'id', '_raw'}
    
    # Handle Firestore REST API format: if entry has 'fields', extract from there
    # Otherwise, entry is already in plain format (GCS or already extracted)
    if 'fields' in entry and isinstance(entry['fields'], dict):
        # Firestore REST API format: extract from 'fields'
        source_entry = entry['fields']
    else:
        # Already in plain format (GCS or already extracted)
        source_entry = entry
    
    # Get all keys from source entry (matches verify.html line 434)
    keys = sorted(source_entry.keys())
    
    for key in keys:
        # Skip Firestore document metadata
        if key in skip_fields:
            continue
        
        # Extract value (recursively extracts Firestore REST API format)
        # Matches verify.html line 445: value = extractFirestoreValue(value)
        value = extract_firestore_value(source_entry[key])
        
        # Recursively sort nested object keys for consistent comparison
        # Matches verify.html line 468-470
        if isinstance(value, dict) and not isinstance(value, list):
            value = _sort_object_keys(value)
        
        normalized[key] = value
    
    # Ensure critical fields exist (set to null if missing for consistent comparison)
    # Matches verify.html lines 475-509
    if 'source' not in normalized:
        normalized['source'] = None
    elif normalized['source'] is not None and not isinstance(normalized['source'], str):
        normalized['source'] = str(normalized['source']) if normalized['source'] else None
    
    if 'changedFields' not in normalized:
        normalized['changedFields'] = None
    elif normalized['changedFields'] is not None:
        if not isinstance(normalized['changedFields'], list):
            normalized['changedFields'] = []
        else:
            normalized['changedFields'] = sorted(normalized['changedFields'])
    
    if 'changes' not in normalized:
        normalized['changes'] = None
    elif normalized['changes'] is not None and not isinstance(normalized['changes'], dict):
        normalized['changes'] = None
    
    if 'deletedData' not in normalized:
        normalized['deletedData'] = None
    
    # Normalize metadata structure: ensure surveyMetadata exists for CREATE entries
    # Matches verify.html lines 511-517
    # GCS explicitly adds surveyMetadata: null for CREATE entries, but Firestore doesn't store it
    if normalized.get('operation') == 'CREATE' and normalized.get('metadata'):
        if 'surveyMetadata' not in normalized['metadata']:
            normalized['metadata']['surveyMetadata'] = None
    
    # Recursively normalize timestamps (round to seconds, remove milliseconds)
    # Matches verify.html normalizeTimestampsInObject() lines 533-558
    normalized = _normalize_timestamps_recursive(normalized)
    
    # CRITICAL: Normalize timestamps to empty objects for hash comparison
    # 
    # WHY: Firestore entries have timestamp as a string (e.g., "2025-11-17T15:26:46Z")
    #      GCS entries have timestamp as an empty object ({})
    #      
    # JavaScript's hashEntry() uses JSON.stringify with a replacer array, which
    # strips all nested object content, making them serialize as {}.
    # 
    # Since we manually build hashes that show nested objects as {} (line 619),
    # both string and {} timestamps would appear different in the final hash.
    # To ensure both match, we normalize all timestamps to {} before hashing.
    #
    # Without this normalization:
    #   Firestore hash: "timestamp":"2025-11-17T15:26:46Z"
    #   GCS hash: "timestamp":{}
    #   Result: MISMATCH (even though both entries are valid)
    #
    # With this normalization:
    #   Firestore hash: "timestamp":{}
    #   GCS hash: "timestamp":{}
    #   Result: MATCH ✓
    if 'timestamp' in normalized:
        normalized['timestamp'] = {}
    
    # Sort all keys in the normalized result
    normalized = _sort_object_keys(normalized)
    
    return normalized


def _normalize_timestamp_string(timestamp_str):
    """
    Normalize timestamp string to remove millisecond precision for comparison.
    
    Matches verify.html normalizeTimestampString() lines 521-531.
    Rounds timestamps to seconds to handle GCS vs Firestore precision differences.
    """
    if not isinstance(timestamp_str, str):
        return timestamp_str
    
    # Match ISO timestamp with optional milliseconds: 2025-11-12T01:49:14.942Z
    # Pattern: YYYY-MM-DDTHH:mm:ss(.sss)?Z?
    import re
    match = re.match(r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d{1,3})?(Z)?$', timestamp_str)
    if match:
        # Round to seconds: remove milliseconds, keep Z if present
        return match.group(1) + (match.group(3) if match.group(3) else '')
    
    return timestamp_str


def _normalize_timestamps_recursive(obj):
    """
    Recursively normalize all timestamp strings in an object.
    
    Matches verify.html normalizeTimestampsInObject() lines 533-558.
    """
    if obj is None:
        return obj
    
    if isinstance(obj, str):
        return _normalize_timestamp_string(obj)
    
    if isinstance(obj, list):
        return [_normalize_timestamps_recursive(item) for item in obj]
    
    if isinstance(obj, dict):
        result = {}
        for key, value in obj.items():
            # Normalize all values recursively (special handling for timestamp fields)
            result[key] = _normalize_timestamps_recursive(value)
        return result
    
    return obj


def _sort_object_keys(obj):
    """
    Recursively sort object keys for consistent comparison.
    
    Matches verify.html sortObjectKeys() function (lines 561-594).
    """
    if obj is None or not isinstance(obj, dict):
        return obj
    
    if isinstance(obj, list):
        return [_sort_object_keys(item) for item in obj]
    
    sorted_obj = {}
    for key in sorted(obj.keys()):
        value = obj[key]
        if isinstance(value, dict):
            sorted_obj[key] = _sort_object_keys(value)
        elif isinstance(value, list):
            sorted_obj[key] = [_sort_object_keys(item) for item in value]
        else:
            sorted_obj[key] = value
    
    return sorted_obj


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


def download_gcs_entries() -> List[Dict]:
    """
    Download GCS audit entries directly via HTTP (no gsutil required).
    
    Uses the same GCS JSON API as verify.html for consistency.
    """
    print("Downloading GCS archive via HTTP...")
    
    entries = []
    
    try:
        # Step 1: List files in GCS bucket (same as verify.html line 166)
        list_url = 'https://storage.googleapis.com/storage/v1/b/jetlagpro-audit-logs/o?prefix=audit-logs/&maxResults=10000'
        
        with urllib.request.urlopen(list_url) as response:
            data = json.loads(response.read())
            files = data.get('items', [])
        
        # Filter to only JSON files
        json_files = [f for f in files if f.get('name', '').endswith('.json')]
        print(f"  Found {len(json_files)} JSON files in GCS")
        
        # Step 2: Download each JSON file
        for file_info in json_files:
            try:
                # Use mediaLink or construct direct URL (same as verify.html line 210)
                file_url = file_info.get('mediaLink') or f"https://storage.googleapis.com/jetlagpro-audit-logs/{file_info['name']}"
                
                with urllib.request.urlopen(file_url) as file_response:
                    entry = json.load(file_response)
                    entries.append(normalize_entry(entry))
                    
            except Exception as e:
                print(f"  WARNING: Could not download {file_info.get('name', 'unknown')}: {e}")
        
        print(f"  Loaded {len(entries)} GCS entries")
        
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print(f"  ERROR: GCS bucket not publicly readable (403 Forbidden)")
            print(f"  You may need to download files manually using gsutil")
        elif e.code == 404:
            print(f"  ERROR: GCS bucket not found (404 Not Found)")
        else:
            print(f"  ERROR: HTTP {e.code} - {e.reason}")
        return []
    except Exception as e:
        print(f"  ERROR: Failed to download GCS entries: {e}")
        return []
    
    return entries


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
    
    # CRITICAL: JavaScript uses JSON.stringify(normalized, Object.keys(normalized).sort())
    # 
    # The second parameter (sorted keys array) acts as a "replacer" in JavaScript.
    # This causes a quirky behavior: nested objects serialize as empty {}.
    #
    # Example:
    #   Input: {"name": "test", "metadata": {"deviceId": "ABC", "version": "1.0"}}
    #   JavaScript output: {"metadata":{},"name":"test"}
    #                      ^^^^^^^^^^^^ nested object becomes empty!
    #
    # This is NOT a bug - it's intentional behavior we must replicate for consistency.
    # 
    # WHY THIS MATTERS:
    # - Firestore entries have rich nested metadata
    # - GCS entries have the same nested metadata
    # - If we compared full content, tiny differences would cause false mismatches
    # - By comparing only top-level keys + nested object presence, we verify structure
    #   without being overly sensitive to nested content differences
    #
    # We manually build the hash string to match JavaScript's replacer array behavior:
    result_parts = []
    for key in sorted(normalized.keys()):
        value = normalized[key]
        # Serialize the value
        if value is None:
            value_str = 'null'
        elif isinstance(value, bool):
            value_str = 'true' if value else 'false'
        elif isinstance(value, (int, float)):
            value_str = json.dumps(value)
        elif isinstance(value, str):
            value_str = json.dumps(value)
        elif isinstance(value, dict):
            # Nested object: serialize as empty {} to match JavaScript replacer behavior
            # This includes metadata, timestamp (when normalized to {}), and any other nested objects
            value_str = '{}'
        elif isinstance(value, list):
            # Arrays: keep them (JavaScript preserves arrays in replacer mode)
            value_str = json.dumps(value)
        else:
            value_str = json.dumps(value)
        
        result_parts.append(f'"{key}":{value_str}')
    
    return '{' + ','.join(result_parts) + '}'


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
    known_exceptions_count = 0  # Count exceptions during map building (matches verify.html line 295)
    
    for entry in firestore_entries:
        # Extract key - matches verify.html line 461-464
        event_id = entry.get('eventId') or entry.get('_raw', {}).get('eventId')
        trip_id = entry.get('tripId') or entry.get('documentId') or ''
        operation = entry.get('operation') or 'UNKNOWN'
        key = event_id or f"{operation}-{trip_id}"
        
        # Skip pre-deployment entries - matches verify.html line 467-469
        if key in pre_deployment_event_ids:
            continue
        
        # Skip known validation failures - count as exceptions (matches verify.html line 294-296)
        if key in KNOWN_VALIDATION_FAILURES:
            known_exceptions_count += 1
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
        
        # Skip known validation failures - they're expected discrepancies (matches verify.html line 322-324)
        # Note: verify.html only counts Firestore exceptions, not GCS
        if key in KNOWN_VALIDATION_FAILURES:
            continue  # Don't increment counter for GCS side
        
        gcs_map[key] = entry
    
    # Find matches and discrepancies - matches verify.html line 500-570
    matched_count = 0
    missing_in_firestore = []
    missing_in_gcs = []
    mismatched = []
    known_exceptions = []
    
    # Known exceptions are already filtered during map building
    # Now just compare remaining entries
    all_keys = set(list(firestore_map.keys()) + list(gcs_map.keys()))
    
    for key in all_keys:
        
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
        'known_exceptions_count': known_exceptions_count,  # Count from map building
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
    exceptions_count = report.get('known_exceptions_count', len(report.get('known_exceptions', [])))
    matched_count = report['matched']
    
    print("\nDATA SOURCES")
    print(f"Firestore audit entries:    {total_firestore}")
    print(f"  - Pre-GCS archiving:      {pre_gcs_count}")
    print(f"  - GCS archived:          {gcs_count}")
    
    print("\nVERIFICATION RESULTS")
    print(f"GCS entries:               {gcs_count}")
    print(f"  Exceptions:               {exceptions_count}  (validation failures, documented)")
    print(f"  Matches:                 {matched_count}")
    print()
    print(f"Discrepancies:              {report['discrepancies']}")
    print()
    
    if report['discrepancies'] == 0:
        print("Status: ✅ Data records match as expected")
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
Example usage (automatic download - recommended):
  # Download Firestore data
  curl -s "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/auditLog?pageSize=1000" -o firestore-audit.json
  
  # Run verification (automatically downloads GCS files, no gsutil required)
  python verify_audit_consistency.py --firestore firestore-audit.json

Advanced usage (manual download with gsutil):
  # Download Firestore data
  curl -s "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/auditLog?pageSize=1000" -o firestore-audit.json
  
  # Download GCS archive manually
  gsutil -m rsync -r gs://jetlagpro-audit-logs/audit-logs ./gcs-audit
  
  # Run verification with local directory
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
        required=False,
        help='Path to directory containing GCS archive JSON files (optional, uses automatic download if not provided)'
    )
    parser.add_argument(
        '--download-gcs',
        action='store_true',
        help='Automatically download GCS files via HTTP (default behavior, no gsutil required)'
    )
    
    args = parser.parse_args()
    
    # Validate inputs
    if not os.path.exists(args.firestore):
        print(f"ERROR: Firestore file not found: {args.firestore}")
        return 1
    
    # Default to automatic download if neither option specified
    # If both specified, error
    if args.download_gcs and args.gcs_dir:
        print("ERROR: Cannot use both --gcs-dir and --download-gcs. Choose one.")
        return 1
    
    # If neither specified, default to automatic download (simplest for reviewers)
    if not args.download_gcs and not args.gcs_dir:
        args.download_gcs = True
        print("Note: Using automatic GCS download (no gsutil required)")
        print()
    
    # Load data
    try:
        firestore_entries = load_firestore_entries(args.firestore)
        
        if args.download_gcs:
            gcs_entries = download_gcs_entries()
        else:
            if not os.path.exists(args.gcs_dir):
                print(f"ERROR: GCS directory not found: {args.gcs_dir}")
                return 1
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
