package com.craftly.favorites.data.models

import java.io.Serializable

data class FavoriteItem(
    val id: String = "",
    val productId: String = "",
    val productName: String = "",
    val price: Double = 0.0,
    val image: String = "",
    val category: String = "",
    val rating: Double? = null,
    val reviewCount: Int? = null,
    val salesCount: Int? = null,
    val createdAt: String = ""
) : Serializable

data class FavoritesResponse(
    val success: Boolean = false,
    val data: FavoritesData = FavoritesData(),
    val message: String? = null
)

data class FavoritesData(
    val userId: String = "",
    val favorites: List<String> = emptyList(),  // Array of favorite product IDs
    val count: Int = 0
)

data class FavoriteToggleRequest(
    val productId: String,
    val isFavorite: Boolean
)

data class FavoriteToggleResponse(
    val success: Boolean = false,
    val data: Map<String, Boolean> = emptyMap(), // productId -> isFavorite
    val message: String? = null
)
