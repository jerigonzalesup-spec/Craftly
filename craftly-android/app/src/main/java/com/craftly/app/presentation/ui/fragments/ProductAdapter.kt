package com.craftly.app.presentation.ui.fragments

import android.content.Intent
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.craftly.app.R
import com.craftly.app.data.model.Product
import com.craftly.app.presentation.ui.activities.ProductDetailActivity

class ProductAdapter(private var products: List<Product>) :
    RecyclerView.Adapter<ProductAdapter.ProductViewHolder>() {

    private val TAG = "ProductAdapter"

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProductViewHolder {
        Log.d(TAG, "Creating view holder")
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_product, parent, false)
        return ProductViewHolder(view)
    }

    override fun onBindViewHolder(holder: ProductViewHolder, position: Int) {
        val product = products[position]
        Log.d(TAG, "Binding product at position $position: ${product.name}")
        holder.bind(product)
    }

    override fun getItemCount(): Int {
        Log.d(TAG, "getItemCount: ${products.size}")
        return products.size
    }

    fun updateProducts(newProducts: List<Product>) {
        Log.d(TAG, "updateProducts called with ${newProducts.size} products")
        products = newProducts
        notifyDataSetChanged()
    }

    class ProductViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val productNameTextView: TextView = itemView.findViewById(R.id.productName)
        private val productPriceTextView: TextView = itemView.findViewById(R.id.productPrice)
        private val productImageView: ImageView = itemView.findViewById(R.id.productImage)
        private val productCategoryTextView: TextView = itemView.findViewById(R.id.productCategory)
        private val productRatingTextView: TextView = itemView.findViewById(R.id.productRating)
        private val stockBadge: LinearLayout = itemView.findViewById(R.id.stockBadge)
        private val stockBadgeText: TextView = itemView.findViewById(R.id.stockBadgeText)
        private val stockInfoText: TextView = itemView.findViewById(R.id.stockInfoText)
        private val TAG = "ProductViewHolder"

        fun bind(product: Product) {
            Log.d(TAG, "Binding: ${product.name}, Price: ₱${product.price}, Stock: ${product.stock}, Category: ${product.category}")

            productNameTextView.text = product.name
            productPriceTextView.text = "₱${String.format("%.2f", product.price)}"
            productCategoryTextView.text = product.category.replace("-", " ").uppercase()

            // Set rating or default to 4.5
            val rating = if (product.rating > 0) {
                String.format("%.1f", product.rating)
            } else {
                "4.5"
            }
            productRatingTextView.text = rating

            // Handle stock indicator
            when {
                product.stock <= 0 -> {
                    stockBadge.visibility = View.VISIBLE
                    stockBadgeText.text = "Out of Stock"
                    stockBadge.setBackgroundColor(itemView.context.getColor(android.R.color.holo_red_light))
                    stockInfoText.text = "Not available"
                    stockInfoText.setTextColor(itemView.context.getColor(android.R.color.holo_red_dark))
                }
                product.stock < 5 -> {
                    stockBadge.visibility = View.VISIBLE
                    stockBadgeText.text = "Low Stock"
                    stockBadge.setBackgroundColor(itemView.context.getColor(android.R.color.holo_orange_light))
                    stockInfoText.text = "Only ${product.stock} left"
                    stockInfoText.setTextColor(itemView.context.getColor(android.R.color.holo_orange_dark))
                }
                else -> {
                    stockBadge.visibility = View.VISIBLE
                    stockBadgeText.text = "In Stock"
                    stockBadge.setBackgroundColor(itemView.context.getColor(R.color.success))
                    stockInfoText.text = "${product.stock} available"
                    stockInfoText.setTextColor(itemView.context.getColor(R.color.success))
                }
            }

            // Load image using Coil if image URL is available
            if (product.images.isNotEmpty()) {
                try {
                    productImageView.load(product.images[0]) {
                        crossfade(true)
                        placeholder(R.drawable.ic_launcher_foreground)
                        error(R.drawable.ic_launcher_foreground)
                    }
                    Log.d(TAG, "Image loaded: ${product.images[0]}")
                } catch (e: Exception) {
                    Log.e(TAG, "Error loading image: ${e.message}")
                    productImageView.setImageResource(R.drawable.ic_launcher_foreground)
                }
            } else {
                Log.w(TAG, "No images for product: ${product.name}")
                productImageView.setImageResource(R.drawable.ic_launcher_foreground)
            }

            // Add click listener to navigate to product detail
            itemView.setOnClickListener {
                Log.d(TAG, "Product clicked: ${product.id}")
                val context = itemView.context
                val intent = Intent(context, ProductDetailActivity::class.java)
                intent.putExtra("productId", product.id)
                context.startActivity(intent)
            }
        }
    }
}
