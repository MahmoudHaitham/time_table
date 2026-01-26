#!/bin/bash

# Build and Push All Docker Images
# Convenience script to build both frontend and backend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Building All Docker Images"
echo "=========================================="
echo ""

# Login to Docker Hub
echo "Step 1: Login to Docker Hub"
echo "----------------------------"
bash "$SCRIPT_DIR/docker-login.sh"
echo ""

# Build Backend
echo "Step 2: Build Backend"
echo "----------------------------"
bash "$SCRIPT_DIR/build-backend.sh"
echo ""

# Build Frontend
echo "Step 3: Build Frontend"
echo "----------------------------"
bash "$SCRIPT_DIR/build-frontend.sh"
echo ""

echo "=========================================="
echo "✅ All images built and pushed successfully!"
echo "=========================================="
echo ""
echo "To deploy, run from project root:"
echo "  docker-compose up -d"
