@echo off
title Aranyam Launcher
echo ===================================================
echo 🌲 Starting Aranyam: Ecological Infrastructure Planner
echo ===================================================

:: Start Backend
echo [*] Starting FastAPI Backend on port 8000...
start "Aranyam Backend" cmd /k "cd backend && ..\venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

:: Start Frontend
echo [*] Start React dev server...
start "Aranyam Frontend" cmd /k "cd frontend && npm.cmd run dev"

:: Wait a brief moment and open the browser
timeout /t 3 /nobreak >nul
echo [*] Opening browser to http://localhost:5173/
start http://localhost:5173/

echo ===================================================
echo 🚀 Aranyam is running! Keep the terminal windows open.
echo ===================================================
