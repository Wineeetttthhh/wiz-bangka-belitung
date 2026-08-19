@echo off
title WIZ Babel - Dev Server ^& Auto Push Watcher
color 0A
cls
echo ========================================================
echo   WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
echo   Dev Server ^& Auto-Push Launcher
echo ========================================================
echo.
echo   1. Localhost Web Server (Live-Reload) pada: http://localhost:3000
echo   2. Auto-Push ke GitHub ^& Deploy Vercel Otomatis
echo.
echo   Setiap kali file diubah/disimpan di Antigravity:
echo   - Browser Lokal otomatis reload!
echo   - Web Online (Vercel) otomatis terdeploy!
echo.
echo ========================================================
echo.
cd /d "%~dp0"
node dev-server.js
pause
