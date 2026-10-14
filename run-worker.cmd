@echo off
REM Keeps the Tata OMS scraper worker running. Restarts it if it ever exits.
REM Point a Windows startup shortcut at this file so dashboard "Fetch" requests
REM are executed on this PC (which can reach the Tata portal) at any time.
cd /d "%~dp0"
if not exist "logs" mkdir "logs"
:loop
echo [%date% %time%] starting worker >> "logs\worker.log"
node local-worker.mjs >> "logs\worker.log" 2>&1
echo [%date% %time%] worker exited, restarting in 10s >> "logs\worker.log"
timeout /t 10 /nobreak >nul
goto loop
