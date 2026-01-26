# Build and Push All Docker Images - PowerShell Version
# Convenience script to build both frontend and backend

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=========================================="
Write-Host "Building All Docker Images"
Write-Host "=========================================="
Write-Host ""

# Login to Docker Hub
Write-Host "Step 1: Login to Docker Hub"
Write-Host "----------------------------"
& "$ScriptDir\docker-login.ps1"
Write-Host ""

# Build Backend
Write-Host "Step 2: Build Backend"
Write-Host "----------------------------"
& "$ScriptDir\build-backend.ps1"
Write-Host ""

# Build Frontend
Write-Host "Step 3: Build Frontend"
Write-Host "----------------------------"
& "$ScriptDir\build-frontend.ps1"
Write-Host ""

Write-Host "=========================================="
Write-Host "✅ All images built and pushed successfully!" -ForegroundColor Green
Write-Host "=========================================="
Write-Host ""
Write-Host "To deploy, run from project root:"
Write-Host "  docker-compose up -d"
