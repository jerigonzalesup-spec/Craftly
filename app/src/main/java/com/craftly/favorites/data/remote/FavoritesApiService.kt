package com.craftly.favorites.data.remote

import com.craftly.favorites.data.models.FavoriteToggleRequest
import com.craftly.favorites.data.models.FavoriteToggleResponse
import com.craftly.favorites.data.models.FavoritesResponse
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface FavoritesApiService {
    @GET("/api/favorites/{userId}")
    suspend fun getFavorites(@Path("userId") userId: String): FavoritesResponse

    @POST("/api/favorites/{userId}")
    suspend fun addToFavorites(
        @Path("userId") userId: String,
        @Body request: FavoriteToggleRequest
    ): FavoriteToggleResponse

    @DELETE("/api/favorites/{userId}/{productId}")
    suspend fun removeFromFavorites(
        @Path("userId") userId: String,
        @Path("productId") productId: String
    ): FavoriteToggleResponse

    @GET("/api/favorites/{userId}/{productId}")
    suspend fun isFavorite(
        @Path("userId") userId: String,
        @Path("productId") productId: String
    ): FavoriteToggleResponse
}
