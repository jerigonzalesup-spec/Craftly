package com.craftly.orders.data.repository

import com.craftly.orders.data.models.CreateOrderRequest
import com.craftly.orders.data.models.Order
import com.craftly.orders.data.models.OrdersResponse
import com.craftly.orders.data.remote.OrdersApiService
import com.craftly.orders.data.remote.UpdatePaymentStatusRequest
import com.craftly.auth.data.local.SharedPreferencesManager

class OrdersRepository(
    private val apiService: OrdersApiService,
    private val prefsManager: SharedPreferencesManager
) {
    // Local cache
    private var cachedOrders: OrdersResponse? = null
    private var cacheTimestamp: Long = 0
    private val CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

    suspend fun getOrders(): Result<OrdersResponse> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        // Check if cache is still valid
        val now = System.currentTimeMillis()
        if (cachedOrders != null && (now - cacheTimestamp) < CACHE_DURATION) {
            Result.success(cachedOrders!!)
        } else {
            val response = apiService.getUserOrders(userId)
            cachedOrders = response
            cacheTimestamp = now
            Result.success(response)
        }
    } catch (e: Exception) {
        android.util.Log.e("OrdersRepository", "Error fetching orders: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun getOrderDetails(orderId: String): Result<Order> = try {
        val response = apiService.getOrderDetails(orderId)
        Result.success(response.data)
    } catch (e: Exception) {
        android.util.Log.e("OrdersRepository", "Error fetching order details: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun createOrder(orderRequest: CreateOrderRequest): Result<Order> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val response = apiService.createOrder(userId, orderRequest)
        clearCache()
        Result.success(response.data)
    } catch (e: Exception) {
        android.util.Log.e("OrdersRepository", "Error creating order: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun updatePaymentStatus(orderId: String, paymentStatus: String): Result<Order> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val request = UpdatePaymentStatusRequest(paymentStatus)
        val response = apiService.updatePaymentStatus(orderId, userId, request)
        clearCache()
        Result.success(response.data)
    } catch (e: Exception) {
        android.util.Log.e("OrdersRepository", "Error updating payment status: ${e.message}", e)
        Result.failure(e)
    }


    fun clearCache() {
        cachedOrders = null
        cacheTimestamp = 0
    }

    // ─── Seller-specific operations ──────────────────────────────────────────

    suspend fun getSellerOrders(): Result<List<Order>> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))
        val response = apiService.getSellerOrders(userId)
        Result.success(response.data?.orders ?: emptyList())
    } catch (e: Exception) {
        android.util.Log.e("OrdersRepository", "Error fetching seller orders: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun updateOrderStatus(orderId: String, newStatus: String): Result<Order> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))
        val request = com.craftly.orders.data.models.UpdateOrderStatusRequest(newStatus)
        val response = apiService.updateOrderStatus(orderId, userId, request)
        clearCache()
        Result.success(response.data)
    } catch (e: Exception) {
        android.util.Log.e("OrdersRepository", "Error updating order status: ${e.message}", e)
        Result.failure(e)
    }
}
