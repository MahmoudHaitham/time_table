# Test Runner Script (PowerShell)
# Runs all automated tests and generates report

Write-Host "🧪 Running Complete Test Suite..." -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "Checking backend server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✓ Backend server is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend server is not running" -ForegroundColor Red
    Write-Host "Please start the backend server first: cd backend && npm start" -ForegroundColor Yellow
    exit 1
}

# Run tests
Write-Host ""
Write-Host "Running Jest tests..." -ForegroundColor Yellow
npm test -- --coverage

# Run security scan
Write-Host ""
Write-Host "Running security scan..." -ForegroundColor Yellow
npm run security-scan

# Summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Test suite completed!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Visual/UI tests require manual verification" -ForegroundColor Yellow
Write-Host "See AUTOMATION_SUMMARY.md for details" -ForegroundColor Yellow
