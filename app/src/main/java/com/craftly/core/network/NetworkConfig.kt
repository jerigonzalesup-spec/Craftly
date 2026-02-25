package com.craftly.core.network

import android.content.Context
import android.content.SharedPreferences
import android.os.Build

object NetworkConfig {
    private const val PREFS_NAME = "network_config"
    private const val API_URL_KEY = "api_url"
    private const val CUSTOM_IP_KEY = "custom_ip"
    private const val IS_CONFIGURED_KEY = "is_configured"

    // Available endpoints - UPDATE THIS TO YOUR MACHINE'S ACTUAL IP
    const val EMULATOR_URL = "http://10.0.2.2:5000"
    const val LOCAL_DEVICE_IP_URL = "http://10.40.21.163:5000"  // Change this to your machine's IP
    const val DEFAULT_URL = LOCAL_DEVICE_IP_URL

    // Old hardcoded IP - used for migration only
    private const val OLD_DEVICE_IP = "http://192.168.1.207:5000"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Migrate old IP to new IP if found
        val storedUrl = prefs.getString(API_URL_KEY, null)
        if (storedUrl == OLD_DEVICE_IP) {
            // Clear the old configuration and reset to auto-detect
            prefs.edit().remove(API_URL_KEY).apply()
            prefs.edit().remove(IS_CONFIGURED_KEY).apply()
        }

        // Auto-select best endpoint on first run
        if (!prefs.contains(API_URL_KEY)) {
            val bestUrl = detectBestEndpoint()
            setBaseUrl(bestUrl)
        }
    }

    /**
     * Detect if running on emulator or physical device
     * Returns true if running on emulator
     */
    private fun isEmulator(): Boolean {
        return (Build.FINGERPRINT.startsWith("generic") ||
                Build.FINGERPRINT.startsWith("unknown") ||
                Build.MODEL.contains("Google") ||
                Build.MODEL.contains("Emulator") ||
                Build.PRODUCT.contains("sdk") ||
                Build.PRODUCT.contains("google_sdk") ||
                Build.PRODUCT.contains("sdk_google") ||
                Build.BOARD == "QC_IMAGE" ||
                Build.PRODUCT.contains("emulator") ||
                Build.DEVICE.contains("emulator"))
    }

    /**
     * Auto-detect best endpoint based on environment
     */
    private fun detectBestEndpoint(): String {
        return if (isEmulator()) {
            EMULATOR_URL
        } else {
            LOCAL_DEVICE_IP_URL
        }
    }

    fun getBaseUrl(): String {
        return prefs.getString(API_URL_KEY, DEFAULT_URL) ?: DEFAULT_URL
    }

    fun setBaseUrl(url: String) {
        prefs.edit().putString(API_URL_KEY, url).apply()
        prefs.edit().putBoolean(IS_CONFIGURED_KEY, true).apply()
        // Reset Retrofit instance so it uses the new URL on next creation
        RetrofitClient.reset()
    }

    fun setToEmulator() {
        setBaseUrl(EMULATOR_URL)
    }

    fun setToPhysicalDevice(ipAddress: String? = null) {
        val url = if (ipAddress != null) {
            "http://$ipAddress:5000"
        } else {
            LOCAL_DEVICE_IP_URL
        }
        setBaseUrl(url)
        if (ipAddress != null) {
            saveCustomIp(ipAddress)
        }
    }

    fun saveCustomIp(ipAddress: String) {
        prefs.edit().putString(CUSTOM_IP_KEY, ipAddress).apply()
    }

    fun getCustomIp(): String? {
        return prefs.getString(CUSTOM_IP_KEY, null)
    }

    fun clearCustomIp() {
        prefs.edit().remove(CUSTOM_IP_KEY).apply()
    }

    fun resetToDefault() {
        val bestUrl = detectBestEndpoint()
        setBaseUrl(bestUrl)
    }

    fun isConfigured(): Boolean {
        return prefs.getBoolean(IS_CONFIGURED_KEY, false)
    }
}
