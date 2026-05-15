@echo off
setlocal

cd /d "%~dp0"

start "Expense API - localhost:5000" cmd /k "cd /d backend && npm run dev"
start "Expense Frontend - localhost:3000" cmd /k "cd /d frontend && npm run dev -- --port 3000"

echo Started backend and frontend dev servers.
echo.
echo Backend:  http://localhost:5000/health
echo Frontend: http://localhost:3000/register
echo.
echo Keep both opened command windows running while using the app.

