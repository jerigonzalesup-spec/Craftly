package com.craftly.app.data.api

import com.craftly.app.data.model.ApiResponse
import com.craftly.app.data.model.AuthResponse
import com.craftly.app.data.model.LoginRequest
import com.craftly.app.data.model.Product
import com.craftly.app.data.model.RegisterRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.POST
import retrofit2.http.Query

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

    /**
     * GET /api/products
     * Fetch all active products
     */
    @GET("products")
    suspend fun getAllProducts(
        @Query("status") status: String = "active"
    ): ApiResponse<List<Product>>

    /**
     * GET /api/products/:id
     * Fetch single product by ID
     */
    @GET("products/{id}")
    suspend fun getProductById(@Path("id") productId: String): ApiResponse<Product>
}
