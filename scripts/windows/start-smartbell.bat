@echo off
title SmartBell Local - Server & Scheduler
color 1F

echo ================================================================
echo   SMARTBELL LOCAL - SISTEM BEL OTOMATIS SEKOLAH
echo ================================================================
echo   Memulai Web Server dan Scheduler Worker Lokal...
echo   Port: 3000 (http://127.0.0.1:3000)
echo   Pemutar Bel: http://127.0.0.1:3000/player
echo ================================================================

cd /d "%~dp0\..\.."

:: Jalankan server dan scheduler bersamaan
call npm run start:all

pause
