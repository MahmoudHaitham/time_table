# Build and Push Backend Docker Image - PowerShell Version

$ErrorActionPreference = "Stop"

Write-Host "=========================================="
Write-Host "Building Backend Docker Image"
Write-Host "=========================================="

# Get the script directory and navigate to backend
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$BackendDir = Join-Path $ProjectRoot "backend"

Set-Location $BackendDir

# Build Docker image
Write-Host "Building image: mabouellais/timetable-backend:deploy"
docker build -t mabouellais/timetable-backend:deploy .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build backend image"
    exit 1
}

Write-Host ""
Write-Host "=========================================="
Write-Host "Pushing Backend Image to Docker Hub"
Write-Host "=========================================="

# Push to Docker Hub
docker push mabouellais/timetable-backend:deploy

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to push backend image"
    exit 1
}

Write-Host ""
Write-Host "✅ Backend image built and pushed successfully!" -ForegroundColor Green
Write-Host "Image: mabouellais/timetable-backend:deploy"
