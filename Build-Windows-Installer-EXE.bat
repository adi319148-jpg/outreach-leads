@echo off
title Build OutreachAI Windows .EXE Installer
color 0A

cd /d "%~dp0"

echo ========================================================
echo   ?? Building Standalone Windows Desktop .EXE Installer...
echo ========================================================
echo.
echo   [1/3] Building React Client and TypeScript Server...
echo   [2/3] Bundling with Electron & Icons...
echo   [3/3] Packaging into Windows Setup (.EXE)...
echo.
echo   (Please wait around 20-30 seconds while files compress...)
echo.

call npm run dist:win

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed! Check errors above.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo  ?? BUILD COMPLETE!
echo  ?? Opening "dist-electron" folder now...
echo ========================================================
echo.

start "" "%~dp0dist-electron"

pause
