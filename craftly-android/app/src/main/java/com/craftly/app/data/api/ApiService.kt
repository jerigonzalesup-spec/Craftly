package com.craftly.app.data.api

import com.craftly.app.data.model.ApiResponse
import com.craftly.app.data.model.AuthResponse
import com.craftly.app.data.model.LoginRequest
import com.craftly.app.data.model.RegisterRequest
import retrofit2.http.Body
import retrofit2.http.POST

interface ApiService {

    /**
     * POST /api/auth/signup
     * Register a new user account
     */
    @POST("auth/signup")
    suspend fun register(@Body request: RegisterRequest): ApiResponse<AuthResponse>

    /**
     * POST /api/auth/signin
     * Authenticate user with email and password
     */
    @POST("auth/signin")
    suspend fun login(@Body request: LoginRequest): ApiResponse<AuthResponse>
}
