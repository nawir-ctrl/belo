@echo off
title SmartBell Local - Auto Launcher
cd /d "%~dp0\..\.."

:: 1. Mulai Web Server & Scheduler Worker di latar belakang (minimized)
start "SmartBell Service" /min cmd /c "call scripts\windows\start-smartbell.bat"

:: 2. Buka Audio Player di browser dengan flag autoplay
call scripts\windows\start-kiosk-player.bat
