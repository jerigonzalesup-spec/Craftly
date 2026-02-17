package com.craftly.app.data.repository

import com.craftly.app.data.api.RetrofitClient
import com.craftly.app.data.model.AuthResponse
import com.craftly.app.data.model.LoginRequest
import com.craftly.app.data.model.RegisterRequest

class AuthRepository {

    private val apiService = RetrofitClient.getApiService()

    /**
     * Register a new user account
     */
    suspend fun register(email: String, password: String, fullName: String): Result<AuthResponse> {
        return try {
            val request = RegisterRequest(
                email = email,
                password = password,
                fullName = fullName,
                role = "buyer"
            )
            val response = apiService.register(request)

            if (response.success && response.data != null) {
                Result.success(response.data!!)
            } else {
                Result.failure(Exception(response.message ?: "Registration failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Login user with email and password
     */
    suspend fun login(email: String, password: String): Result<AuthResponse> {
        return try {
            val request = LoginRequest(email = email, password = password)
            val response = apiService.login(request)

            if (response.success && response.data != null) {
                Result.success(response.data!!)
            } else {
                Result.failure(Exception(response.message ?: "Login failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
