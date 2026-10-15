@echo off
title SmartBell Local - Kiosk Player Launcher
echo Menunggu server SmartBell siap...
timeout /t 5 /nobreak >nul

set BROWSER_FLAGS=--autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding

:: Coba cari Google Chrome
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk http://127.0.0.1:3000/player %BROWSER_FLAGS%
    exit
)

if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --kiosk http://127.0.0.1:3000/player %BROWSER_FLAGS%
    exit
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --kiosk http://127.0.0.1:3000/player %BROWSER_FLAGS%
    exit
)

:: Alternatif Microsoft Edge (bawaan Windows 10/11)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk http://127.0.0.1:3000/player --edge-kiosk-type=fullscreen %BROWSER_FLAGS%
    exit
)

:: Fallback browser default
start http://127.0.0.1:3000/player
