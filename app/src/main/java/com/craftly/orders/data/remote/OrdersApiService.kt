package com.craftly.orders.data.remote

import com.craftly.orders.data.models.CreateOrderRequest
import com.craftly.orders.data.models.OrderDetailResponse
import com.craftly.orders.data.models.OrdersResponse
import com.craftly.orders.data.models.UpdateOrderStatusRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

interface OrdersApiService {
    @GET("/api/orders/{userId}")
    suspend fun getUserOrders(@Path("userId") userId: String): OrdersResponse

    @GET("/api/orders/{userId}/{orderId}")
    suspend fun getOrderDetails(
        @Path("userId") userId: String,
        @Path("orderId") orderId: String
    ): OrderDetailResponse

    @POST("/api/orders/{userId}")
    suspend fun createOrder(
        @Path("userId") userId: String,
        @Body request: CreateOrderRequest
    ): OrderDetailResponse

    @PUT("/api/orders/{userId}/{orderId}")
    suspend fun updateOrderStatus(
        @Path("userId") userId: String,
        @Path("orderId") orderId: String,
        @Body request: UpdateOrderStatusRequest
    ): OrderDetailResponse

    @POST("/api/orders/{userId}/{orderId}/cancel")
    suspend fun cancelOrder(
        @Path("userId") userId: String,
        @Path("orderId") orderId: String
    ): OrderDetailResponse
}
