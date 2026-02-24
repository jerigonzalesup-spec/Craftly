package com.craftly.cart.data.repository

import com.craftly.cart.data.models.Cart
import com.craftly.cart.data.models.CartItem
import com.craftly.cart.data.models.SaveCartRequest
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

    suspend fun addToCart(product: CartItem): Result<Cart> {
        return try {
            val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

            // Get current cart, add item, and save full cart
            val currentCartResult = getCart()
            if (currentCartResult.isFailure) {
                return Result.failure(currentCartResult.exceptionOrNull() ?: Exception("Failed to fetch cart"))
            }

            val currentCart = currentCartResult.getOrNull() ?: return Result.failure(Exception("Cart is null"))
            val items = currentCart.data?.items?.toMutableList() ?: mutableListOf()

            // Check if item already exists and update quantity, or add new item
            val existingIndex = items.indexOfFirst { it.productId == product.productId }
            if (existingIndex >= 0) {
                items[existingIndex] = items[existingIndex].copy(quantity = items[existingIndex].quantity + product.quantity)
            } else {
                items.add(product)
            }

            val request = SaveCartRequest(items)
            val updatedCart = apiService.saveCart(userId, request)
            cachedCart = updatedCart
            cacheTimestamp = System.currentTimeMillis()
            Result.success(updatedCart)
        } catch (e: Exception) {
            android.util.Log.e("CartRepository", "Error adding to cart: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun updateCartItem(itemId: String, quantity: Int): Result<Cart> {
        return try {
            val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

            // Get current cart, update item quantity, and save
            val currentCartResult = getCart()
            if (currentCartResult.isFailure) {
                return Result.failure(currentCartResult.exceptionOrNull() ?: Exception("Failed to fetch cart"))
            }

            val currentCart = currentCartResult.getOrNull() ?: return Result.failure(Exception("Cart is null"))
            val items = currentCart.data?.items?.toMutableList() ?: mutableListOf()

            // Find and update item
            val index = items.indexOfFirst { it.id == itemId }
            if (index >= 0) {
                items[index] = items[index].copy(quantity = quantity)
            } else {
                return Result.failure(Exception("Item not found in cart"))
            }

            val request = SaveCartRequest(items)
            val updatedCart = apiService.saveCart(userId, request)
            cachedCart = updatedCart
            cacheTimestamp = System.currentTimeMillis()
            Result.success(updatedCart)
        } catch (e: Exception) {
            android.util.Log.e("CartRepository", "Error updating cart item: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun removeFromCart(itemId: String): Result<Cart> {
        return try {
            val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

            // Get current cart, remove item, and save
            val currentCartResult = getCart()
            if (currentCartResult.isFailure) {
                return Result.failure(currentCartResult.exceptionOrNull() ?: Exception("Failed to fetch cart"))
            }

            val currentCart = currentCartResult.getOrNull() ?: return Result.failure(Exception("Cart is null"))
            val items = currentCart.data?.items?.toMutableList() ?: mutableListOf()

            // Remove item by id
            items.removeAll { it.id == itemId }

            val request = SaveCartRequest(items)
            val updatedCart = apiService.saveCart(userId, request)
            cachedCart = updatedCart
            cacheTimestamp = System.currentTimeMillis()
            Result.success(updatedCart)
        } catch (e: Exception) {
            android.util.Log.e("CartRepository", "Error removing from cart: ${e.message}", e)
            Result.failure(e)
        }
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

    suspend fun saveCart(items: List<CartItem>): Result<Cart> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val request = SaveCartRequest(items)
        val cart = apiService.saveCart(userId, request)
        cachedCart = cart
        cacheTimestamp = System.currentTimeMillis()
        Result.success(cart)
    } catch (e: Exception) {
        android.util.Log.e("CartRepository", "Error saving cart: ${e.message}", e)
        Result.failure(e)
    }

    fun clearCache() {
        cachedCart = null
        cacheTimestamp = 0
    }
}
