# Product Detail Crash - Debugging Guide

The app has been enhanced with detailed logging to pinpoint the exact cause of the crash when viewing a product.

## How to Capture Crash Logs

### Option 1: Using Android Studio Logcat
1. Open Android Studio
2. Click **View → Tool Windows → Logcat** (or press Alt+6)
3. In the Logcat filter field, type: `ProductDetailActivity`
4. Run the app on your emulator or device
5. Click on any product card
6. Watch the Logcat output in real-time
7. Copy all the logs related to ProductDetailActivity and share them

### Option 2: Using ADB Command Line
1. Open Command Prompt/PowerShell
2. Navigate to Android SDK platform-tools directory
3. Run: `adb logcat | grep ProductDetailActivity`
4. Click on a product in the app
5. The crash logs will appear on screen

## What the Logs Will Show

The logs now show:
- `===== ProductDetailActivity onCreate START =====` - When activity starts
- `✓ Layout set` - Layout loaded successfully
- `✓ API Service initialized` - Retrofit initialized
- `✓ backButton initialized` - Each view being initialized
- `✓ Coroutine started for product loading` - Network call starting
- `✓ API call completed` - Product data received
- `CRASH!` - If there's an exception, it will be marked with this prefix

## Expected Log Flow (Without Crash)

```
===== ProductDetailActivity onCreate START =====
✓ Layout set
✓ API Service initialized: true
✓ Calling initializeViews()...
✓ backButton initialized
✓ favoriteButton initialized
✓ loadingProgressBar initialized
✓ imageViewPager initialized
✓ pageIndicator initialized
...
✓ All views initialized successfully
✓ initializeViews() completed
✓ Calling setupListeners()...
✓ setupListeners() completed
✓ Calling setupReviewsRecyclerView()...
✓ setupReviewsRecyclerView() completed
✓ Calling loadProductDetails()...
✓ loadProductDetails() called (async)
===== ProductDetailActivity onCreate END =====
Coroutine started for product loading
API Service is OK, making network call...
Making API call for product ID: [product-id-here]
API call completed, response received
API Response: success=true, hasData=true
Product name: [product-name-here]
✓ Product loaded: [product-name-here]
```

## Next Steps

1. **Try the app now** - run it on your emulator or device
2. **Click on a product** - this should trigger the crash
3. **Copy the logcat output** - paste it here so I can identify the exact issue
4. The logs will tell us exactly which line is failing

## Alternative: Check Build Output

If you can't capture logcat, please try:
1. Run the app in debug mode
2. Try to view a product
3. Check what happens on screen (does it show an error toast? Does it just close?)
4. Tell me what you see
