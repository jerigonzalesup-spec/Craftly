package com.craftly.reviews.data.models

import java.io.Serializable

data class Review(
    val id: String = "",
    val productId: String = "",
    val userId: String = "",
    val username: String = "",
    val rating: Int = 5,
    val comment: String = "",
    val createdAt: String = ""
) : Serializable

data class ReviewsResponse(
    val success: Boolean = false,
    val data: List<Review> = emptyList(),
    val message: String? = null
)

data class SubmitReviewRequest(
    val productId: String,
    val productName: String,
    val rating: Int,
    val comment: String
)

data class SubmitReviewResponse(
    val success: Boolean = false,
    val data: Review? = null,
    val error: String? = null
)
