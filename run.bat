@echo off
title My Bookshelf App
echo ====================================================
echo Starting My Bookshelf (Python + SQLite)
echo ====================================================

cd /d "%~dp0"

IF NOT EXIST ".venv\Scripts\python.exe" (
    echo Setting up Python virtual environment...
    py -m venv .venv
    IF NOT EXIST ".venv\Scripts\python.exe" (
        python -m venv .venv
    )
    echo Installing dependencies...
    .\.venv\Scripts\python.exe -m pip install -r requirements.txt
)

echo.
echo Bookshelf app is running!
echo URL: http://127.0.0.1:5000
echo.
echo Opening browser in 2 seconds...
start "" "http://127.0.0.1:5000"

.\.venv\Scripts\python.exe app.py
pause
