# KLINEO Frontend Startup Script
# Run this script to start the frontend dev server

Write-Host "🚀 Starting KLINEO Frontend..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Not in KLINEO project directory" -ForegroundColor Red
    Write-Host "   Please run: cd c:\Users\Muaz\Desktop\KLINEO" -ForegroundColor Yellow
    exit 1
}

# Check dependencies
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "❌ Dependencies not installed!" -ForegroundColor Red
    Write-Host "   Running: pnpm install" -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}

# Check .env.local
Write-Host ""
Write-Host "🔐 Checking environment variables..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ .env.local file missing!" -ForegroundColor Red
    Write-Host "   Please create .env.local with required variables" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ .env.local exists" -ForegroundColor Green
}

# Check required files
Write-Host ""
Write-Host "📄 Checking required files..." -ForegroundColor Yellow
$requiredFiles = @("index.html", "src/main.tsx", "vite.config.ts")
$allExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $file missing!" -ForegroundColor Red
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Host ""
    Write-Host "❌ Missing required files. Cannot start server." -ForegroundColor Red
    exit 1
}

# Check if port 5173 is in use
Write-Host ""
Write-Host "🔌 Checking port 5173..." -ForegroundColor Yellow
$portInUse = netstat -ano | findstr :5173
if ($portInUse) {
    Write-Host "⚠️  Port 5173 is in use!" -ForegroundColor Yellow
    Write-Host "   You may need to kill the process or change the port" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   To kill process on port 5173:" -ForegroundColor Cyan
    Write-Host "   netstat -ano | findstr :5173" -ForegroundColor Gray
    Write-Host "   taskkill /PID <pid> /F" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
} else {
    Write-Host "✅ Port 5173 is available" -ForegroundColor Green
}

# Start the server
Write-Host ""
Write-Host "🚀 Starting Vite dev server..." -ForegroundColor Cyan
Write-Host "   URL: http://localhost:5173" -ForegroundColor Gray
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

pnpm run dev
