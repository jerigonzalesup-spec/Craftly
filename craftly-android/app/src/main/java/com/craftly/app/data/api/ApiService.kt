package com.craftly.app.data.api

import com.craftly.app.data.model.ApiResponse
import com.craftly.app.data.model.AuthResponse
import com.craftly.app.data.model.LoginRequest
import com.craftly.app.data.model.Product
import com.craftly.app.data.model.RegisterRequest
import com.craftly.app.data.model.Review
import com.craftly.app.data.model.User
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
    @POST("api/auth/signup")
    suspend fun register(@Body request: RegisterRequest): ApiResponse<AuthResponse>

    /**
     * POST /api/auth/signin
     * Authenticate user with email and password
     */
    @POST("api/auth/signin")
    suspend fun login(@Body request: LoginRequest): ApiResponse<AuthResponse>

    /**
     * GET /api/products
     * Fetch all active products
     */
    @GET("api/products")
    suspend fun getAllProducts(
        @Query("status") status: String = "active"
    ): ApiResponse<List<Product>>

    /**
     * GET /api/products/:id
     * Fetch single product by ID
     */
    @GET("api/products/{id}")
    suspend fun getProductById(@Path("id") productId: String): ApiResponse<Product>

    /**
     * GET /api/reviews/:productId
     * Fetch all reviews for a product
     */
    @GET("api/reviews/{productId}")
    suspend fun getReviews(@Path("productId") productId: String): ApiResponse<Map<String, Any>>

    /**
     * POST /api/reviews/submit
     * Submit a review for a product
     */
    @POST("api/reviews/submit")
    suspend fun submitReview(@Body reviewData: Map<String, Any>): ApiResponse<Map<String, Any>>

    /**
     * GET /api/users/:uid
     * Fetch user profile information
     */
    @GET("api/users/{uid}")
    suspend fun getUserProfile(@Path("uid") uid: String): ApiResponse<User>
}
