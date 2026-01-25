# Push KLINEO to GitHub
# Run this in Windows PowerShell OUTSIDE Cursor (Win+R -> powershell -> Enter)

$ErrorActionPreference = "Stop"
Set-Location "c:\Users\Muaz\Desktop\KLINEO"

# If you get "Failed to connect via 127.0.0.1", uncomment the next 2 lines:
# $env:HTTP_PROXY = ""
# $env:HTTPS_PROXY = ""

Write-Host "Pushing main to https://github.com/klineoxyz/Klineo ..." -ForegroundColor Cyan
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Done! KLINEO is now on GitHub: https://github.com/klineoxyz/Klineo" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Push failed. See PUSH_TO_GITHUB_NOW.md for troubleshooting." -ForegroundColor Yellow
}
