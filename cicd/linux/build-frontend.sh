#!/bin/bash

# Build and Push Frontend Docker Image

set -e

echo "=========================================="
echo "Building Frontend Docker Image"
echo "=========================================="

# Navigate to project root (frontend is in root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "Script directory: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"
echo "Current directory before cd: $(pwd)"

# Check if project root exists
if [ ! -d "$PROJECT_ROOT" ]; then
    echo "Error: Project root not found at $PROJECT_ROOT"
    echo "Please ensure the script is in cicd/linux/ directory"
    exit 1
fi

cd "$PROJECT_ROOT"
echo "Current directory after cd: $(pwd)"

# Check if Dockerfile exists
if [ ! -f "Dockerfile" ]; then
    echo "Error: Dockerfile not found in $PROJECT_ROOT"
    echo "Files in current directory:"
    ls -la
    exit 1
fi

echo "Found Dockerfile. Building from: $(pwd)"

# Build Docker image
echo "Building image: mabouellais/timetable-frontend:deploy"
echo "Clearing Docker build cache to fix layer corruption issues..."
docker builder prune -f
echo "Building with --no-cache to avoid corrupted layer issues..."
echo "Setting NEXT_PUBLIC_API_URL=/api for production..."
docker build --no-cache --build-arg NEXT_PUBLIC_API_URL=/api -t mabouellais/timetable-frontend:deploy -f Dockerfile .

if [ $? -ne 0 ]; then
    echo "Error: Failed to build frontend image"
    exit 1
fi

echo ""
echo "=========================================="
echo "Pushing Frontend Image to Docker Hub"
echo "=========================================="

# Push to Docker Hub
docker push mabouellais/timetable-frontend:deploy

if [ $? -ne 0 ]; then
    echo "Error: Failed to push frontend image"
    exit 1
fi

echo ""
echo "✅ Frontend image built and pushed successfully!"
echo "Image: mabouellais/timetable-frontend:deploy"
