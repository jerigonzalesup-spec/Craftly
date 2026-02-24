package com.craftly.products.presentation.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.craftly.products.data.models.Product
import com.craftly.databinding.ItemProductCardBinding

class ProductAdapter(
    private var products: MutableList<Product> = mutableListOf(),
    private val onProductClick: (Product) -> Unit,
    private val onAddToCartClick: (Product) -> Unit,
    private val onFavoriteClick: (Product, Boolean) -> Unit,
    private var favoritedIds: Set<String> = emptySet()
) : RecyclerView.Adapter<ProductAdapter.ProductViewHolder>() {

    fun updateData(newProducts: List<Product>) {
        products = newProducts.toMutableList()
        notifyDataSetChanged()
    }

    fun updateFavoritedIds(ids: Set<String>) {
        favoritedIds = ids
        notifyDataSetChanged()
    }

    inner class ProductViewHolder(private val binding: ItemProductCardBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(product: Product) {
            try {
                // Product image
                if (product.images != null && product.images.isNotEmpty()) {
                    Glide.with(binding.root.context)
                        .load(product.images[0])
                        .centerCrop()
                        .into(binding.productImage)
                }

                // Product name
                binding.productName.text = product.name.ifEmpty { "Unknown Product" }

                // Seller name
                binding.sellerName.apply {
                    if (!product.sellerName.isNullOrEmpty()) {
                        text = product.sellerName
                        visibility = android.view.View.VISIBLE
                    } else {
                        visibility = android.view.View.GONE
                    }
                }

                // Category
                binding.categoryLabel.text = product.category.ifEmpty { "Uncategorized" }

                // Price (formatted)
                binding.productPrice.text = String.format("₱ %.0f", product.price)

                // Stock status
                binding.stockStatus.text = if (product.stock > 0) {
                    "${product.stock} in stock"
                } else {
                    "Out of stock"
                }

                // Delivery badges
                binding.shippingBadge.apply {
                    if (product.allowShipping) {
                        text = "🚚 Shipping"
                        visibility = android.view.View.VISIBLE
                    } else {
                        visibility = android.view.View.GONE
                    }
                }

                binding.pickupBadge.apply {
                    if (product.allowPickup) {
                        text = "🏪 Pickup"
                        visibility = android.view.View.VISIBLE
                    } else {
                        visibility = android.view.View.GONE
                    }
                }

                // Rating and Sales Count display
                if (product.reviewCount != null && product.reviewCount!! > 0) {
                    binding.ratingText.text = String.format(
                        "★ %.1f (${product.reviewCount})",
                        product.averageRating ?: 0.0
                    )
                    binding.ratingText.visibility = android.view.View.VISIBLE
                } else {
                    binding.ratingText.text = "No ratings yet"
                    binding.ratingText.visibility = android.view.View.VISIBLE
                }

                // Sales count
                binding.salesCount.apply {
                    if (product.salesCount != null && product.salesCount!! > 0) {
                        text = "${product.salesCount} sold"
                        visibility = android.view.View.VISIBLE
                    } else {
                        visibility = android.view.View.GONE
                    }
                }

                // Click listeners
                binding.root.setOnClickListener {
                    onProductClick(product)
                }

                binding.addToCartButton.setOnClickListener {
                    onAddToCartClick(product)
                }

                // Favorite button
                val isFavorited = favoritedIds.contains(product.id)
                binding.favoriteButton.apply {
                    setColorFilter(
                        if (isFavorited) android.graphics.Color.RED
                        else android.graphics.Color.WHITE
                    )
                    setOnClickListener {
                        onFavoriteClick(product, !isFavorited)
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("ProductAdapter", "Error binding product: ${e.message}", e)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProductViewHolder {
        val binding = ItemProductCardBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ProductViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ProductViewHolder, position: Int) {
        holder.bind(products[position])
    }

    override fun getItemCount(): Int = products.size
}
