# Starts the Python backend (api.py, port 8002) and the Next.js frontend together.
# Usage: right-click > Run with PowerShell, or from a PowerShell prompt: .\run.ps1

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root

Write-Host "Checking Python dependencies..." -ForegroundColor Cyan
py -m pip install -r requirements.txt --quiet --disable-pip-version-check

Write-Host "Starting backend (api.py) on port 8002..." -ForegroundColor Cyan
$backend = Start-Process py -ArgumentList "-m uvicorn api:app --host 127.0.0.1 --port 8002 --reload" -PassThru -WindowStyle Normal

Write-Host "Starting frontend (Next.js) on port 3000..." -ForegroundColor Cyan
$frontend = Start-Process cmd -ArgumentList "/c", "npm run dev" -PassThru -WindowStyle Normal

Write-Host ""
Write-Host "Backend PID:  $($backend.Id)  ->  http://127.0.0.1:8002" -ForegroundColor Green
Write-Host "Frontend PID: $($frontend.Id)  ->  http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Close the two opened windows (or stop these processes) to shut everything down." -ForegroundColor Yellow
