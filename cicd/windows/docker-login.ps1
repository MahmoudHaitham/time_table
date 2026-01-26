# Docker Hub Login Script - PowerShell Version
# Reads credentials from .env file and logs into Docker Hub

$ErrorActionPreference = "Stop"

Write-Host "=========================================="
Write-Host "Docker Hub Login"
Write-Host "=========================================="

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Load .env file from parent directory (cicd/)
$EnvFile = Join-Path (Split-Path -Parent $ScriptDir) ".env"

if (-Not (Test-Path $EnvFile)) {
    Write-Error "Error: .env file not found in cicd directory"
    exit 1
}

# Parse .env file
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($key -and $value) {
            Set-Variable -Name $key -Value $value -Scope Script
        }
    }
}

# Check if credentials are set
if (-Not $DOCKERUSER -or -Not $DOCKERTOKEN) {
    Write-Error "Error: DOCKERUSER or DOCKERTOKEN not set in .env file"
    exit 1
}

# Login to Docker Hub
Write-Host "Logging into Docker Hub as $DOCKERUSER..."

$DOCKERTOKEN | docker login -u $DOCKERUSER --password-stdin

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully logged into Docker Hub!" -ForegroundColor Green
} else {
    Write-Error "Failed to login to Docker Hub"
    exit 1
}
