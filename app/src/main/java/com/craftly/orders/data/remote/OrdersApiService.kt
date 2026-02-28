package com.craftly.orders.data.remote

import com.craftly.orders.data.models.CreateOrderRequest
import com.craftly.orders.data.models.OrderDetailResponse
import com.craftly.orders.data.models.OrdersResponse
import com.craftly.orders.data.models.UpdateOrderStatusRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Header

interface OrdersApiService {
    @POST("/api/orders")
    suspend fun createOrder(
        @Header("x-user-id") userId: String,
        @Body request: CreateOrderRequest
    ): OrderDetailResponse

    @GET("/api/orders/{userId}")
    suspend fun getUserOrders(
        @Path("userId") userId: String
    ): OrdersResponse

    @GET("/api/orders/{orderId}/details")
    suspend fun getOrderDetails(
        @Path("orderId") orderId: String
    ): OrderDetailResponse

    /** Get all orders that contain this seller's products */
    @GET("/api/orders/seller/{sellerId}")
    suspend fun getSellerOrders(
        @Path("sellerId") sellerId: String
    ): OrdersResponse

    /** Update order status (seller action, locked after 24h) */
    @POST("/api/orders/{orderId}/status")
    suspend fun updateOrderStatus(
        @Path("orderId") orderId: String,
        @Header("x-user-id") userId: String,
        @Body request: UpdateOrderStatusRequest
    ): OrderDetailResponse

    @POST("/api/orders/{orderId}/payment-status")
    suspend fun updatePaymentStatus(
        @Path("orderId") orderId: String,
        @Header("x-user-id") userId: String,
        @Body request: UpdatePaymentStatusRequest
    ): OrderDetailResponse
}

data class UpdatePaymentStatusRequest(
    val paymentStatus: String
)

