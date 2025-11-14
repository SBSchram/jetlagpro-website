#!/usr/bin/env python3
"""
JetLagPro Data Analysis Script

Reproduces all statistical analyses shown on the JetLagPro analysis dashboard.
This script analyzes trip completion data to assess the effectiveness of 
chronoacupuncture for jet lag symptoms.

Usage:
    python analyze_jetlag_data.py --trips trips.json --output analysis_report.txt

Requirements:
    - Python 3.6+
    - pandas
    - scipy
    - numpy

Install dependencies:
    pip install pandas scipy numpy

Author: Steven Schram PhD, DC, LAc
License: MIT
Repository: https://github.com/SBSchram/jetlagpro-website
"""

import json
import sys
from datetime import datetime
from typing import Dict, List, Tuple
import argparse


def load_trips(trips_path: str) -> List[Dict]:
    """Load trip records from JSON file."""
    print(f"Loading trips from: {trips_path}")
    
    with open(trips_path, 'r') as f:
        data = json.load(f)
    
    # Handle Firestore REST API format
    if 'documents' in data:
        trips = []
        for doc in data['documents']:
            trip = {}
            if 'fields' in doc:
                # Extract fields from Firestore format
                for key, value in doc['fields'].items():
                    if 'stringValue' in value:
                        trip[key] = value['stringValue']
                    elif 'integerValue' in value:
                        trip[key] = int(value['integerValue'])
                    elif 'doubleValue' in value:
                        trip[key] = float(value['doubleValue'])
                    elif 'booleanValue' in value:
                        trip[key] = value['booleanValue']
                    elif 'timestampValue' in value:
                        trip[key] = value['timestampValue']
                    elif 'arrayValue' in value:
                        # Handle array fields (like stimulatedPoints)
                        trip[key] = []
                        if 'values' in value['arrayValue']:
                            for item in value['arrayValue']['values']:
                                if 'stringValue' in item:
                                    trip[key].append(item['stringValue'])
                                elif 'integerValue' in item:
                                    trip[key].append(int(item['integerValue']))
                                elif 'doubleValue' in item:
                                    trip[key].append(float(item['doubleValue']))
            trips.append(trip)
    elif isinstance(data, list):
        trips = data
    else:
        trips = [data]
    
    print(f"  Loaded {len(trips)} trip records")
    return trips


def filter_valid_trips(trips: List[Dict]) -> List[Dict]:
    """
    Filter to only valid trips for analysis.
    
    Excludes:
    - Test trips (isTest = True)
    - Incomplete trips (missing required survey data)
    - Developer sessions
    """
    valid_trips = []
    
    for trip in trips:
        # Skip test trips
        if trip.get('isTest', False):
            continue
        
        # Skip if missing required survey data
        if not trip.get('postTravelSurvey'):
            continue
        
        # Skip if missing trip ID (data integrity issue)
        if not trip.get('tripId'):
            continue
        
        # Must have stimulated points count
        if 'totalPointsStimulated' not in trip:
            continue
        
        valid_trips.append(trip)
    
    print(f"  Filtered to {len(valid_trips)} valid trips for analysis")
    return valid_trips


def calculate_aggregate_severity(survey: Dict) -> float:
    """
    Calculate aggregate symptom severity from survey responses.
    
    Averages the following symptoms (each rated 0-10):
    - Fatigue
    - Sleep disruption
    - Cognitive function
    - Mood
    - Digestive issues
    """
    symptoms = [
        survey.get('fatigue', 0),
        survey.get('sleepDisruption', 0),
        survey.get('cognitiveFunction', 0),
        survey.get('mood', 0),
        survey.get('digestiveIssues', 0)
    ]
    
    # Convert to numeric (in case strings)
    symptoms = [float(s) if s else 0 for s in symptoms]
    
    return sum(symptoms) / len(symptoms) if symptoms else 0


def calculate_time_zone_difference(trip: Dict) -> int:
    """
    Calculate time zone difference crossed.
    
    Returns absolute difference between departure and arrival time zones.
    """
    dep_tz = trip.get('departureTimeZone', 0)
    arr_tz = trip.get('arrivalTimeZone', 0)
    
    # Handle string values
    try:
        dep_tz = float(dep_tz) if dep_tz else 0
        arr_tz = float(arr_tz) if arr_tz else 0
    except (ValueError, TypeError):
        return 0
    
    return abs(int(arr_tz - dep_tz))


def categorize_time_zones(tz_diff: int) -> str:
    """Categorize time zone difference into groups."""
    if tz_diff <= 2:
        return "1-2"
    elif tz_diff <= 5:
        return "3-5"
    elif tz_diff <= 8:
        return "6-8"
    else:
        return "9+"


def categorize_stimulation(points: int) -> str:
    """Categorize stimulation level based on points stimulated."""
    if points <= 2:
        return "no-intervention"
    elif points <= 5:
        return "low"
    elif points <= 8:
        return "moderate"
    else:
        return "high"


def basic_statistics(trips: List[Dict]) -> Dict:
    """Calculate basic trip statistics."""
    stats = {
        'total_trips': len(trips),
        'trips_with_signatures': 0,
        'legacy_trips': 0,
        'test_trips_filtered': 0,
        'avg_points_stimulated': 0,
        'avg_severity': 0,
        'time_zone_distribution': {},
        'stimulation_distribution': {}
    }
    
    points_list = []
    severity_list = []
    
    for trip in trips:
        # Count signatures
        if trip.get('hmacSignature'):
            stats['trips_with_signatures'] += 1
        else:
            stats['legacy_trips'] += 1
        
        # Points stimulated
        points = trip.get('totalPointsStimulated', 0)
        points_list.append(points)
        
        # Severity
        if trip.get('postTravelSurvey'):
            severity = calculate_aggregate_severity(trip['postTravelSurvey'])
            severity_list.append(severity)
        
        # Time zone distribution
        tz_diff = calculate_time_zone_difference(trip)
        tz_cat = categorize_time_zones(tz_diff)
        stats['time_zone_distribution'][tz_cat] = stats['time_zone_distribution'].get(tz_cat, 0) + 1
        
        # Stimulation distribution
        stim_cat = categorize_stimulation(points)
        stats['stimulation_distribution'][stim_cat] = stats['stimulation_distribution'].get(stim_cat, 0) + 1
    
    stats['avg_points_stimulated'] = sum(points_list) / len(points_list) if points_list else 0
    stats['avg_severity'] = sum(severity_list) / len(severity_list) if severity_list else 0
    
    return stats


def dose_response_analysis(trips: List[Dict]) -> Dict:
    """
    Analyze dose-response relationship.
    
    Groups trips by time zone category and stimulation level,
    calculates mean severity for each group.
    """
    # Group trips by time zone and stimulation level
    groups = {}
    
    for trip in trips:
        tz_diff = calculate_time_zone_difference(trip)
        tz_cat = categorize_time_zones(tz_diff)
        
        points = trip.get('totalPointsStimulated', 0)
        stim_cat = categorize_stimulation(points)
        
        if not trip.get('postTravelSurvey'):
            continue
        
        severity = calculate_aggregate_severity(trip['postTravelSurvey'])
        
        key = f"{tz_cat}_tz_{stim_cat}_stim"
        if key not in groups:
            groups[key] = []
        groups[key].append(severity)
    
    # Calculate statistics for each group
    results = {}
    for key, severities in groups.items():
        if len(severities) > 0:
            results[key] = {
                'n': len(severities),
                'mean': sum(severities) / len(severities),
                'min': min(severities),
                'max': max(severities)
            }
            
            # Calculate standard deviation
            mean = results[key]['mean']
            variance = sum((x - mean) ** 2 for x in severities) / len(severities)
            results[key]['std'] = variance ** 0.5
            
            # Standard error of the mean
            results[key]['sem'] = results[key]['std'] / (len(severities) ** 0.5)
    
    return results


def stimulation_efficacy_analysis(trips: List[Dict]) -> Dict:
    """
    Analyze stimulation efficacy.
    
    For each stimulation level, calculate mean severity across different
    time zone crossings to assess intervention effectiveness.
    """
    # Group by stimulation level and time zone
    stim_groups = {
        'no-intervention': {},
        'low': {},
        'moderate': {},
        'high': {}
    }
    
    for trip in trips:
        points = trip.get('totalPointsStimulated', 0)
        stim_cat = categorize_stimulation(points)
        
        tz_diff = calculate_time_zone_difference(trip)
        tz_cat = categorize_time_zones(tz_diff)
        
        if not trip.get('postTravelSurvey'):
            continue
        
        severity = calculate_aggregate_severity(trip['postTravelSurvey'])
        
        if tz_cat not in stim_groups[stim_cat]:
            stim_groups[stim_cat][tz_cat] = []
        stim_groups[stim_cat][tz_cat].append(severity)
    
    # Calculate statistics
    results = {}
    for stim_level, tz_data in stim_groups.items():
        results[stim_level] = {}
        for tz_cat, severities in tz_data.items():
            if len(severities) > 0:
                mean = sum(severities) / len(severities)
                variance = sum((x - mean) ** 2 for x in severities) / len(severities) if len(severities) > 1 else 0
                std = variance ** 0.5
                sem = std / (len(severities) ** 0.5) if len(severities) > 1 else 0
                
                results[stim_level][tz_cat] = {
                    'n': len(severities),
                    'mean': mean,
                    'std': std,
                    'sem': sem
                }
    
    return results


def point_usage_analysis(trips: List[Dict]) -> Dict:
    """
    Analyze which acupuncture points were most commonly stimulated.
    """
    point_counts = {}
    
    for trip in trips:
        points = trip.get('stimulatedPoints', [])
        if isinstance(points, list):
            for point in points:
                point_counts[point] = point_counts.get(point, 0) + 1
    
    # Sort by frequency
    sorted_points = sorted(point_counts.items(), key=lambda x: x[1], reverse=True)
    
    return dict(sorted_points)


def generate_report(stats: Dict, dose_response: Dict, stimulation: Dict, point_usage: Dict, output_path: str):
    """Generate human-readable analysis report."""
    
    lines = []
    lines.append("="*70)
    lines.append("JETLAGPRO DATA ANALYSIS REPORT")
    lines.append("="*70)
    lines.append("")
    
    # Basic Statistics
    lines.append("BASIC STATISTICS")
    lines.append("-"*70)
    lines.append(f"Total valid trips: {stats['total_trips']}")
    lines.append(f"Trips with HMAC signatures: {stats['trips_with_signatures']}")
    lines.append(f"Legacy trips (no signature): {stats['legacy_trips']}")
    lines.append(f"Average points stimulated: {stats['avg_points_stimulated']:.2f}")
    lines.append(f"Average post-travel severity: {stats['avg_severity']:.2f}")
    lines.append("")
    
    lines.append("Time Zone Distribution:")
    for tz_cat, count in sorted(stats['time_zone_distribution'].items()):
        lines.append(f"  {tz_cat} time zones: {count} trips")
    lines.append("")
    
    lines.append("Stimulation Level Distribution:")
    for stim_cat, count in sorted(stats['stimulation_distribution'].items()):
        lines.append(f"  {stim_cat}: {count} trips")
    lines.append("")
    
    # Dose-Response Analysis
    lines.append("DOSE-RESPONSE ANALYSIS")
    lines.append("-"*70)
    lines.append("Mean symptom severity by time zone and stimulation level:")
    lines.append("")
    
    for key, data in sorted(dose_response.items()):
        lines.append(f"{key}:")
        lines.append(f"  n = {data['n']}")
        lines.append(f"  mean = {data['mean']:.2f}")
        lines.append(f"  std = {data['std']:.2f}")
        lines.append(f"  sem = {data['sem']:.2f}")
        lines.append("")
    
    # Stimulation Efficacy
    lines.append("STIMULATION EFFICACY ANALYSIS")
    lines.append("-"*70)
    lines.append("Mean severity by stimulation level across time zones:")
    lines.append("")
    
    for stim_level, tz_data in sorted(stimulation.items()):
        lines.append(f"{stim_level.upper()}:")
        for tz_cat, data in sorted(tz_data.items()):
            lines.append(f"  {tz_cat} TZ: mean={data['mean']:.2f}, n={data['n']}, sem={data['sem']:.2f}")
        lines.append("")
    
    # Point Usage
    lines.append("POINT USAGE ANALYSIS")
    lines.append("-"*70)
    lines.append("Most frequently stimulated acupuncture points:")
    lines.append("")
    
    for point, count in list(point_usage.items())[:15]:  # Top 15
        lines.append(f"  {point}: {count} times")
    lines.append("")
    
    lines.append("="*70)
    lines.append(f"Report generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("="*70)
    
    # Write to file
    report_text = "\n".join(lines)
    with open(output_path, 'w') as f:
        f.write(report_text)
    
    print(f"\nReport saved to: {output_path}")
    
    # Also print to console
    print("\n" + report_text)


def main():
    """Main analysis workflow."""
    parser = argparse.ArgumentParser(
        description='Analyze JetLagPro trip completion data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example usage:
  # Download trip data from Firestore
  curl -s "https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/tripCompletions?pageSize=1000" -o trips.json
  
  # Run analysis
  python analyze_jetlag_data.py --trips trips.json --output report.txt
  
  # Compare output with live dashboard at:
  https://jetlagpro.com/reviewers/analysis.html
        """
    )
    
    parser.add_argument(
        '--trips',
        required=True,
        help='Path to trips JSON file from Firestore'
    )
    parser.add_argument(
        '--output',
        default='analysis_report.txt',
        help='Path to output report file (default: analysis_report.txt)'
    )
    
    args = parser.parse_args()
    
    # Load and filter trips
    try:
        trips = load_trips(args.trips)
        valid_trips = filter_valid_trips(trips)
        
        if len(valid_trips) == 0:
            print("ERROR: No valid trips found in dataset")
            return 1
        
    except FileNotFoundError:
        print(f"ERROR: Trips file not found: {args.trips}")
        return 1
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in trips file: {e}")
        return 1
    except Exception as e:
        print(f"ERROR: Failed to load trips: {e}")
        return 1
    
    # Run analyses
    print("\nRunning analyses...")
    print("-" * 70)
    
    stats = basic_statistics(valid_trips)
    print("✓ Basic statistics calculated")
    
    dose_response = dose_response_analysis(valid_trips)
    print("✓ Dose-response analysis complete")
    
    stimulation = stimulation_efficacy_analysis(valid_trips)
    print("✓ Stimulation efficacy analysis complete")
    
    point_usage = point_usage_analysis(valid_trips)
    print("✓ Point usage analysis complete")
    
    # Generate report
    generate_report(stats, dose_response, stimulation, point_usage, args.output)
    
    print("\n✓ Analysis complete!")
    print("\nCompare this output with the live dashboard:")
    print("  https://jetlagpro.com/reviewers/analysis.html")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())

