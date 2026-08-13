@echo off
title Localhost WIZ Bangka Belitung
color 0A
cls
echo ========================================================
echo   WAHDAH INSPIRASI ZAKAT (WIZ) BANGKA BELITUNG
echo   Localhost Web Server Launcher
echo ========================================================
echo.
echo   Memulai Localhost pada Port 3000...
echo   Buka browser Anda dan akses: http://localhost:3000
echo.
echo ========================================================
echo.
node server.js
if %errorlevel% neq 0 (
    echo.
    echo Node.js tidak ditemukan, mencoba npx serve...
    npx -y serve . -p 3000
)
pause
