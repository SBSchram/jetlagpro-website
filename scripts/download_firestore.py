#!/usr/bin/env python3
"""
Download Firestore collection data via REST API with automatic pagination.

Usage:
    python download_firestore.py [collection] [output_file]

Examples:
    python download_firestore.py auditLog firestore-audit.json
    python download_firestore.py tripCompletions firestore-trips.json
"""

import json
import sys
import urllib.request

def download_collection(collection, output_file):
    """Download all documents from a Firestore collection, handling pagination automatically."""
    base_url = f'https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/{collection}?pageSize=1000'
    all_docs = []
    token = None
    
    print(f'Downloading {collection}...', end='', flush=True)
    
    while True:
        url = base_url + (f'&pageToken={token}' if token else '')
        response = json.loads(urllib.request.urlopen(url).read())
        docs = response.get('documents', [])
        all_docs.extend(docs)
        print('.', end='', flush=True)
        
        token = response.get('nextPageToken')
        if not token:
            break
    
    with open(output_file, 'w') as f:
        json.dump({'documents': all_docs}, f, indent=2)
    
    print(f'\nDownloaded {len(all_docs)} documents to {output_file}')

if __name__ == '__main__':
    collection = sys.argv[1] if len(sys.argv) > 1 else 'auditLog'
    output = sys.argv[2] if len(sys.argv) > 2 else f'firestore-{collection}.json'
    
    try:
        download_collection(collection, output)
    except Exception as e:
        print(f'\nError: {e}', file=sys.stderr)
        sys.exit(1)

