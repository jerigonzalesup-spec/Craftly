package com.craftly.profile.data.remote

import com.craftly.profile.data.models.ProfileResponse
import com.craftly.profile.data.models.UpdateProfileRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface ProfileApiService {
    @GET("/api/profile/{userId}")
    suspend fun getUserProfile(@Path("userId") userId: String): ProfileResponse

    @POST("/api/profile/{userId}")
    suspend fun updateUserProfile(
        @Path("userId") userId: String,
        @Header("x-user-id") headerUserId: String,
        @Body request: UpdateProfileRequest
    ): ProfileResponse
}
