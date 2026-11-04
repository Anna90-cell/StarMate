#!/usr/bin/env bash
# StarMate one-click startup for macOS / Linux
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
    echo "[StarMate] Creating virtual environment..."
    python3 -m venv .venv
    source .venv/bin/activate
    python -m pip install --upgrade pip
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

echo "[StarMate] Starting backend at http://127.0.0.1:5000 ..."
python app.py
