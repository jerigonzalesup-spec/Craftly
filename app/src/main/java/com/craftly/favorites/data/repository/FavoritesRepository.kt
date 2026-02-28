package com.craftly.favorites.data.repository

import com.craftly.favorites.data.models.FavoritesResponse
import com.craftly.favorites.data.remote.FavoritesApiService
import com.craftly.favorites.data.remote.AddFavoriteRequest
import com.craftly.auth.data.local.SharedPreferencesManager

class FavoritesRepository(
    private val apiService: FavoritesApiService,
    private val prefsManager: SharedPreferencesManager
) {
    private var cachedFavorites: Set<String> = setOf()
    private var cacheTimestamp: Long = 0
    private val CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

    suspend fun getFavorites(): Result<Set<String>> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val now = System.currentTimeMillis()
        if (cachedFavorites.isNotEmpty() && (now - cacheTimestamp) < CACHE_DURATION) {
            Result.success(cachedFavorites)
        } else {
            val response = apiService.getFavorites(userId)
            val favoriteIds = response.data.favorites.toSet()
            cachedFavorites = favoriteIds
            cacheTimestamp = now
            Result.success(favoriteIds)
        }
    } catch (e: Exception) {
        android.util.Log.e("FavoritesRepository", "Error fetching favorites: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun addFavorite(productId: String): Result<Set<String>> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val request = AddFavoriteRequest(productId)
        val response = apiService.addFavorite(userId, request)
        val favoriteIds = response.data.favorites.toSet()
        cachedFavorites = favoriteIds
        cacheTimestamp = System.currentTimeMillis()
        Result.success(favoriteIds)
    } catch (e: Exception) {
        android.util.Log.e("FavoritesRepository", "Error adding favorite: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun removeFavorite(productId: String): Result<Set<String>> = try {
        val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

        val response = apiService.removeFavorite(userId, productId)
        val favoriteIds = response.data.favorites.toSet()
        cachedFavorites = favoriteIds
        cacheTimestamp = System.currentTimeMillis()
        Result.success(favoriteIds)
    } catch (e: Exception) {
        android.util.Log.e("FavoritesRepository", "Error removing favorite: ${e.message}", e)
        Result.failure(e)
    }

    fun clearCache() {
        cachedFavorites = setOf()
        cacheTimestamp = 0
    }
}
