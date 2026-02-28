package com.craftly.core.network

import android.content.Context
import android.content.SharedPreferences
import android.os.Build

object NetworkConfig {
    private const val PREFS_NAME = "network_config"
    private const val API_URL_KEY = "api_url"
    private const val CUSTOM_IP_KEY = "custom_ip"

    // URLs for different scenarios
    const val LOCALHOST_URL = "http://localhost:5000/"           // Physical device with adb reverse
    const val EMULATOR_URL  = "http://10.0.2.2:5000/"           // Android emulator

    // ─── PRODUCTION URL ──────────────────────────────────────────────────────
    // After deploying craftly-api to Railway:
    //   1. Go to your Railway project dashboard
    //   2. Click the deployed service → Settings → Domains → copy the URL
    //   3. Paste it here (must end with a /)
    // Example: "https://craftly-api-production.up.railway.app/"
    const val PRODUCTION_URL = ""   // ← FILL THIS IN after deploying

    // Real physical devices will use PRODUCTION_URL (if set), otherwise LOCALHOST_URL
    val DEFAULT_URL get() = if (PRODUCTION_URL.isNotBlank()) PRODUCTION_URL else LOCALHOST_URL

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Auto-detect and set appropriate URL
        val detectedUrl = detectAndSetProperUrl()
        android.util.Log.d("NetworkConfig", "Initialized with URL: $detectedUrl (Emulator: ${isEmulator()})")
    }

    private fun detectAndSetProperUrl(): String {
        return when {
            isEmulator()           -> { setBaseUrl(EMULATOR_URL);                        EMULATOR_URL }
            PRODUCTION_URL.isNotBlank() -> { setBaseUrl(PRODUCTION_URL);                PRODUCTION_URL }
            else                   -> { setBaseUrl(LOCALHOST_URL);                       LOCALHOST_URL }
        }
    }

    private fun isEmulator(): Boolean {
        // Check multiple emulator indicators
        return (Build.FINGERPRINT.contains("generic") ||
                Build.FINGERPRINT.contains("unknown") ||
                Build.MODEL.contains("google_sdk") ||
                Build.MODEL.contains("Emulator") ||
                Build.MODEL.contains("Android SDK") ||
                Build.MANUFACTURER.contains("Genymotion") ||
                (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic")) ||
                "goldfish" == Build.HARDWARE ||
                "ranchu" == Build.HARDWARE)
    }

    fun getBaseUrl(): String {
        return prefs.getString(API_URL_KEY, DEFAULT_URL) ?: DEFAULT_URL
    }

    fun setBaseUrl(url: String) {
        prefs.edit().putString(API_URL_KEY, url).apply()
        // Reset Retrofit instance so it uses the new URL on next creation
        RetrofitClient.reset()
    }

    fun setToLocalhost() {
        setBaseUrl(LOCALHOST_URL)
    }

    fun setToEmulator() {
        setBaseUrl(EMULATOR_URL)
    }

    fun setCustomUrl(url: String) {
        // Ensure URL ends with /
        val urlWithSlash = if (url.endsWith("/")) url else "$url/"
        setBaseUrl(urlWithSlash)
        saveCustomUrl(urlWithSlash)
    }

    fun saveCustomUrl(url: String) {
        prefs.edit().putString(CUSTOM_IP_KEY, url).apply()
    }

    fun getCustomUrl(): String? {
        return prefs.getString(CUSTOM_IP_KEY, null)
    }

    fun resetToDefault() {
        val detectedUrl = detectAndSetProperUrl()
        prefs.edit().remove(CUSTOM_IP_KEY).apply()
        android.util.Log.d("NetworkConfig", "Reset to default: $detectedUrl")
    }
}
