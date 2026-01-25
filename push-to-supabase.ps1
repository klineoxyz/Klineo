# Push KLINEO migrations to Supabase
# Run this in PowerShell OUTSIDE Cursor (Win+R -> powershell -> cd to project)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# 1. Set your Supabase DATABASE PASSWORD (from Supabase Dashboard -> Project Settings -> Database)
#    Replace "YOUR_DB_PASSWORD" with your actual password, or set env before running:
#    $env:SUPABASE_DB_PASSWORD = "your-password"
if (-not $env:SUPABASE_DB_PASSWORD) {
    Write-Host "SUPABASE_DB_PASSWORD not set." -ForegroundColor Yellow
    Write-Host "Get it from: Supabase Dashboard -> Project Settings -> Database -> Database password" -ForegroundColor Gray
    Write-Host ""
    $pwd = Read-Host "Enter your Supabase database password (input hidden)"
    $env:SUPABASE_DB_PASSWORD = $pwd
}

# 2. Unset proxy if it causes "dial tcp 127.0.0.1" errors
$env:HTTP_PROXY = $null
$env:HTTPS_PROXY = $null
$env:http_proxy = $null
$env:https_proxy = $null

# 3. Push migrations
Write-Host "Pushing migrations to Supabase..." -ForegroundColor Cyan
pnpm supabase:push

if ($LASTEXITCODE -eq 0) {
    Write-Host "Done. Migrations applied." -ForegroundColor Green
} else {
    Write-Host "Push failed. Run commands manually:" -ForegroundColor Red
    Write-Host "  `$env:SUPABASE_DB_PASSWORD = 'your-db-password'" -ForegroundColor Gray
    Write-Host "  pnpm supabase:link    # if not linked yet" -ForegroundColor Gray
    Write-Host "  pnpm supabase:push" -ForegroundColor Gray
}
