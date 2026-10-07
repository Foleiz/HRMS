@echo off
setlocal EnableDelayedExpansion

title HRMS Local Server Runner
cd /d "%~dp0"

:MENU
cls
echo ==============================================================================
echo        HRMS (Enterprise Human Resource Management System)
echo                  Local Test Server Launcher
echo ==============================================================================
echo.
echo   [1] Start Full System (Backend API + Frontend Web + Open Browser)
echo   [2] Start Backend Only (.NET 10 API - Port 5229)
echo   [3] Start Frontend Only (Next.js 16 - Port 4001)
echo   [4] Stop All Servers (Kill Ports 5229 ^& 4001)
echo   [5] Check Server Status (Port 5229 ^& 4001)
echo   [6] Start Full System - PRODUCTION mode (faster pages, for testers via VPN)
echo   [0] Exit
echo.
echo ==============================================================================
echo   Default: [1] (Auto-starts in 5 seconds if no key is pressed)
echo ==============================================================================
choice /c 1234560 /t 5 /d 1 /n /m "Select option [1-6, 0]: "
set CHOICE=%ERRORLEVEL%

if "%CHOICE%"=="1" goto START_ALL
if "%CHOICE%"=="2" goto START_BACKEND
if "%CHOICE%"=="3" goto START_FRONTEND
if "%CHOICE%"=="4" goto STOP_ALL
if "%CHOICE%"=="5" goto CHECK_STATUS
if "%CHOICE%"=="6" goto START_PROD
if "%CHOICE%"=="7" goto EXIT_SCRIPT

:START_ALL
echo.
echo ==============================================================================
echo [1/3] Checking prerequisites...
echo ==============================================================================

where dotnet >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] .NET SDK is not installed or not found in PATH!
    echo Please install .NET 10 SDK before running this script.
    echo.
    echo Press any key to return to menu...
    pause >nul
    goto MENU
)

where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js / npm is not installed or not found in PATH!
    echo Please install Node.js before running this script.
    echo.
    echo Press any key to return to menu...
    pause >nul
    goto MENU
)

echo [OK] Prerequisites verified (.NET SDK and Node.js found).
echo.

echo ==============================================================================
echo [2/3] Launching servers in separate command windows...
echo ==============================================================================

echo - Launching Backend API (.NET 10) on http://localhost:5229 ...
start "HRMS [Backend API - Port 5229]" /D "%~dp0backend" cmd /k "title HRMS Backend API (Port 5229) && color 0A && echo Starting HRMS Backend API... && dotnet run --project src/Hrms.Api/Hrms.Api.csproj --urls "http://0.0.0.0:5229""

ping 127.0.0.1 -n 3 >nul

echo - Launching Frontend Web (Next.js) on http://localhost:4001 ...
start "HRMS [Frontend Web - Port 4001]" /D "%~dp0frontend" cmd /k "title HRMS Frontend Web (Port 4001) && color 0B && echo Starting HRMS Frontend (Next.js)... && npm run dev"

echo.
echo ==============================================================================
echo [3/3] Servers are starting up!
echo ==============================================================================
echo   * Frontend Web   : http://localhost:4001
echo   * Backend Swagger: http://localhost:5229/swagger
echo   * Backend Health : http://localhost:5229/api/health
echo ==============================================================================
echo.
echo Opening default web browser to http://localhost:4001 in 5 seconds...
ping 127.0.0.1 -n 6 >nul
start http://localhost:4001

echo.
echo Servers are running in background windows.
echo To stop servers later, select [4] or run "stop server.bat".
echo.
echo Press any key to return to main menu...
pause >nul
goto MENU

:START_PROD
echo.
echo ==============================================================================
echo Production mode: build frontend once, then serve the optimized build
echo  - pages are not compiled on first visit and API calls are not doubled
echo  - after changing frontend code, run this option again to rebuild
echo ==============================================================================
start "HRMS [Backend API - Port 5229]" /D "%~dp0backend" cmd /k "title HRMS Backend API (Port 5229) && color 0A && echo Starting HRMS Backend API... && dotnet run --project src/Hrms.Api/Hrms.Api.csproj --urls "http://0.0.0.0:5229""
ping 127.0.0.1 -n 3 >nul
start "HRMS [Frontend Web - Port 4001]" /D "%~dp0frontend" cmd /k "title HRMS Frontend Web PROD (Port 4001) && color 0B && echo Building frontend (takes 1-3 minutes)... && npm run build && npm run start -- -H 0.0.0.0"
echo.
echo [OK] Servers launching. Open http://localhost:4001 after the frontend build finishes.
echo.
echo Press any key to return to main menu...
pause >nul
goto MENU

:START_BACKEND
echo.
echo ==============================================================================
echo Launching Backend API (.NET 10)...
echo ==============================================================================
start "HRMS [Backend API - Port 5229]" /D "%~dp0backend" cmd /k "title HRMS Backend API (Port 5229) && color 0A && echo Starting HRMS Backend API... && dotnet run --project src/Hrms.Api/Hrms.Api.csproj --urls "http://0.0.0.0:5229""

ping 127.0.0.1 -n 4 >nul
start http://localhost:5229/swagger
echo [OK] Backend API window launched. Swagger UI opened.
echo.
echo Press any key to return to main menu...
pause >nul
goto MENU

:START_FRONTEND
echo.
echo ==============================================================================
echo Launching Frontend Web (Next.js)...
echo ==============================================================================
start "HRMS [Frontend Web - Port 4001]" /D "%~dp0frontend" cmd /k "title HRMS Frontend Web (Port 4001) && color 0B && echo Starting HRMS Frontend (Next.js)... && npm run dev"

ping 127.0.0.1 -n 4 >nul
start http://localhost:4001
echo [OK] Frontend Web window launched. Browser opened.
echo.
echo Press any key to return to main menu...
pause >nul
goto MENU

:STOP_ALL
echo.
echo ==============================================================================
echo Stopping HRMS local servers...
echo ==============================================================================

taskkill /f /im Hrms.Api.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Terminated Hrms.Api.exe process.
) else (
    echo [-] Hrms.Api.exe was not running.
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5229" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo [OK] Killed process on Port 5229 [PID %%a].
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4001" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo [OK] Killed process on Port 4001 [PID %%a].
)

echo.
echo [DONE] All local servers stopped.
echo.
echo Press any key to return to main menu...
pause >nul
goto MENU

:CHECK_STATUS
echo.
echo ==============================================================================
echo Checking Server Status:
echo ==============================================================================
echo [Backend Port 5229]:
netstat -ano | findstr ":5229" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   --^> Status: [ONLINE] Running on port 5229
) else (
    echo   --^> Status: [OFFLINE] Port 5229 is not active
)
echo.
echo [Frontend Port 4001]:
netstat -ano | findstr ":4001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   --^> Status: [ONLINE] Running on port 4001
) else (
    echo   --^> Status: [OFFLINE] Port 4001 is not active
)
echo ==============================================================================
echo.
echo Press any key to return to main menu...
pause >nul
goto MENU

:EXIT_SCRIPT
echo Exiting HRMS Local Server Runner. Goodbye!
exit /b 0
