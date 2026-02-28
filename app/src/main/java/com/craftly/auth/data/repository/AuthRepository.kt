package com.craftly.auth.data.repository

import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.auth.data.models.ForgotPasswordRequest
import com.craftly.auth.data.models.GoogleSignInRequest
import com.craftly.auth.data.models.ResetPasswordWithCodeRequest
import com.craftly.auth.data.models.SendVerificationCodeRequest
import com.craftly.auth.data.models.User
import com.craftly.auth.data.models.VerifyEmailCodeRequest
import com.craftly.auth.data.models.VerifyResetCodeRequest
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

    suspend fun forgotPassword(email: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.forgotPassword(ForgotPasswordRequest(email))
            if (response.success) {
                Result.success(response.message ?: "Code sent")
            } else {
                Result.failure(Exception(response.error ?: "Failed to send reset code"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun verifyResetCode(email: String, code: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.verifyResetCode(VerifyResetCodeRequest(email, code))
            if (response.success) {
                Result.success("Code verified")
            } else {
                Result.failure(Exception(response.error ?: "Invalid code"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun resetPasswordWithCode(email: String, code: String, newPassword: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.resetPasswordWithCode(
                ResetPasswordWithCodeRequest(email, code, newPassword)
            )
            if (response.success) {
                Result.success("Password reset successfully")
            } else {
                Result.failure(Exception(response.error ?: "Failed to reset password"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signInWithGoogle(idToken: String, email: String, displayName: String?, photoURL: String?): Result<User> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.signInWithGoogle(
                GoogleSignInRequest(idToken, email, displayName, photoURL)
            )
            if (response.success && response.data != null) {
                val user = User(
                    uid = response.data.uid,
                    email = response.data.email,
                    displayName = response.data.displayName,
                    roles = response.data.roles,
                    photoUrl = photoURL
                )
                prefsManager.saveUser(user)
                Result.success(user)
            } else {
                Result.failure(Exception(response.error ?: "Google sign-in failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
