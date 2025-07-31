@echo off
title Freqtrade Backtest Manager Launcher
cls

echo.
echo ==================================================
echo  Starting Freqtrade Backtest Manager Services
echo ==================================================
echo.

echo Checking for pnpm...
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
  echo Error: pnpm is not installed.
  echo Please install pnpm and ensure it is in your PATH.
  pause
  exit /b 1
)
echo pnpm found.
echo.

echo Installing dependencies...
pnpm install
echo.

echo Starting Frontend Development Server in a new window...
rem Use `cmd /k` to keep the window open after the command finishes or errors out.
start "Frontend" cmd /k "pnpm run dev"

echo.
echo Starting Worker Service in a new window...
rem Use `cmd /k` to keep the window open after the command finishes or errors out.
start "Worker" cmd /k "pnpm run worker"
echo.

echo ==================================================
echo  Services are starting in separate windows.
echo ==================================================
echo.
echo You can now monitor the logs in the newly opened "Frontend" and "Worker" windows.
echo.
echo If a window closes immediately, it means there was an error.
echo This window will remain open. Press any key to exit this launcher.
echo.

pause