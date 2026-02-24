package com.craftly.favorites.presentation.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.craftly.databinding.ItemFavoriteBinding
import com.craftly.favorites.data.models.FavoriteItem

class FavoritesAdapter(
    private var favorites: MutableList<FavoriteItem> = mutableListOf(),
    private val onItemClick: (FavoriteItem) -> Unit,
    private val onRemoveClick: (String, String) -> Unit
) : RecyclerView.Adapter<FavoritesAdapter.FavoriteViewHolder>() {

    fun updateFavorites(newFavorites: List<FavoriteItem>) {
        favorites = newFavorites.toMutableList()
        notifyDataSetChanged()
    }

    inner class FavoriteViewHolder(private val binding: ItemFavoriteBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(favorite: FavoriteItem) {
            try {
                // Product image
                if (favorite.image.isNotEmpty()) {
                    Glide.with(binding.root.context)
                        .load(favorite.image)
                        .centerCrop()
                        .into(binding.favoriteImage)
                }

                // Product name
                binding.favoriteName.text = favorite.productName.ifEmpty { "Unknown Product" }

                // Price
                binding.favoritePrice.text = String.format("₱ %.0f", favorite.price)

                // Category
                binding.favoriteCategory.text = favorite.category.ifEmpty { "Uncategorized" }

                // Rating
                if (favorite.reviewCount != null && favorite.reviewCount!! > 0) {
                    binding.favoriteRating.text = String.format(
                        "★ %.1f (${favorite.reviewCount})",
                        favorite.rating ?: 0.0
                    )
                } else {
                    binding.favoriteRating.text = "No ratings"
                }

                // Sales count
                if (favorite.salesCount != null && favorite.salesCount!! > 0) {
                    binding.salesCount.text = "${favorite.salesCount} sold"
                } else {
                    binding.salesCount.text = ""
                }

                // Click to view product details
                binding.root.setOnClickListener {
                    onItemClick(favorite)
                }

                // Remove from favorites button
                binding.removeButton.setOnClickListener {
                    onRemoveClick(favorite.id, favorite.productName)
                }

            } catch (e: Exception) {
                android.util.Log.e("FavoritesAdapter", "Error binding favorite: ${e.message}", e)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): FavoriteViewHolder {
        val binding = ItemFavoriteBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return FavoriteViewHolder(binding)
    }

    override fun onBindViewHolder(holder: FavoriteViewHolder, position: Int) {
        holder.bind(favorites[position])
    }

    override fun getItemCount(): Int = favorites.size
}
