#!/usr/bin/env python3
"""
JetLagPro Audit Trail Verification Script

Verifies that Firestore audit log matches the immutable GCS archive.
This provides tamper-evident proof that the live database has not been modified.

Usage:
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


def normalize_entry(entry: Dict) -> Dict:
    """
    Normalize an audit entry to a canonical format for comparison.
    Handles differences between Firestore REST API and GCS JSON formats.
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
    Uses sorted keys to ensure consistent ordering.
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


def verify_consistency(firestore_entries: List[Dict], gcs_entries: List[Dict]) -> Dict:
    """
    Verify that Firestore entries match GCS archive.
    Returns a report dict with discrepancies.
    """
    print("\nVerifying consistency...")
    
    # Build sets of entry hashes for comparison
    firestore_hashes = {compute_entry_hash(e): e for e in firestore_entries}
    gcs_hashes = {compute_entry_hash(e): e for e in gcs_entries}
    
    # Find discrepancies
    missing_in_gcs = set(firestore_hashes.keys()) - set(gcs_hashes.keys())
    missing_in_firestore = set(gcs_hashes.keys()) - set(firestore_hashes.keys())
    matching = set(firestore_hashes.keys()) & set(gcs_hashes.keys())
    
    report = {
        'total_firestore': len(firestore_entries),
        'total_gcs': len(gcs_entries),
        'matching': len(matching),
        'missing_in_gcs': len(missing_in_gcs),
        'missing_in_firestore': len(missing_in_firestore),
        'missing_in_gcs_entries': [firestore_hashes[h] for h in missing_in_gcs],
        'missing_in_firestore_entries': [gcs_hashes[h] for h in missing_in_firestore]
    }
    
    return report


def print_report(report: Dict) -> int:
    """
    Print verification report.
    Returns exit code: 0 if all match, 1 if discrepancies found.
    """
    print("\n" + "="*60)
    print("VERIFICATION REPORT")
    print("="*60)
    print(f"Firestore entries: {report['total_firestore']}")
    print(f"GCS archive entries: {report['total_gcs']}")
    print(f"Matching entries: {report['matching']}")
    print(f"Missing in GCS: {report['missing_in_gcs']}")
    print(f"Missing in Firestore: {report['missing_in_firestore']}")
    print("="*60)
    
    if report['missing_in_gcs'] == 0 and report['missing_in_firestore'] == 0:
        print("\n✓ VERIFICATION PASSED")
        print("All Firestore entries match GCS archive.")
        print("No evidence of tampering detected.")
        return 0
    else:
        print("\n✗ VERIFICATION FAILED")
        print("Discrepancies detected between Firestore and GCS archive.")
        
        if report['missing_in_gcs'] > 0:
            print(f"\n{report['missing_in_gcs']} entries in Firestore but NOT in GCS:")
            for entry in report['missing_in_gcs_entries'][:5]:  # Show first 5
                trip_id = entry.get('tripId', 'unknown')
                operation = entry.get('operation', 'unknown')
                print(f"  - Trip: {trip_id}, Operation: {operation}")
            if report['missing_in_gcs'] > 5:
                print(f"  ... and {report['missing_in_gcs'] - 5} more")
        
        if report['missing_in_firestore'] > 0:
            print(f"\n{report['missing_in_firestore']} entries in GCS but NOT in Firestore:")
            for entry in report['missing_in_firestore_entries'][:5]:  # Show first 5
                trip_id = entry.get('tripId', 'unknown')
                operation = entry.get('operation', 'unknown')
                print(f"  - Trip: {trip_id}, Operation: {operation}")
            if report['missing_in_firestore'] > 5:
                print(f"  ... and {report['missing_in_firestore'] - 5} more")
        
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
