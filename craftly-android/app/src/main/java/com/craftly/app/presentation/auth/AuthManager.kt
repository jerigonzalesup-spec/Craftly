package com.craftly.app.presentation.auth

import android.content.Context
import com.craftly.app.data.model.User

/**
 * Manages authentication state and user session
 */
object AuthManager {
    private const val PREF_NAME = "craftly_auth_prefs"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_USER_EMAIL = "user_email"
    private const val KEY_USER_ROLE = "user_role"
    private const val KEY_USER_NAME = "user_name"
    private const val KEY_AUTH_TOKEN = "auth_token"
    private const val KEY_IS_LOGGED_IN = "is_logged_in"

    /**
     * Save user session after login
     */
    fun saveSession(
        context: Context,
        userId: String,
        email: String,
        fullName: String,
        role: String,
        token: String
    ) {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString(KEY_USER_ID, userId)
            putString(KEY_USER_EMAIL, email)
            putString(KEY_USER_NAME, fullName)
            putString(KEY_USER_ROLE, role)
            putString(KEY_AUTH_TOKEN, token)
            putBoolean(KEY_IS_LOGGED_IN, true)
            apply()
        }
    }

    /**
     * Get current user ID
     */
    fun getCurrentUserId(context: Context): String? {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_USER_ID, null)
    }

    /**
     * Get current user role
     */
    fun getCurrentUserRole(context: Context): String? {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_USER_ROLE, null)
    }

    /**
     * Get auth token
     */
    fun getAuthToken(context: Context): String? {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_AUTH_TOKEN, null)
    }

    /**
     * Check if user is logged in
     */
    fun isLoggedIn(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_IS_LOGGED_IN, false)
    }

    /**
     * Get current user info
     */
    fun getCurrentUser(context: Context): User? {
        if (!isLoggedIn(context)) return null

        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        return User(
            uid = prefs.getString(KEY_USER_ID, "") ?: "",
            email = prefs.getString(KEY_USER_EMAIL, "") ?: "",
            fullName = prefs.getString(KEY_USER_NAME, "") ?: "",
            role = prefs.getString(KEY_USER_ROLE, "") ?: "",
        )
    }

    /**
     * Clear session on logout
     */
    fun logout(context: Context) {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().apply {
            clear()
            apply()
        }
    }
}
