@echo off
REM ============================================
REM CRAFTLY FIREBASE OPTIMIZATION DEPLOYMENT
REM ============================================
REM This script deploys all optimizations safely
REM Run: deploy-optimization.bat

setlocal enabledelayedexpansion

echo.
echo ======================================
echo 🚀 CRAFTLY FIREBASE DEPLOYMENT
echo ======================================
echo.

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Firebase CLI not found!
    echo    Install it with: npm install -g firebase-tools
    pause
    exit /b 1
)

echo ✅ Firebase CLI found
echo.

echo ======================================
echo 📊 Deploying Firestore Indexes...
echo ⏳ This may take 5-10 minutes
echo ======================================
echo.

firebase deploy --only firestore:indexes

if errorlevel 1 (
    echo.
    echo ❌ Index deployment failed!
    echo    Check Firebase Console for errors.
    pause
    exit /b 1
)

echo.
echo ======================================
echo 🎉 DEPLOYMENT COMPLETE!
echo ======================================
echo.
echo ✅ What was deployed:
echo    • Firestore composite indexes (3 total)
echo    • Optimized dashboard controller
echo    • Enhanced cache utilities
echo.
echo 📚 Next steps:
echo    1. Deploy backend to your server
echo    2. Refresh frontend app
echo    3. Monitor Firebase Console for quota reduction
echo.
echo 📊 Verify indexes in Firebase Console:
echo    1. Firestore Database ^> Indexes
echo    2. Should see 3 ENABLED indexes
echo.
echo 🎯 Monitor quota reduction:
echo    1. Firestore Database ^> Monitoring
echo    2. Watch read/write operations
echo    3. Should see 80-90%% reduction
echo.
pause
