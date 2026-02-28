package com.craftly.products.data.remote

import com.craftly.products.data.models.ProductDetailResponse
import com.craftly.products.data.models.ProductStats
import com.craftly.products.data.models.ProductStatsRequest
import com.craftly.products.data.models.ProductStatsResponse
import com.craftly.products.data.models.ProductsResponse
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

data class CreateProductRequest(
    val name: String,
    val description: String,
    val price: Double,
    val category: String,
    val stock: Int,
    val materialsUsed: String,
    val allowShipping: Boolean,
    val allowPickup: Boolean,
    val images: List<String>
)

data class UpdateProductRequest(
    val name: String,
    val description: String,
    val price: Double,
    val category: String,
    val stock: Int,
    val materialsUsed: String,
    val allowShipping: Boolean,
    val allowPickup: Boolean,
    val images: List<String>
)

data class DeleteProductResponse(
    val success: Boolean = false,
    val message: String? = null
)

interface ProductApiService {
    @GET("/api/products")
    suspend fun getAllProducts(
        @Query("status") status: String = "active"
    ): ProductsResponse

    /** Get products created by a specific seller */
    @GET("/api/products")
    suspend fun getSellerProducts(
        @Query("createdBy") sellerId: String,
        @Query("status") status: String = "active",
        @Header("x-user-id") userId: String
    ): ProductsResponse

    @GET("/api/products/{id}")
    suspend fun getProductById(@Path("id") id: String): ProductDetailResponse

    @POST("/api/products/batch/stats")
    suspend fun getProductsStats(@Body request: ProductStatsRequest): ProductStatsResponse

    @POST("/api/products")
    suspend fun createProduct(
        @Header("x-user-id") userId: String,
        @Body request: CreateProductRequest
    ): ProductDetailResponse

    @PUT("/api/products/{id}")
    suspend fun updateProduct(
        @Path("id") productId: String,
        @Header("x-user-id") userId: String,
        @Body request: UpdateProductRequest
    ): ProductDetailResponse

    @DELETE("/api/products/{id}")
    suspend fun deleteProduct(
        @Path("id") productId: String,
        @Header("x-user-id") userId: String
    ): DeleteProductResponse
}
