package com.craftly.core.network

import android.content.Context
import android.content.SharedPreferences

object NetworkConfig {
    private const val PREFS_NAME = "network_config"
    private const val API_URL_KEY = "api_url"
    private const val CUSTOM_IP_KEY = "custom_ip"

    // Standard localhost - works on both emulator and physical device with adb reverse
    const val LOCAL_URL = "http://localhost:5000"
    const val LOCALHOST_URL = "http://127.0.0.1:5000"
    const val DEFAULT_URL = LOCAL_URL

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Clear any old IP-based configurations
        val storedUrl = prefs.getString(API_URL_KEY, null)
        if (storedUrl != null && !storedUrl.contains("localhost") && !storedUrl.contains("127.0.0.1")) {
            // Remove old IP-based config
            prefs.edit().remove(API_URL_KEY).apply()
        }

        // Auto-select localhost on first run
        if (!prefs.contains(API_URL_KEY)) {
            setBaseUrl(LOCAL_URL)
        }
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
        setBaseUrl(LOCAL_URL)
    }

    fun setCustomUrl(url: String) {
        setBaseUrl(url)
        saveCustomUrl(url)
    }

    fun saveCustomUrl(url: String) {
        prefs.edit().putString(CUSTOM_IP_KEY, url).apply()
    }

    fun getCustomUrl(): String? {
        return prefs.getString(CUSTOM_IP_KEY, null)
    }

    fun resetToDefault() {
        setBaseUrl(LOCAL_URL)
        prefs.edit().remove(CUSTOM_IP_KEY).apply()
    }
}

