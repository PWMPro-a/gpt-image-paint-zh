@echo off
cd /d "%~dp0"
if not exist node_modules (
  call npm.cmd ci
  if errorlevel 1 exit /b 1
)
call npm.cmd run dev -- --host 127.0.0.1 --port 8768 --strictPort
if errorlevel 1 pause
