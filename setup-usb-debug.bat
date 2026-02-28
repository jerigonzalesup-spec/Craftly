@echo off
SET ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe

echo ============================================
echo  Craftly USB Debug Setup
echo ============================================
echo.

if not exist "%ADB%" (
    echo ERROR: adb.exe not found at:
    echo   %ADB%
    echo.
    echo Make sure Android Studio is installed.
    pause
    exit /b 1
)

echo Checking connected devices...
"%ADB%" devices
echo.

echo Setting up port tunneling (phone port 5000 -> PC port 5000)...
FOR /F "tokens=1 delims= " %%i IN ('"%ADB%" devices ^| findstr /v "List" ^| findstr "device"') DO (
    echo   Configuring device: %%i
    "%ADB%" -s %%i reverse tcp:5000 tcp:5000
)

echo.
echo Done! You can now run the app on your USB device.
echo (Run this script again each time you replug the device)
echo.
pause
