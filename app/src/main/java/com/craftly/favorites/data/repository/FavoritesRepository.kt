package com.craftly.favorites.data.repository

import com.craftly.favorites.data.models.FavoriteItem
import com.craftly.favorites.data.models.FavoriteToggleRequest
import com.craftly.favorites.data.models.FavoritesResponse
import com.craftly.favorites.data.remote.FavoritesApiService
import com.craftly.auth.data.local.SharedPreferencesManager

class FavoritesRepository(
    private val apiService: FavoritesApiService,
    private val prefsManager: SharedPreferencesManager
) {
    // Local cache
    private var cachedFavorites: FavoritesResponse? = null
    private var cacheTimestamp: Long = 0
    private val CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

    suspend fun getFavorites(): Result<FavoritesResponse> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        // Check if cache is still valid
        val now = System.currentTimeMillis()
        if (cachedFavorites != null && (now - cacheTimestamp) < CACHE_DURATION) {
            Result.success(cachedFavorites!!)
        } else {
            val response = apiService.getFavorites(userId)
            cachedFavorites = response
            cacheTimestamp = now
            Result.success(response)
        }
    } catch (e: Exception) {
        android.util.Log.e("FavoritesRepository", "Error fetching favorites: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun addToFavorites(productId: String): Result<Boolean> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val request = FavoriteToggleRequest(productId = productId, isFavorite = true)
        val response = apiService.addToFavorites(userId, request)

        if (response.success) {
            clearCache()
            Result.success(true)
        } else {
            Result.failure(Exception(response.message ?: "Failed to add favorite"))
        }
    } catch (e: Exception) {
        android.util.Log.e("FavoritesRepository", "Error adding to favorites: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun removeFromFavorites(productId: String): Result<Boolean> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val response = apiService.removeFromFavorites(userId, productId)

        if (response.success) {
            clearCache()
            Result.success(true)
        } else {
            Result.failure(Exception(response.message ?: "Failed to remove favorite"))
        }
    } catch (e: Exception) {
        android.util.Log.e("FavoritesRepository", "Error removing from favorites: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun isFavorited(productId: String): Result<Boolean> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val response = apiService.isFavorite(userId, productId)
        Result.success(response.data[productId] ?: false)
    } catch (e: Exception) {
        android.util.Log.e("FavoritesRepository", "Error checking favorite status: ${e.message}", e)
        Result.failure(e)
    }

    fun clearCache() {
        cachedFavorites = null
        cacheTimestamp = 0
    }
}
