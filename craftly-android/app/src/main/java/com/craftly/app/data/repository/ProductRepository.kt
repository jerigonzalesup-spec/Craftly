package com.craftly.app.data.repository

import com.craftly.app.data.api.RetrofitClient
import com.craftly.app.data.model.Product

class ProductRepository {

    private val apiService = RetrofitClient.getApiService()

    /**
     * Get all active products
     */
    suspend fun getAllProducts(): Result<List<Product>> {
        return try {
            val response = apiService.getAllProducts()

            if (response.success && response.data != null) {
                Result.success(response.data!!)
            } else {
                Result.failure(Exception(response.message ?: "Failed to fetch products"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get single product by ID
     */
    suspend fun getProductById(productId: String): Result<Product> {
        return try {
            val response = apiService.getProductById(productId)

            if (response.success && response.data != null) {
                Result.success(response.data!!)
            } else {
                Result.failure(Exception(response.message ?: "Failed to fetch product"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
