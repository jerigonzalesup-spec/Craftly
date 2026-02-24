package com.craftly.auth.data.models

import com.squareup.moshi.Json

// Request Models
data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val firstName: String,
    val lastName: String,
    val email: String,
    val password: String
)

data class SendVerificationCodeRequest(
    val email: String,
    val firstName: String,
    val lastName: String,
    val fullName: String
)

data class VerifyEmailCodeRequest(
    val email: String,
    val code: String,
    val password: String,
    val fullName: String,
    val firstName: String,
    val lastName: String
)

// Response Models
data class AuthResponse(
    val success: Boolean,
    val data: UserData?,
    val message: String?,
    val error: String?
)

data class UserData(
    val uid: String,
    val email: String,
    val displayName: String,
    val roles: List<String>,
    val role: String? = null
)

// Domain Model
data class User(
    val uid: String,
    val email: String,
    val displayName: String,
    val roles: List<String>,
    val isAuthenticated: Boolean = true
)
