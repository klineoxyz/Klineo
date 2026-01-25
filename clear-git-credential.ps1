# Clear cached GitHub credentials so Git will prompt for klineoxyz + PAT
# Run this in PowerShell OUTSIDE Cursor (Win+R -> powershell -> Enter)

Write-Host "Clearing GitHub credentials..." -ForegroundColor Cyan
$cred = "protocol=https`nhost=github.com"
$cred | git credential reject 2>$null
if ($LASTEXITCODE -eq 0) { Write-Host "Cleared." -ForegroundColor Green }
else {
    Write-Host "CLI clear failed. Use Windows Credential Manager:" -ForegroundColor Yellow
    Write-Host "  1. Win+R -> control /name Microsoft.CredentialManager -> Enter"
    Write-Host "  2. Windows Credentials -> remove 'git:https://github.com' or 'github.com'"
}
Write-Host ""
Write-Host "Then run: cd $PSScriptRoot; git push -u origin main" -ForegroundColor Cyan
Write-Host "Use klineoxyz + klineoxyz's PAT when prompted." -ForegroundColor Gray
