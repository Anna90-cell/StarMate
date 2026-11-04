@echo off
rem StarMate frontend static server (Windows)
rem Serves ONLY the frontend/ folder as the root directory.
rem Backend writes to data/ will NOT trigger a page auto-refresh,
rem which fixes "page resets to initial state after sending a message".
rem
rem Usage:
rem   1) Start backend in another window first:  python app.py  (port 5000)
rem   2) Run this file.  Default frontend port: 5500
rem   3) Open http://127.0.0.1:5500/focus.html in your browser
cd /d "%~dp0frontend"
echo [StarMate] Frontend: http://127.0.0.1:5500/focus.html
echo [StarMate] Make sure backend is running on port 5000.
echo ------------------------------------------------------------
python -m http.server 5500
pause
