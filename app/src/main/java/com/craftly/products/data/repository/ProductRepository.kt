package com.craftly.products.data.repository

import com.craftly.products.data.models.Product
import com.craftly.products.data.models.ProductStats
import com.craftly.products.data.models.ProductStatsRequest
import com.craftly.products.data.remote.ProductApiService
import java.util.*
import kotlin.concurrent.timer

class ProductRepository(private val apiService: ProductApiService) {

    // In-memory cache for products with TTL
    private var cachedProducts: List<Product>? = null
    private var cacheTimestamp: Long = 0
    private val CACHE_TIMEOUT = 5 * 60 * 1000 // 5 minutes

    // Cache for product stats
    private val statsCache = mutableMapOf<String, Pair<ProductStats, Long>>()
    private val STATS_CACHE_TIMEOUT = 5 * 60 * 1000 // 5 minutes

    // Timer for batching stats requests
    private var statsRequestTimer: Timer? = null
    private var pendingStatsIds = mutableSetOf<String>()

    suspend fun getAllProducts(): List<Product> {
        // Check cache validity
        if (isCacheValid()) {
            val cached = cachedProducts
            android.util.Log.d("ProductRepository", "Using cached products: ${cached?.size ?: 0} items")
            return cached ?: emptyList()
        }

        // Call API
        try {
            android.util.Log.d("ProductRepository", "Fetching products from API...")
            val response = apiService.getAllProducts()
            
            if (response.success && response.data != null) {
                val products = response.data.filterNotNull()
                android.util.Log.d("ProductRepository", "API returned ${products.size} products")
                
                cachedProducts = products
                cacheTimestamp = System.currentTimeMillis()
                return products
            } else {
                android.util.Log.w("ProductRepository", "API returned success=false or null data")
                return emptyList()
            }
        } catch (e: Exception) {
            android.util.Log.e("ProductRepository", "Error fetching products from API: ${e.message}", e)
            // Print detailed error info
            if (e is retrofit2.HttpException) {
                val errorBody = e.response()?.errorBody()?.string()
                android.util.Log.e("ProductRepository", "HTTP Error Body: $errorBody")
            }
            throw e
        }
    }

    suspend fun getProductById(id: String): Product {
        try {
            android.util.Log.d("ProductRepository", "Fetching product: $id")
            val response = apiService.getProductById(id)
            if (response.success && response.data != null) {
                android.util.Log.d("ProductRepository", "Product loaded: ${response.data.name}")
                return response.data
            }
            throw Exception("Failed to fetch product: success=${response.success}, data=${response.data}")
        } catch (e: Exception) {
            android.util.Log.e("ProductRepository", "Error fetching product $id: ${e.message}", e)
            throw e
        }
    }

    suspend fun getProductsStats(productIds: List<String>): Map<String, ProductStats> {
        if (productIds.isEmpty()) {
            return emptyMap()
        }

        try {
            // Filter out cached items
            val missingIds = productIds.filter { id ->
                val cached = statsCache[id]
                cached == null || (System.currentTimeMillis() - cached.second > STATS_CACHE_TIMEOUT)
            }

            if (missingIds.isEmpty()) {
                // All cached, return from cache
                android.util.Log.d("ProductRepository", "All stats cached: $productIds")
                return productIds.associate { id ->
                    id to (statsCache[id]?.first ?: ProductStats(0.0, 0, 0))
                }
            }

            // Batch fetch missing stats
            android.util.Log.d("ProductRepository", "Fetching ${missingIds.size} stats from API")
            val request = ProductStatsRequest(missingIds)
            val response = apiService.getProductsStats(request)

            if (response.success && response.data != null) {
                // Update cache
                val currentTime = System.currentTimeMillis()
                response.data.forEach { (productId, stats) ->
                    statsCache[productId] = Pair(stats, currentTime)
                }

                // Merge with previously cached data
                return productIds.associate { id ->
                    id to (statsCache[id]?.first ?: ProductStats(0.0, 0, 0))
                }
            } else {
                android.util.Log.w("ProductRepository", "Stats API returned success=false")
                return productIds.associate { id ->
                    id to (statsCache[id]?.first ?: ProductStats(0.0, 0, 0))
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("ProductRepository", "Error fetching stats: ${e.message}")
            // If fetch fails, return cached stats with fallback zeros
            return productIds.associate { id ->
                id to (statsCache[id]?.first ?: ProductStats(0.0, 0, 0))
            }
        }
    }

    // Filtering and sorting functions (client-side)

    fun searchProducts(products: List<Product>, query: String): List<Product> {
        if (query.isEmpty()) return products
        return products.filter { product ->
            product.name.contains(query, ignoreCase = true)
        }
    }

    fun filterByCategory(products: List<Product>, category: String): List<Product> {
        if (category == "all" || category.isEmpty()) return products
        return products.filter { product ->
            product.category.equals(category, ignoreCase = true)
        }
    }

    fun sortProducts(products: List<Product>, sortBy: String): List<Product> {
        return when (sortBy) {
            "newest" -> {
                // ISO 8601 timestamps sort correctly lexicographically when descending
                products.sortedByDescending { product -> product.createdAt }
            }
            "price-asc" -> products.sortedBy { it.price }
            "price-desc" -> products.sortedByDescending { it.price }
            else -> products
        }
    }

    fun applyFiltersAndSort(
        products: List<Product>,
        searchQuery: String,
        category: String,
        sortBy: String
    ): List<Product> {
        try {
            var filtered = products
            android.util.Log.d("ProductRepository", "Applying filters: search='$searchQuery', category='$category', sort='$sortBy'")

            // Apply search
            filtered = searchProducts(filtered, searchQuery)
            android.util.Log.d("ProductRepository", "After search: ${filtered.size} products")

            // Apply category filter
            filtered = filterByCategory(filtered, category)
            android.util.Log.d("ProductRepository", "After category filter: ${filtered.size} products")

            // Apply sorting
            filtered = sortProducts(filtered, sortBy)
            android.util.Log.d("ProductRepository", "After sort: ${filtered.size} products")

            return filtered
        } catch (e: Exception) {
            android.util.Log.e("ProductRepository", "Error in applyFiltersAndSort: ${e.message}", e)
            return products // Return unfiltered on error
        }
    }

    private fun isCacheValid(): Boolean {
        if (cachedProducts == null) return false
        return (System.currentTimeMillis() - cacheTimestamp) < CACHE_TIMEOUT
    }

    fun clearCache() {
        cachedProducts = null
        cacheTimestamp = 0
        statsCache.clear()
    }

    // ─── Seller-specific operations ──────────────────────────────────────────

    /** Fetch only the products created by [sellerId], bypassing the shared cache. */
    suspend fun getSellerProducts(sellerId: String): List<Product> {
        return try {
            val response = apiService.getSellerProducts(
                sellerId = sellerId,
                status = "active",
                userId = sellerId
            )
            if (response.success && response.data != null) response.data.filterNotNull()
            else emptyList()
        } catch (e: Exception) {
            android.util.Log.e("ProductRepository", "getSellerProducts error: ${e.message}", e)
            throw e
        }
    }

    suspend fun createProduct(
        userId: String,
        request: com.craftly.products.data.remote.CreateProductRequest
    ): Product {
        val response = apiService.createProduct(userId, request)
        if (response.success && response.data != null) {
            clearCache() // invalidate shared cache after mutation
            return response.data
        }
        throw Exception("Failed to create product")
    }

    suspend fun updateProduct(
        productId: String,
        userId: String,
        request: com.craftly.products.data.remote.UpdateProductRequest
    ): Product {
        val response = apiService.updateProduct(productId, userId, request)
        if (response.success && response.data != null) {
            clearCache()
            return response.data
        }
        throw Exception("Failed to update product")
    }

    suspend fun deleteProduct(productId: String, userId: String) {
        val response = apiService.deleteProduct(productId, userId)
        if (!response.success) throw Exception("Failed to delete product")
        clearCache()
    }
}
