#!/bin/bash

# Test Runner Script
# Runs all automated tests and generates report

echo "🧪 Running Complete Test Suite..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo "Checking backend server..."
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend server is running${NC}"
else
    echo -e "${RED}✗ Backend server is not running${NC}"
    echo "Please start the backend server first: cd backend && npm start"
    exit 1
fi

# Run tests
echo ""
echo "Running Jest tests..."
npm test -- --coverage

# Run security scan
echo ""
echo "Running security scan..."
npm run security-scan

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test suite completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Note: Visual/UI tests require manual verification"
echo "See AUTOMATION_SUMMARY.md for details"
