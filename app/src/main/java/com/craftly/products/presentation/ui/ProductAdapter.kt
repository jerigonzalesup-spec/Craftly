package com.craftly.products.presentation.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions
import com.craftly.R
import com.craftly.products.data.models.Product
import com.craftly.databinding.ItemProductCardBinding

class ProductAdapter(
    products: MutableList<Product> = mutableListOf(),
    private val onProductClick: (Product) -> Unit,
    private val onAddToCartClick: (Product) -> Unit,
    private val onFavoriteClick: (Product, Boolean) -> Unit,
    private var favoritedIds: Set<String> = emptySet(),
    private var currentUserId: String? = null,
    private val onManageClick: ((Product) -> Unit)? = null
) : ListAdapter<Product, ProductAdapter.ProductViewHolder>(ProductDiffCallback()) {

    init {
        if (products.isNotEmpty()) submitList(products.toList())
    }

    fun updateData(newProducts: List<Product>) = submitList(newProducts.toList())

    fun updateFavoritedIds(ids: Set<String>) {
        favoritedIds = ids
        // Efficient: only notify items whose favorite state has actually changed
        val currentList = currentList
        currentList.forEachIndexed { index, product ->
            val wasFavorited = favoritedIds.contains(product.id)
            // We pass payload to avoid full rebind
            notifyItemChanged(index, "favorite_changed")
        }
    }

    inner class ProductViewHolder(private val binding: ItemProductCardBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(product: Product) {
            try {
                // Product image with crossfade
                Glide.with(binding.root.context)
                    .load(if (product.images != null && product.images.isNotEmpty()) product.images[0] else null)
                    .placeholder(R.drawable.ic_product_placeholder)
                    .error(R.drawable.ic_product_placeholder)
                    .centerCrop()
                    .transition(DrawableTransitionOptions.withCrossFade(200))
                    .into(binding.productImage)

                binding.productName.text = product.name.ifEmpty { "Unknown Product" }

                binding.sellerName.apply {
                    text = product.sellerName ?: ""
                    visibility = if (!product.sellerName.isNullOrEmpty()) android.view.View.VISIBLE else android.view.View.GONE
                }

                binding.categoryLabel.text = product.category.ifEmpty { "Uncategorized" }
                binding.productPrice.text = String.format("₱ %.0f", product.price)

                binding.stockStatus.text = if (product.stock > 0) "${product.stock} in stock" else "Out of stock"

                binding.shippingBadge.visibility = if (product.allowShipping) android.view.View.VISIBLE else android.view.View.GONE
                binding.pickupBadge.visibility = if (product.allowPickup) android.view.View.VISIBLE else android.view.View.GONE
                binding.codBadge.visibility = if (product.allowCod) android.view.View.VISIBLE else android.view.View.GONE
                binding.gcashBadge.visibility = if (product.allowGcash) android.view.View.VISIBLE else android.view.View.GONE

                if ((product.reviewCount ?: 0) > 0) {
                    binding.ratingText.text = String.format("★ %.1f (${product.reviewCount})", product.averageRating ?: 0.0)
                } else {
                    binding.ratingText.text = "No ratings yet"
                }

                binding.salesCount.apply {
                    if ((product.salesCount ?: 0) > 0) {
                        text = "${product.salesCount} sold"
                        visibility = android.view.View.VISIBLE
                    } else {
                        visibility = android.view.View.GONE
                    }
                }

                binding.root.setOnClickListener { onProductClick(product) }

                val isOwnProduct = !currentUserId.isNullOrEmpty() && product.createdBy == currentUserId

                if (isOwnProduct) {
                    // Hide favorite; change cart button to "Manage"
                    binding.favoriteButton.visibility = android.view.View.GONE
                    binding.addToCartButton.text = "Manage"
                    binding.addToCartButton.setOnClickListener {
                        onManageClick?.invoke(product)
                    }
                } else {
                    binding.favoriteButton.visibility = android.view.View.VISIBLE
                    binding.addToCartButton.text = "Add to Cart"
                    binding.addToCartButton.setOnClickListener {
                        it.animate().scaleX(0.92f).scaleY(0.92f).setDuration(80).withEndAction {
                            it.animate().scaleX(1f).scaleY(1f).setDuration(80).start()
                        }.start()
                        onAddToCartClick(product)
                    }
                    bindFavorite(product)
                }

            } catch (e: Exception) {
                android.util.Log.e("ProductAdapter", "Error binding product: ${e.message}", e)
            }
        }

        fun bindFavorite(product: Product) {
            val isFavorited = favoritedIds.contains(product.id)
            binding.favoriteButton.apply {
                tag = product.id
                setColorFilter(
                    if (isFavorited) android.graphics.Color.parseColor("#EF4444")
                    else android.graphics.Color.WHITE
                )
                setOnClickListener(null)
                setOnClickListener {
                    // Animate heart
                    it.animate().scaleX(1.3f).scaleY(1.3f).setDuration(120).withEndAction {
                        it.animate().scaleX(1f).scaleY(1f).setDuration(120).start()
                    }.start()
                    onFavoriteClick(product, !isFavorited)
                }
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
        holder.bind(getItem(position))
    }

    override fun onBindViewHolder(holder: ProductViewHolder, position: Int, payloads: List<Any>) {
        if (payloads.isNotEmpty() && payloads[0] == "favorite_changed") {
            holder.bindFavorite(getItem(position))
        } else {
            super.onBindViewHolder(holder, position, payloads)
        }
    }
}

class ProductDiffCallback : DiffUtil.ItemCallback<Product>() {
    override fun areItemsTheSame(oldItem: Product, newItem: Product) = oldItem.id == newItem.id
    override fun areContentsTheSame(oldItem: Product, newItem: Product) =
        oldItem.price == newItem.price &&
        oldItem.name == newItem.name &&
        oldItem.stock == newItem.stock &&
        oldItem.salesCount == newItem.salesCount
}

