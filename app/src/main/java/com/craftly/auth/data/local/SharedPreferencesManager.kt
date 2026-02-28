package com.craftly.auth.data.local

import android.content.Context
import com.craftly.auth.data.models.User

class SharedPreferencesManager(context: Context) {
    private val prefs = context.getSharedPreferences("craftly_prefs", Context.MODE_PRIVATE)

    fun saveUser(user: User) {
        prefs.edit().apply {
            putString("user_uid", user.uid)
            putString("user_email", user.email)
            putString("user_displayName", user.displayName)
            putString("user_roles", user.roles.joinToString(","))
            putString("user_photoUrl", user.photoUrl)
            apply()
        }
    }

    fun getUser(): User? {
        val uid = prefs.getString("user_uid", null) ?: return null
        return User(
            uid = uid,
            email = prefs.getString("user_email", "") ?: "",
            displayName = prefs.getString("user_displayName", "") ?: "",
            roles = prefs.getString("user_roles", "buyer")?.split(",")?.filter { it.isNotEmpty() } ?: listOf("buyer"),
            photoUrl = prefs.getString("user_photoUrl", null)
        )
    }

    fun clearUser() {
        prefs.edit().clear().apply()
    }

    fun isLoggedIn(): Boolean = getUser() != null
}
