package com.craftly.orders.data.repository

import com.craftly.orders.data.models.CreateOrderRequest
import com.craftly.orders.data.models.Order
import com.craftly.orders.data.models.OrdersResponse
import com.craftly.orders.data.models.UpdateOrderStatusRequest
import com.craftly.orders.data.remote.OrdersApiService
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
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val response = apiService.getOrderDetails(userId, orderId)
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

    suspend fun updateOrderStatus(orderId: String, status: String, trackingNumber: String? = null): Result<Order> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val request = UpdateOrderStatusRequest(status, trackingNumber)
        val response = apiService.updateOrderStatus(userId, orderId, request)
        clearCache()
        Result.success(response.data)
    } catch (e: Exception) {
        android.util.Log.e("OrdersRepository", "Error updating order status: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun cancelOrder(orderId: String): Result<Order> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val response = apiService.cancelOrder(userId, orderId)
        clearCache()
        Result.success(response.data)
    } catch (e: Exception) {
        android.util.Log.e("OrdersRepository", "Error cancelling order: ${e.message}", e)
        Result.failure(e)
    }

    fun clearCache() {
        cachedOrders = null
        cacheTimestamp = 0
    }
}
