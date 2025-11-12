#!/usr/bin/env python3
"""
Audit consistency verifier.

Usage:
    python scripts/verify_audit_consistency.py --firestore firestore.json --gcs-dir ./audit-logs

Inputs:
    --firestore  Path to Firestore export JSON. If omitted, the script will fetch from the default REST endpoint.
    --gcs-dir    Directory containing immutable audit JSON files downloaded from GCS.
"""

import argparse
import json
import pathlib
import sys
from typing import Any, Dict, Tuple

import urllib.request

FIRESTORE_DEFAULT_URL = (
    "https://firestore.googleapis.com/v1/projects/jetlagpro-research/"
    "databases/(default)/documents/auditLog?pageSize=1000"
)


def load_firestore_documents(path: str) -> Dict[str, Dict[str, Any]]:
    """
    Load Firestore audit documents and convert to native Python dictionaries.
    """
    if path:
        data = json.loads(pathlib.Path(path).read_text())
    else:
        with urllib.request.urlopen(FIRESTORE_DEFAULT_URL) as response:
            data = json.loads(response.read().decode("utf-8"))

    documents = data.get("documents", [])
    result = {}
    for doc in documents:
        native = convert_firestore_document(doc)
        key = native.get("eventId") or native.get("documentId")
        if not key:
            key = doc["name"].split("/")[-1]
        result[key] = native
    return result


def convert_firestore_document(document: Dict[str, Any]) -> Dict[str, Any]:
    fields = document.get("fields", {})
    native = {}
    for key, value in fields.items():
        native[key] = extract_firestore_value(value)
    native.setdefault("documentId", document["name"].split("/")[-1])
    return native


def extract_firestore_value(field: Dict[str, Any]) -> Any:
    if "stringValue" in field:
        return field["stringValue"]
    if "integerValue" in field:
        try:
            return int(field["integerValue"])
        except ValueError:
            return field["integerValue"]
    if "booleanValue" in field:
        return field["booleanValue"]
    if "doubleValue" in field:
        return field["doubleValue"]
    if "nullValue" in field:
        return None
    if "timestampValue" in field:
        return field["timestampValue"]
    if "mapValue" in field:
        map_fields = field["mapValue"].get("fields", {})
        return {k: extract_firestore_value(v) for k, v in map_fields.items()}
    if "arrayValue" in field:
        values = field["arrayValue"].get("values", [])
        return [extract_firestore_value(v) for v in values]
    return field


def load_gcs_documents(directory: str) -> Dict[str, Dict[str, Any]]:
    """
    Load immutable audit entries from GCS download directory.
    """
    result = {}
    base = pathlib.Path(directory)
    for file_path in base.glob("**/*.json"):
        data = json.loads(file_path.read_text())
        key = data.get("eventId") or data.get("documentId")
        if not key:
            key = file_path.name
        result[key] = data
    return result


def canonical_json(data: Dict[str, Any]) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"))


def compare_firestore_gcs(
    firestore_docs: Dict[str, Dict[str, Any]],
    gcs_docs: Dict[str, Dict[str, Any]],
) -> Tuple[int, int, Dict[str, str]]:
    """
    Returns:
        matched_count, mismatch_count, discrepancies
    """
    mismatches = {}
    matched = 0
    discrepancies = {}

    for key, fs_doc in firestore_docs.items():
        gcs_doc = gcs_docs.get(key)
        if not gcs_doc:
            discrepancies[key] = "Missing in GCS"
            continue

        if canonical_json(fs_doc) != canonical_json(gcs_doc):
            discrepancies[key] = "Content differs"
        else:
            matched += 1

    return matched, len(discrepancies), discrepancies


def main():
    parser = argparse.ArgumentParser(description="Verify audit trail consistency.")
    parser.add_argument("--firestore", help="Path to Firestore export JSON")
    parser.add_argument("--gcs-dir", required=True, help="Directory with GCS audit JSON files")
    args = parser.parse_args()

    firestore_docs = load_firestore_documents(args.firestore)
    gcs_docs = load_gcs_documents(args.gcs_dir)

    matched, discrepancies_count, discrepancies = compare_firestore_gcs(firestore_docs, gcs_docs)

    print(f"Firestore entries: {len(firestore_docs)}")
    print(f"GCS entries:       {len(gcs_docs)}")
    print(f"Matched:           {matched}")
    print(f"Discrepancies:     {discrepancies_count}")

    if discrepancies:
        print("\nDiscrepancies found:")
        for key, reason in discrepancies.items():
            print(f"- {key}: {reason}")
        sys.exit(1)

    if len(firestore_docs) != len(gcs_docs):
        print("\nCounts differ between Firestore and GCS.")
        sys.exit(1)

    print("\nAudit verification complete: all records match.")


if __name__ == "__main__":
    main()

