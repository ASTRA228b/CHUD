@echo off
setlocal
cd /d "%~dp0"
if not exist "studio\dist\index.html" (
  echo Build CHUD first with powershell -File scripts\build.ps1
  pause
  exit /b 1
)
if not exist "studio\node_modules\electron\dist\electron.exe" (
  echo Install Studio dependencies with npm ci --prefix studio
  pause
  exit /b 1
)
start "CHUD Studio" "studio\node_modules\electron\dist\electron.exe" "%~dp0studio"
