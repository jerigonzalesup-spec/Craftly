package com.craftly.reviews.data.repository

import com.craftly.reviews.data.remote.ReviewsApiService
import com.craftly.reviews.data.models.Review
import com.craftly.reviews.data.models.SubmitReviewRequest
import com.craftly.auth.data.local.SharedPreferencesManager

class ReviewsRepository(
    private val apiService: ReviewsApiService,
    private val prefsManager: SharedPreferencesManager
) {

    suspend fun getProductReviews(productId: String): Result<List<Review>> = try {
        val response = apiService.getProductReviews(productId)
        Result.success(response.data ?: emptyList())
    } catch (e: Exception) {
        android.util.Log.e("ReviewsRepository", "Error fetching reviews: ${e.message}", e)
        Result.failure(e)
    }

    suspend fun submitReview(
        productId: String,
        productName: String,
        rating: Int,
        comment: String
    ): Result<Review> {
        return try {
            val userId = prefsManager.getUser()?.uid ?: return Result.failure(Exception("User not logged in"))

            // Validate rating (1-5)
            if (rating < 1 || rating > 5) {
                return Result.failure(Exception("Rating must be between 1 and 5"))
            }

            // Validate comment (10-500 chars)
            if (comment.length < 10 || comment.length > 500) {
                return Result.failure(Exception("Comment must be between 10 and 500 characters"))
            }

            val request = SubmitReviewRequest(
                productId = productId,
                productName = productName,
                rating = rating,
                comment = comment
            )

            val response = apiService.submitReview(userId, request)
            if (response.success && response.data != null) {
                Result.success(response.data)
            } else {
                Result.failure(Exception(response.error ?: "Failed to submit review"))
            }
        } catch (e: Exception) {
            android.util.Log.e("ReviewsRepository", "Error submitting review: ${e.message}", e)
            Result.failure(e)
        }
    }
}
