#!/bin/bash

# Kill any existing Python HTTP servers
pkill -f "python3 -m http.server" 2>/dev/null

# Wait a moment for the port to be freed
sleep 1

# Start the server in the current directory
echo "Starting development server on http://localhost:8000"
echo "Press Ctrl+C to stop"
python3 -m http.server 8000 