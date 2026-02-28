package com.craftly.auth.data.remote

import com.craftly.auth.data.models.AuthResponse
import com.craftly.auth.data.models.ForgotPasswordRequest
import com.craftly.auth.data.models.GoogleSignInRequest
import com.craftly.auth.data.models.LoginRequest
import com.craftly.auth.data.models.ResetPasswordWithCodeRequest
import com.craftly.auth.data.models.SendVerificationCodeRequest
import com.craftly.auth.data.models.VerifyEmailCodeRequest
import com.craftly.auth.data.models.VerifyResetCodeRequest
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApiService {
    @POST("/api/auth/signin")
    suspend fun signIn(@Body request: LoginRequest): AuthResponse

    @POST("/api/auth/send-verification-code")
    suspend fun sendVerificationCode(@Body request: SendVerificationCodeRequest): ApiResponse<String>

    @POST("/api/auth/verify-email-code")
    suspend fun verifyEmailCode(@Body request: VerifyEmailCodeRequest): AuthResponse

    @POST("/api/auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): ApiResponse<String>

    @POST("/api/auth/verify-reset-code")
    suspend fun verifyResetCode(@Body request: VerifyResetCodeRequest): ApiResponse<String>

    @POST("/api/auth/reset-password-with-code")
    suspend fun resetPasswordWithCode(@Body request: ResetPasswordWithCodeRequest): ApiResponse<String>

    @POST("/api/auth/signin-google")
    suspend fun signInWithGoogle(@Body request: GoogleSignInRequest): AuthResponse
}

data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val message: String?,
    val error: String?
)
