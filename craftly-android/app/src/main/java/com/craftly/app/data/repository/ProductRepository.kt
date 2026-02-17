package com.craftly.app.data.repository

import android.util.Log
import com.craftly.app.data.api.RetrofitClient
import com.craftly.app.data.model.Product

class ProductRepository {

    private val TAG = "ProductRepository"
    private val apiService = RetrofitClient.getApiService()

    /**
     * Get all active products
     */
    suspend fun getAllProducts(): Result<List<Product>> {
        return try {
            Log.d(TAG, "Calling API: getAllProducts()")
            val response = apiService.getAllProducts()

            Log.d(TAG, "API Response received - Success: ${response.success}, Data: ${response.data?.size} products")
            Log.d(TAG, "Response message: ${response.message}")

            if (response.success && response.data != null) {
                Log.d(TAG, "Returning ${response.data!!.size} products successfully")
                Result.success(response.data!!)
            } else {
                val error = response.message ?: "Failed to fetch products"
                Log.e(TAG, "API returned error: $error")
                Result.failure(Exception(error))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception during getAllProducts: ${e.message}", e)
            e.printStackTrace()
            Result.failure(e)
        }
    }

    /**
     * Get single product by ID
     */
    suspend fun getProductById(productId: String): Result<Product> {
        return try {
            Log.d(TAG, "Calling API: getProductById($productId)")
            val response = apiService.getProductById(productId)

            Log.d(TAG, "API Response received - Success: ${response.success}")
            Log.d(TAG, "Response message: ${response.message}")

            if (response.success && response.data != null) {
                Log.d(TAG, "Product retrieved: ${response.data!!.name}")
                Result.success(response.data!!)
            } else {
                val error = response.message ?: "Failed to fetch product"
                Log.e(TAG, "API returned error: $error")
                Result.failure(Exception(error))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception during getProductById: ${e.message}", e)
            e.printStackTrace()
            Result.failure(e)
        }
    }
}
