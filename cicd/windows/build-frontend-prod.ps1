# Build and Push Frontend Docker Image - Production Version (with /api)
# This builds with NEXT_PUBLIC_API_URL=/api for production deployment

$ErrorActionPreference = "Stop"

Write-Host "=========================================="
Write-Host "Building Frontend Docker Image (PRODUCTION)"
Write-Host "=========================================="

# Get the script directory and navigate to project root (frontend is in root)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)

Set-Location $ProjectRoot

# Build Docker image with production API URL
Write-Host "Building image: mabouellais/timetable-frontend:deploy"
Write-Host "Setting NEXT_PUBLIC_API_URL=/api for production..."
docker build --build-arg NEXT_PUBLIC_API_URL=/api -t mabouellais/timetable-frontend:deploy -f Dockerfile .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build frontend image"
    exit 1
}

Write-Host ""
Write-Host "=========================================="
Write-Host "Pushing Frontend Image to Docker Hub"
Write-Host "=========================================="

# Push to Docker Hub
docker push mabouellais/timetable-frontend:deploy

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to push frontend image"
    exit 1
}

Write-Host ""
Write-Host "✅ Frontend image built and pushed successfully!" -ForegroundColor Green
Write-Host "Image: mabouellais/timetable-frontend:deploy"
Write-Host "Built with NEXT_PUBLIC_API_URL=/api (production)"
