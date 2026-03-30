#!/usr/bin/env python3
"""
Export validated JetLagPro trips to CSV for R analysis.

Uses the same validation and composite score logic as analyze_jetlag_data.py.
Output columns match what analyze_jetlag_r.R expects.

Usage:
    python export_trips_for_r.py --trips trips.json --output firebase_export.csv

Requirements: Python 3.6+ (no extra packages). Run from repo root or scripts/.
"""

import csv
import sys
import os
import re

# Import shared logic from analyze_jetlag_data (same directory)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyze_jetlag_data import (
    load_trips,
    filter_valid_trips,
    calculate_aggregate_severity,
)


def trip_to_row(trip):
    """Build one CSV row from a validated trip (Firestore-style keys)."""
    trip_id = trip.get("tripId", "")
    device_id = ""
    if isinstance(trip_id, str) and trip_id:
        parts = re.split(r"[-_]", trip_id) if "/" not in trip_id else trip_id.split("/")
        device_id = parts[0] if parts else ""
    if not device_id and trip.get("deviceId") is not None:
        device_id = str(trip.get("deviceId")).strip()

    jetlag_score = calculate_aggregate_severity(trip)
    if jetlag_score is None:
        return None
    tz = trip.get("timezonesCount")
    try:
        time_zones = int(tz) if tz is not None else None
    except (ValueError, TypeError):
        time_zones = None
    direction = trip.get("travelDirection")
    if isinstance(direction, str):
        direction = direction.strip().lower()
    points = trip.get("pointsCompleted")
    try:
        stimulated_points = int(points) if points is not None else None
    except (ValueError, TypeError):
        stimulated_points = None
    if time_zones is None or direction not in ("east", "west") or stimulated_points is None:
        return None
    row = {
        "trip_id": trip_id,
        "device_id": device_id,
        "start_date": trip.get("startDate", ""),
        "time_zones": time_zones,
        "direction": direction,
        "stimulated_points": stimulated_points,
        "jetlag_score": round(jetlag_score, 4),
        "sleep_post": trip.get("sleepPost"),
        "fatigue_post": trip.get("fatiguePost"),
        "concentration_post": trip.get("concentrationPost"),
        "irritability_post": trip.get("irritabilityPost"),
        "motivation_post": trip.get("motivationPost"),
        "gi_post": trip.get("giPost"),
    }
    return row


def main():
    import argparse
    p = argparse.ArgumentParser(description="Export validated trips to CSV for R")
    p.add_argument("--trips", default="trips.json", help="Path to tripCompletions JSON")
    p.add_argument("--output", default="firebase_export.csv", help="Output CSV path")
    args = p.parse_args()

    trips = load_trips(args.trips)
    valid = filter_valid_trips(trips)
    rows = []
    for t in valid:
        row = trip_to_row(t)
        if row is not None:
            rows.append(row)
    if not rows:
        print("No rows to export (missing composite score or covariates).")
        return 1
    fieldnames = list(rows[0].keys())
    with open(args.output, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"Exported {len(rows)} trips to {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
