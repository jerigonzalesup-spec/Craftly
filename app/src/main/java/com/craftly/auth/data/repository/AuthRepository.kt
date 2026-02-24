package com.craftly.auth.data.repository

import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.auth.data.models.SendVerificationCodeRequest
import com.craftly.auth.data.models.User
import com.craftly.auth.data.models.VerifyEmailCodeRequest
import com.craftly.auth.data.remote.AuthApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AuthRepository(
    private val apiService: AuthApiService,
    private val prefsManager: SharedPreferencesManager
) {
    suspend fun login(email: String, password: String): Result<User> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.signIn(
                com.craftly.auth.data.models.LoginRequest(email, password)
            )
            if (response.success && response.data != null) {
                val user = User(
                    uid = response.data.uid,
                    email = response.data.email,
                    displayName = response.data.displayName,
                    roles = response.data.roles
                )
                prefsManager.saveUser(user)
                Result.success(user)
            } else {
                Result.failure(Exception(response.error ?: "Login failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun sendVerificationCode(
        email: String,
        firstName: String,
        lastName: String
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val fullName = "$firstName $lastName"
            val response = apiService.sendVerificationCode(
                SendVerificationCodeRequest(email, firstName, lastName, fullName)
            )
            if (response.success) {
                Result.success("Code sent")
            } else {
                Result.failure(Exception(response.error ?: "Failed to send code"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun verifyEmailAndRegister(
        email: String,
        code: String,
        password: String,
        firstName: String,
        lastName: String
    ): Result<User> = withContext(Dispatchers.IO) {
        try {
            val fullName = "$firstName $lastName"
            val response = apiService.verifyEmailCode(
                VerifyEmailCodeRequest(email, code, password, fullName, firstName, lastName)
            )
            if (response.success && response.data != null) {
                val user = User(
                    uid = response.data.uid,
                    email = response.data.email,
                    displayName = response.data.displayName,
                    roles = response.data.roles
                )
                prefsManager.saveUser(user)
                Result.success(user)
            } else {
                Result.failure(Exception(response.error ?: "Registration failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getCurrentUser(): User? = prefsManager.getUser()

    fun isLoggedIn(): Boolean = prefsManager.isLoggedIn()

    fun logout() {
        prefsManager.clearUser()
    }
}
