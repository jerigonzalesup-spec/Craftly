# Craftly Android Installer
# Builds the debug APK and installs to all connected devices/emulators

$ADB = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$APK = "$PSScriptRoot\app\build\outputs\apk\debug\app-debug.apk"

# ── 1. Verify adb ────────────────────────────────────────────────────────────
if (-not (Test-Path $ADB)) {
    Write-Host "ERROR: adb not found at $ADB" -ForegroundColor Red
    Write-Host "Make sure Android SDK Platform-Tools are installed." -ForegroundColor Yellow
    exit 1
}

# ── 2. Build the APK ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==> Building debug APK..." -ForegroundColor Cyan
& "$PSScriptRoot\gradlew.bat" assembleDebug
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed." -ForegroundColor Red
    exit 1
}
Write-Host "==> Build successful." -ForegroundColor Green

# ── 3. List connected devices ─────────────────────────────────────────────────
$rawDevices = & $ADB devices | Select-Object -Skip 1 | Where-Object { $_ -match '\S' }
$devices = $rawDevices | ForEach-Object { ($_ -split '\s+')[0] } | Where-Object { $_ -ne '' }

if ($devices.Count -eq 0) {
    Write-Host ""
    Write-Host "ERROR: No devices connected." -ForegroundColor Red
    Write-Host "  - For emulator:  start one from Android Studio → Device Manager" -ForegroundColor Yellow
    Write-Host "  - For physical:  enable USB Debugging in Developer Options, then plug in" -ForegroundColor Yellow
    exit 1
}

# ── 4. Install to every connected device ─────────────────────────────────────
Write-Host ""
Write-Host "==> Found $($devices.Count) device(s):" -ForegroundColor Cyan
foreach ($dev in $devices) {
    $model = (& $ADB -s $dev shell getprop ro.product.model 2>$null).Trim()
    Write-Host "    [$dev] $model"
}

Write-Host ""
foreach ($dev in $devices) {
    $model = (& $ADB -s $dev shell getprop ro.product.model 2>$null).Trim()
    Write-Host "==> Installing on [$dev] $model ..." -ForegroundColor Cyan

    # Force-stop the app first so adb can overwrite it cleanly
    Write-Host "    Stopping running app (if any)..." -ForegroundColor Gray
    & $ADB -s $dev shell am force-stop com.craftly 2>$null | Out-Null

    & $ADB -s $dev install -r -d $APK
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    Done." -ForegroundColor Green
        # Auto-launch after install
        & $ADB -s $dev shell am start -n com.craftly/.SplashActivity 2>$null | Out-Null
        Write-Host "    App launched." -ForegroundColor Green
    } else {
        Write-Host "    FAILED on $dev" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==> All done." -ForegroundColor Green
