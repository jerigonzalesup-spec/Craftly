package com.craftly.auth.data.remote

import com.craftly.auth.data.models.AuthResponse
import com.craftly.auth.data.models.LoginRequest
import com.craftly.auth.data.models.SendVerificationCodeRequest
import com.craftly.auth.data.models.VerifyEmailCodeRequest
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApiService {
    @POST("/api/auth/signin")
    suspend fun signIn(@Body request: LoginRequest): AuthResponse

    @POST("/api/auth/send-verification-code")
    suspend fun sendVerificationCode(@Body request: SendVerificationCodeRequest): ApiResponse<String>

    @POST("/api/auth/verify-email-code")
    suspend fun verifyEmailCode(@Body request: VerifyEmailCodeRequest): AuthResponse
}

data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val message: String?,
    val error: String?
)
