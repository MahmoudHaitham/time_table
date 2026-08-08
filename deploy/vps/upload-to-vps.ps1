# Upload all VPS files in one shot (run from project root)
# Usage: .\deploy\vps\upload-to-vps.ps1 -VpsHost "YOUR_VPS_IP"

param(
    [Parameter(Mandatory = $true)]
    [string]$VpsHost,

    [string]$SqlPath = "C:\Users\Mahmoud Hitham\Downloads\assignments\terms.sql"
)

$ErrorActionPreference = "Stop"
$VPS = "root@$VpsHost"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "Creating directories on VPS..."
ssh $VPS "mkdir -p /root/portfolio/backend /root/portfolio/cicd/deployment"

Write-Host "Uploading docker-compose.yml..."
scp "$PSScriptRoot\docker-compose.yml" "${VPS}:/root/portfolio/docker-compose.yml"

Write-Host "Uploading .env files..."
scp "$PSScriptRoot\root.env.template"    "${VPS}:/root/portfolio/.env"
scp "$PSScriptRoot\backend.env.template" "${VPS}:/root/portfolio/backend/.env"

Write-Host "Uploading deployment scripts..."
scp "$PSScriptRoot\cicd\deployment\05-deploy-app.sh"       "${VPS}:/root/portfolio/cicd/deployment/"
scp "$PSScriptRoot\cicd\deployment\06-restore-database.sh" "${VPS}:/root/portfolio/cicd/deployment/"
scp "$PSScriptRoot\cicd\deployment\check-status.sh"        "${VPS}:/root/portfolio/cicd/deployment/"

if (Test-Path $SqlPath) {
    Write-Host "Uploading terms.sql..."
    scp $SqlPath "${VPS}:/root/portfolio/terms.sql"
} else {
    Write-Host "WARNING: terms.sql not found at $SqlPath — upload manually."
}

Write-Host ""
Write-Host "Done! Now SSH in and run:"
Write-Host "  ssh $VPS"
Write-Host "  chmod +x /root/portfolio/cicd/deployment/*.sh"
Write-Host "  cd /root/portfolio && bash cicd/deployment/05-deploy-app.sh"
Write-Host "  bash cicd/deployment/06-restore-database.sh"
