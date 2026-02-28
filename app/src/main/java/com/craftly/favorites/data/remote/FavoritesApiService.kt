package com.craftly.favorites.data.remote

import com.craftly.favorites.data.models.FavoritesResponse
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Body

data class AddFavoriteRequest(
    val productId: String
)

interface FavoritesApiService {
    @GET("/api/favorites/{userId}")
    suspend fun getFavorites(
        @Path("userId") userId: String
    ): FavoritesResponse

    @POST("/api/favorites")
    suspend fun addFavorite(
        @Header("x-user-id") userId: String,
        @Body request: AddFavoriteRequest
    ): FavoritesResponse

    @DELETE("/api/favorites/{productId}")
    suspend fun removeFavorite(
        @Header("x-user-id") userId: String,
        @Path("productId") productId: String
    ): FavoritesResponse
}
