package com.craftly.products.data.remote

import com.craftly.products.data.models.ProductDetailResponse
import com.craftly.products.data.models.ProductStats
import com.craftly.products.data.models.ProductStatsRequest
import com.craftly.products.data.models.ProductStatsResponse
import com.craftly.products.data.models.ProductsResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ProductApiService {
    @GET("/api/products")
    suspend fun getAllProducts(
        @Query("status") status: String = "active"
    ): ProductsResponse

    @GET("/api/products/{id}")
    suspend fun getProductById(@Path("id") id: String): ProductDetailResponse

    @POST("/api/products/batch/stats")
    suspend fun getProductsStats(@Body request: ProductStatsRequest): ProductStatsResponse
}
