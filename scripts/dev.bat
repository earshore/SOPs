@echo off
start /B vite
timeout /t 2 /nobreak >nul
node scripts/open-chrome.js
