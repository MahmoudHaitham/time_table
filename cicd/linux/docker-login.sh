#!/bin/bash

# Docker Hub Login Script
# Reads credentials from .env file and logs into Docker Hub

set -e

# Get the parent directory (cicd/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CICD_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Docker Hub Login"
echo "=========================================="

# Load environment variables from .env file in cicd/
if [ -f "$CICD_DIR/.env" ]; then
    export $(cat "$CICD_DIR/.env" | grep -v '^#' | xargs)
else
    echo "Error: .env file not found in cicd directory"
    exit 1
fi

# Check if credentials are set
if [ -z "$DOCKERUSER" ] || [ -z "$DOCKERTOKEN" ]; then
    echo "Error: DOCKERUSER or DOCKERTOKEN not set in .env file"
    exit 1
fi

# Login to Docker Hub
echo "Logging into Docker Hub as $DOCKERUSER..."
echo "$DOCKERTOKEN" | docker login -u "$DOCKERUSER" --password-stdin

if [ $? -eq 0 ]; then
    echo "✅ Successfully logged into Docker Hub!"
else
    echo "Failed to login to Docker Hub"
    exit 1
fi
