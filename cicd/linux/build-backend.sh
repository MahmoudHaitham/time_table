#!/bin/bash

# Build and Push Backend Docker Image

set -e

echo "=========================================="
echo "Building Backend Docker Image"
echo "=========================================="

# Navigate to backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "Script directory: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"
echo "Looking for backend directory: $PROJECT_ROOT/backend"

# Check if backend directory exists
if [ ! -d "$PROJECT_ROOT/backend" ]; then
    echo "Error: Backend directory not found at $PROJECT_ROOT/backend"
    echo "Current directory: $(pwd)"
    echo "Please run this script from the cicd/linux directory"
    exit 1
fi

cd "$PROJECT_ROOT/backend"

# Check if Dockerfile exists
if [ ! -f "Dockerfile" ]; then
    echo "Error: Dockerfile not found in $PROJECT_ROOT/backend"
    echo "Current directory: $(pwd)"
    echo "Files in current directory:"
    ls -la
    exit 1
fi

echo "Found Dockerfile. Building from: $(pwd)"

# Build Docker image
echo "Building image: mabouellais/timetable-backend:deploy"
docker build -t mabouellais/timetable-backend:deploy .

if [ $? -ne 0 ]; then
    echo "Error: Failed to build backend image"
    exit 1
fi

echo ""
echo "=========================================="
echo "Pushing Backend Image to Docker Hub"
echo "=========================================="

# Push to Docker Hub
docker push mabouellais/timetable-backend:deploy

if [ $? -ne 0 ]; then
    echo "Error: Failed to push backend image"
    exit 1
fi

echo ""
echo "✅ Backend image built and pushed successfully!"
echo "Image: mabouellais/timetable-backend:deploy"
