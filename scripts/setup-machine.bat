@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "PS1_PATH=%SCRIPT_DIR%setup-machine.ps1"

if not exist "%PS1_PATH%" (
  echo [setup-machine] Missing PowerShell bootstrap: "%PS1_PATH%"
  exit /b 1
)

powershell -ExecutionPolicy Bypass -File "%PS1_PATH%" %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo [setup-machine] Bootstrap failed with exit code %EXIT_CODE%.
  exit /b %EXIT_CODE%
)

exit /b 0
