package com.craftly.favorites.presentation.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions
import com.craftly.R
import com.craftly.products.data.models.Product
import com.google.android.material.button.MaterialButton

class FavoriteItemAdapter(
    private val onProductClick: (Product) -> Unit,
    private val onRemoveClick: (Product) -> Unit
) : ListAdapter<Product, FavoriteItemAdapter.FavoriteViewHolder>(FavoriteDiffCallback()) {

    fun updateData(newProducts: List<Product>) = submitList(newProducts.toList())

    inner class FavoriteViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val image: ImageView = itemView.findViewById(R.id.favoriteImage)
        private val category: TextView = itemView.findViewById(R.id.favoriteCategory)
        private val name: TextView = itemView.findViewById(R.id.favoriteName)
        private val rating: TextView = itemView.findViewById(R.id.favoriteRating)
        private val salesCount: TextView = itemView.findViewById(R.id.salesCount)
        private val price: TextView = itemView.findViewById(R.id.favoritePrice)
        private val removeButton: MaterialButton = itemView.findViewById(R.id.removeButton)

        fun bind(product: Product) {
            Glide.with(itemView.context)
                .load(if (product.images.isNotEmpty()) product.images[0] else null)
                .centerCrop()
                .transition(DrawableTransitionOptions.withCrossFade(200))
                .into(image)

            category.text = product.category.ifEmpty { "Uncategorized" }
            name.text = product.name.ifEmpty { "Unknown Product" }

            if ((product.reviewCount ?: 0) > 0) {
                rating.text = String.format("★ %.1f (%d)", product.averageRating ?: 0.0, product.reviewCount)
            } else {
                rating.text = "No ratings yet"
            }

            val sc = product.salesCount ?: 0
            salesCount.visibility = if (sc > 0) View.VISIBLE else View.GONE
            if (sc > 0) salesCount.text = "$sc sold"

            price.text = String.format("₱ %.0f", product.price)

            itemView.setOnClickListener { onProductClick(product) }
            removeButton.setOnClickListener {
                it.animate().scaleX(0.9f).scaleY(0.9f).setDuration(80).withEndAction {
                    it.animate().scaleX(1f).scaleY(1f).setDuration(80).start()
                    onRemoveClick(product)
                }.start()
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): FavoriteViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_favorite, parent, false)
        return FavoriteViewHolder(view)
    }

    override fun onBindViewHolder(holder: FavoriteViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
}

class FavoriteDiffCallback : DiffUtil.ItemCallback<Product>() {
    override fun areItemsTheSame(oldItem: Product, newItem: Product) = oldItem.id == newItem.id
    override fun areContentsTheSame(oldItem: Product, newItem: Product) =
        oldItem.price == newItem.price && oldItem.name == newItem.name
}

