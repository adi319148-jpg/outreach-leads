@echo off
title OutreachAI — Live Real-Time Preview
color 0B

cd /d "%~dp0"

echo ========================================================
echo   ⚡ OutreachAI — Live Real-Time Browser Preview
echo ========================================================
echo.
echo   [1/2] Clearing ports 5173 and 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /f /pid %%a >nul 2>&1

echo   [2/2] Starting Backend and Frontend servers...
echo.
echo   🌐 Dashboard will open at: http://localhost:5173
echo   (Press Ctrl+C to stop)
echo.

start "" powershell -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5173'"

npm run dev
