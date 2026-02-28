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

            // Get current cart
            val currentCartResult = getCart()
            if (currentCartResult.isFailure) {
                return Result.failure(currentCartResult.exceptionOrNull() ?: Exception("Failed to fetch cart"))
            }

            val currentCart = currentCartResult.getOrNull() ?: return Result.failure(Exception("Cart is null"))
            val items = currentCart.data?.items?.toMutableList() ?: mutableListOf()

            // VALIDATION 0: Prevent sellers from adding their own products to cart
            val currentUserId = prefsManager.getUser()?.uid
            if (!product.createdBy.isNullOrEmpty() && product.createdBy == currentUserId) {
                return Result.failure(
                    Exception("You cannot add your own product to your cart.")
                )
            }

            // VALIDATION 1: Check single seller constraint
            if (items.isNotEmpty() && items[0].createdBy != product.createdBy) {
                return Result.failure(
                    Exception("You can only purchase items from one seller at a time. Please checkout your current order or clear your cart.")
                )
            }

            // VALIDATION 2: Check if item already exists and update quantity
            val existingIndex = items.indexOfFirst { it.productId == product.productId }
            if (existingIndex >= 0) {
                val existingItem = items[existingIndex]
                val newQuantity = existingItem.quantity + product.quantity

                // Check if new quantity exceeds stock
                if (newQuantity > existingItem.stock) {
                    return Result.failure(
                        Exception("Cannot add that many items. Only ${existingItem.stock} available. You already have ${existingItem.quantity} in cart.")
                    )
                }

                items[existingIndex] = existingItem.copy(quantity = newQuantity)
            } else {
                // VALIDATION 3: Check stock for new item
                if (product.quantity > product.stock) {
                    return Result.failure(
                        Exception("Cannot add that many items. Only ${product.stock} available in stock.")
                    )
                }
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

            // Validate quantity is at least 1
            if (quantity < 1) {
                return Result.failure(Exception("Quantity must be at least 1"))
            }

            // Get current cart, update item quantity, and save
            val currentCartResult = getCart()
            if (currentCartResult.isFailure) {
                return Result.failure(currentCartResult.exceptionOrNull() ?: Exception("Failed to fetch cart"))
            }

            val currentCart = currentCartResult.getOrNull() ?: return Result.failure(Exception("Cart is null"))
            val items = currentCart.data?.items?.toMutableList() ?: mutableListOf()

            // Find and validate item by productId (id field may be empty)
            val index = items.indexOfFirst { it.productId == itemId || (it.id.isNotEmpty() && it.id == itemId) }
            if (index >= 0) {
                val item = items[index]
                // Check if new quantity exceeds stock
                if (quantity > item.stock) {
                    return Result.failure(
                        Exception("Cannot update quantity. Only ${item.stock} available in stock.")
                    )
                }
                items[index] = item.copy(quantity = quantity)
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

            // Remove item by productId (id field may be empty)
            items.removeAll { it.productId == itemId || (it.id.isNotEmpty() && it.id == itemId) }

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
