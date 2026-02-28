package com.craftly.products.data.models

import com.squareup.moshi.Json
import java.io.Serializable

data class Product(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val price: Double = 0.0,
    val category: String = "",
    val images: List<String> = emptyList(),
    val stock: Int = 0,
    val status: String = "active",
    val createdBy: String = "",
    val materialsUsed: String = "",
    val allowShipping: Boolean = false,
    val allowPickup: Boolean = false,
    val allowCod: Boolean = true,
    val allowGcash: Boolean = false,
    val createdAt: String = "",
    val sellerName: String? = null,
    val rating: Double? = null,
    val reviewCount: Int? = null,
    val salesCount: Int? = null,
    val averageRating: Double? = null,
    
    // Optional fields that might come from Firestore
    val updatedAt: String? = null
) : Serializable

data class ProductStats(
    val averageRating: Double,
    val reviewCount: Int,
    val salesCount: Int
)

data class ProductsResponse(
    val success: Boolean,
    val data: List<Product>,
    val message: String? = null
)

data class ProductDetailResponse(
    val success: Boolean,
    val data: Product,
    val message: String? = null
)

data class ProductStatsRequest(
    val productIds: List<String>
)

data class ProductStatsResponse(
    val success: Boolean,
    val data: Map<String, ProductStats>,
    val message: String? = null
)
