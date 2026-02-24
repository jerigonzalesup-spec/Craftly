package com.craftly.core.network

import android.content.Context
import android.content.SharedPreferences

object NetworkConfig {
    private const val PREFS_NAME = "network_config"
    private const val API_URL_KEY = "api_url"

    // Available endpoints
    const val EMULATOR_URL = "http://10.0.2.2:5000"
    const val LOCAL_DEVICE_IP_URL = "http://192.168.1.207:5000"
    const val DEFAULT_URL = EMULATOR_URL

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun getBaseUrl(): String {
        return prefs.getString(API_URL_KEY, DEFAULT_URL) ?: DEFAULT_URL
    }

    fun setBaseUrl(url: String) {
        prefs.edit().putString(API_URL_KEY, url).apply()
        // Reset Retrofit instance so it uses the new URL on next creation
        RetrofitClient.reset()
    }

    fun setToEmulator() {
        setBaseUrl(EMULATOR_URL)
    }

    fun setToPhysicalDevice(ipAddress: String) {
        setBaseUrl("http://$ipAddress:5000")
    }
}
