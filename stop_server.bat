@echo off
setlocal EnableDelayedExpansion

title HRMS Stop Local Servers
cd /d "%~dp0"

echo ==============================================================================
echo Stopping HRMS local servers (Backend Port 5229, Frontend Port 3000)...
echo ==============================================================================

:: Terminate Hrms.Api process
taskkill /f /im Hrms.Api.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Terminated Hrms.Api.exe process.
) else (
    echo [-] Hrms.Api.exe was not running.
)

:: Terminate Port 5229
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5229" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo [OK] Killed process on Port 5229 [PID %%a].
)

:: Terminate Port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo [OK] Killed process on Port 3000 [PID %%a].
)

echo.
echo ==============================================================================
echo [DONE] All local servers stopped successfully.
echo ==============================================================================
ping 127.0.0.1 -n 3 >nul
