@echo off
title OutreachAI - Cloudflare Online Launcher
color 0B

echo =======================================================
echo  🚀 OutreachAI — Starting Local Server & Cloudflare Tunnel
echo =======================================================
echo.

cd /d "%~dp0"

:: 1. Start Node.js Unified Server in background window
echo [1/2] Starting Outreach Engine Server (Port 3001)...
start "Outreach Engine Server" cmd /k "cd /d "%~dp0" && title Outreach Engine Backend && node server/dist/index.js"

:: 2. Wait 3 seconds for server initialization
timeout /t 3 /nobreak >nul

:: 3. Start Cloudflare Tunnel
echo.
echo [2/2] Connecting to Cloudflare Global Network...
echo =======================================================
echo  Look for the link below ending in: .trycloudflare.com
echo  You can open that HTTPS link on ANY mobile or laptop!
echo =======================================================
echo.

cloudflared.exe tunnel --url http://localhost:3001

pause
