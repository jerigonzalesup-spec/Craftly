@echo off
echo Building APK...
call gradlew.bat assembleDebug
echo.
echo Installing on phone...
adb install -r app\build\outputs\apk\debug\app-debug.apk
echo.
echo Done! Check your phone.
pause
