package com.craftly.core.network

import okhttp3.MultipartBody
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

data class ImageUploadResponse(
    val success: Boolean = false,
    val data: ImageUploadData? = null,
    val message: String? = null
)

data class ImageUploadData(
    val imageUrl: String? = null
)

interface ImageUploadApiService {
    @Multipart
    @POST("/api/images/upload")
    suspend fun uploadImage(
        @Header("x-user-id") userId: String,
        @Part image: MultipartBody.Part
    ): ImageUploadResponse
}
