package com.craftly.cart.data.repository

import com.craftly.cart.data.models.Cart
import com.craftly.cart.data.models.CartItem
import com.craftly.cart.data.models.SyncCartRequest
import com.craftly.cart.data.models.AddToCartRequest
import com.craftly.cart.data.models.UpdateCartItemRequest
import com.craftly.cart.data.remote.CartApiService
import com.craftly.auth.data.local.SharedPreferencesManager

class CartRepository(
    private val apiService: CartApiService,
    private val prefsManager: SharedPreferencesManager
) {
    // Local cache
    private var cachedCart: Cart? = null
    private var cacheTimestamp: Long = 0
    private val CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

    suspend fun getCart(): Result<Cart> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        // Check if cache is still valid
        val now = System.currentTimeMillis()
        if (cachedCart != null && (now - cacheTimestamp) < CACHE_DURATION) {
            Result.success(cachedCart!!)
        } else {
            val cart = apiService.getCart(userId)
            cachedCart = cart
            cacheTimestamp = now
            Result.success(cart)
        }
    } catch (e: Exception) {
        android.util.Log.e("CartRepository", "Error fetching cart: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun addToCart(product: CartItem): Result<Cart> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val request = AddToCartRequest(
            productId = product.productId,
            quantity = product.quantity
        )

        val cart = apiService.addToCart(userId, request)
        cachedCart = cart
        cacheTimestamp = System.currentTimeMillis()
        Result.success(cart)
    } catch (e: Exception) {
        android.util.Log.e("CartRepository", "Error adding to cart: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun updateCartItem(itemId: String, quantity: Int): Result<Cart> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val request = UpdateCartItemRequest(quantity = quantity)
        val cart = apiService.updateCartItem(userId, itemId, request)
        cachedCart = cart
        cacheTimestamp = System.currentTimeMillis()
        Result.success(cart)
    } catch (e: Exception) {
        android.util.Log.e("CartRepository", "Error updating cart item: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun removeFromCart(itemId: String): Result<Cart> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val cart = apiService.removeFromCart(userId, itemId)
        cachedCart = cart
        cacheTimestamp = System.currentTimeMillis()
        Result.success(cart)
    } catch (e: Exception) {
        android.util.Log.e("CartRepository", "Error removing from cart: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun clearCart(): Result<Cart> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val cart = apiService.clearCart(userId)
        cachedCart = cart
        cacheTimestamp = System.currentTimeMillis()
        Result.success(cart)
    } catch (e: Exception) {
        android.util.Log.e("CartRepository", "Error clearing cart: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun syncCart(items: List<CartItem>): Result<Cart> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val request = SyncCartRequest(items)
        val cart = apiService.syncCart(userId, request)
        cachedCart = cart
        cacheTimestamp = System.currentTimeMillis()
        Result.success(cart)
    } catch (e: Exception) {
        android.util.Log.e("CartRepository", "Error syncing cart: ${e.message}", e)
        Result.failure(e)
    }

    fun clearCache() {
        cachedCart = null
        cacheTimestamp = 0
    }
}
