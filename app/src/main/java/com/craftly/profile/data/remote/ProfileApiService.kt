package com.craftly.profile.data.remote

import com.craftly.profile.data.models.ProfileResponse
import com.craftly.profile.data.models.UpdateProfileRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.Path

interface ProfileApiService {
    @GET("/api/profile/{userId}")
    suspend fun getUserProfile(@Path("userId") userId: String): ProfileResponse

    @PUT("/api/profile/{userId}")
    suspend fun updateUserProfile(
        @Path("userId") userId: String,
        @Body request: UpdateProfileRequest
    ): ProfileResponse
}
