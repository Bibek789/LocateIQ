#!/bin/bash

# LocateIQ Startup Script
echo "🚀 Starting LocateIQ..."

# Navigate to project directory
cd /Users/santumanna/LocateIQ

# Activate virtual environment
source venv/bin/activate

# Start the Flask application
echo "✅ Virtual environment activated"
echo "🌐 Starting Flask server on http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

python app.py
