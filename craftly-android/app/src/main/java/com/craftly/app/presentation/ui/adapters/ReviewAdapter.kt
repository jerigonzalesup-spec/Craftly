package com.craftly.app.presentation.ui.adapters

import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.RatingBar
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.craftly.app.R
import com.craftly.app.data.model.Review
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ReviewAdapter(private var reviews: List<Review>) :
    RecyclerView.Adapter<ReviewAdapter.ReviewViewHolder>() {

    private val TAG = "ReviewAdapter"

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ReviewViewHolder {
        Log.d(TAG, "Creating review view holder")
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_review, parent, false)
        return ReviewViewHolder(view)
    }

    override fun onBindViewHolder(holder: ReviewViewHolder, position: Int) {
        val review = reviews[position]
        Log.d(TAG, "Binding review at position $position: ${review.userName}")
        holder.bind(review)
    }

    override fun getItemCount(): Int {
        Log.d(TAG, "getItemCount: ${reviews.size}")
        return reviews.size
    }

    fun updateReviews(newReviews: List<Review>) {
        Log.d(TAG, "updateReviews called with ${newReviews.size} reviews")
        reviews = newReviews
        notifyDataSetChanged()
    }

    class ReviewViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val userInitial: TextView = itemView.findViewById(R.id.userInitial)
        private val reviewerName: TextView = itemView.findViewById(R.id.reviewerName)
        private val reviewDate: TextView = itemView.findViewById(R.id.reviewDate)
        private val reviewRating: RatingBar = itemView.findViewById(R.id.reviewRating)
        private val reviewComment: TextView = itemView.findViewById(R.id.reviewComment)
        private val TAG = "ReviewViewHolder"

        fun bind(review: Review) {
            Log.d(TAG, "Binding: ${review.userName}, Rating: ${review.rating}, Comment: ${review.comment}")

            // Set user initial
            userInitial.text = review.userName.firstOrNull()?.uppercaseChar().toString()

            reviewerName.text = review.userName
            reviewComment.text = review.comment
            reviewRating.rating = review.rating.toFloat()

            // Format date
            try {
                val reviewDate = Date(review.createdAt)
                val now = Date()
                val diffTime = now.time - reviewDate.time
                val diffDays = diffTime / (1000 * 60 * 60 * 24)
                val diffHours = diffTime / (1000 * 60 * 60)
                val diffMinutes = diffTime / (1000 * 60)

                val dateText = when {
                    diffMinutes < 1 -> "just now"
                    diffMinutes < 60 -> "$diffMinutes minute${if (diffMinutes == 1L) "" else "s"} ago"
                    diffHours < 24 -> "$diffHours hour${if (diffHours == 1L) "" else "s"} ago"
                    diffDays < 30 -> "$diffDays day${if (diffDays == 1L) "" else "s"} ago"
                    else -> {
                        val format = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
                        format.format(reviewDate)
                    }
                }
                this.reviewDate.text = dateText
            } catch (e: Exception) {
                Log.e(TAG, "Error formatting date: ${e.message}")
                this.reviewDate.text = ""
            }
        }
    }
}
