package com.craftly.app.presentation.ui.fragments

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.craftly.app.R
import com.craftly.app.data.model.Product

class ProductAdapter(private var products: List<Product>) :
    RecyclerView.Adapter<ProductAdapter.ProductViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProductViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_product, parent, false)
        return ProductViewHolder(view)
    }

    override fun onBindViewHolder(holder: ProductViewHolder, position: Int) {
        val product = products[position]
        holder.bind(product)
    }

    override fun getItemCount(): Int = products.size

    fun updateProducts(newProducts: List<Product>) {
        products = newProducts
        notifyDataSetChanged()
    }

    class ProductViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val productNameTextView: TextView = itemView.findViewById(R.id.productName)
        private val productPriceTextView: TextView = itemView.findViewById(R.id.productPrice)
        private val productImageView: ImageView = itemView.findViewById(R.id.productImage)
        private val productRatingTextView: TextView = itemView.findViewById(R.id.productRating)

        fun bind(product: Product) {
            productNameTextView.text = product.name
            productPriceTextView.text = "₱${product.price}"
            productRatingTextView.text = "★ ${product.rating}"

            // TODO: Load image using Coil when image URLs are available
        }
    }
}
