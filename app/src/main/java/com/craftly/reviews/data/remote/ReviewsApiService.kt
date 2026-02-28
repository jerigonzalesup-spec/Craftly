package com.craftly.reviews.data.remote

import com.craftly.reviews.data.models.ReviewsResponse
import com.craftly.reviews.data.models.SubmitReviewRequest
import com.craftly.reviews.data.models.SubmitReviewResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface ReviewsApiService {
    @GET("/api/reviews/{productId}")
    suspend fun getProductReviews(
        @Path("productId") productId: String
    ): ReviewsResponse

    @POST("/api/reviews/submit")
    suspend fun submitReview(
        @Header("x-user-id") userId: String,
        @Body request: SubmitReviewRequest
    ): SubmitReviewResponse
}
