package com.craftly.cart.data.remote

import com.craftly.cart.data.models.Cart
import com.craftly.cart.data.models.SyncCartRequest
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

interface CartApiService {
    @GET("/api/cart/{userId}")
    suspend fun getCart(@Path("userId") userId: String): Cart

    @POST("/api/cart/{userId}")
    suspend fun addToCart(
        @Path("userId") userId: String,
        @Body request: Map<String, Any>
    ): Cart

    @PUT("/api/cart/{userId}/{itemId}")
    suspend fun updateCartItem(
        @Path("userId") userId: String,
        @Path("itemId") itemId: String,
        @Body request: Map<String, Any>
    ): Cart

    @DELETE("/api/cart/{userId}/{itemId}")
    suspend fun removeFromCart(
        @Path("userId") userId: String,
        @Path("itemId") itemId: String
    ): Cart

    @DELETE("/api/cart/{userId}")
    suspend fun clearCart(@Path("userId") userId: String): Cart

    @POST("/api/cart/{userId}/sync")
    suspend fun syncCart(
        @Path("userId") userId: String,
        @Body request: SyncCartRequest
    ): Cart
}
