@echo off
rem StarMate one-click startup for Windows (demo machine friendly)
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [StarMate] Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    echo [StarMate] Installing dependencies...
    python -m pip install --upgrade pip
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)

echo [StarMate] Starting backend at http://127.0.0.1:5000 ...
python app.py
pause
