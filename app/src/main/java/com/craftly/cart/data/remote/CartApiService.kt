package com.craftly.cart.data.remote

import com.craftly.cart.data.models.Cart
import com.craftly.cart.data.models.AddToCartRequest
import com.craftly.cart.data.models.UpdateCartItemRequest
import com.craftly.cart.data.models.SaveCartRequest
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface CartApiService {
    @GET("/api/cart/{userId}")
    suspend fun getCart(@Path("userId") userId: String): Cart

    @POST("/api/cart")
    suspend fun saveCart(
        @Header("x-user-id") userId: String,
        @Body request: SaveCartRequest
    ): Cart

    @DELETE("/api/cart")
    suspend fun clearCart(@Header("x-user-id") userId: String): Cart
}

