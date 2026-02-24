package com.craftly.cart.presentation.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.craftly.cart.data.models.CartItem
import com.craftly.databinding.ItemCartBinding

class CartItemAdapter(
    private var items: MutableList<CartItem> = mutableListOf(),
    private val onQuantityChanged: (String, Int) -> Unit,
    private val onRemoveClick: (String) -> Unit
) : RecyclerView.Adapter<CartItemAdapter.CartViewHolder>() {

    fun updateItems(newItems: List<CartItem>) {
        items = newItems.toMutableList()
        notifyDataSetChanged()
    }

    inner class CartViewHolder(private val binding: ItemCartBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(item: CartItem) {
            try {
                // Product image
                if (item.image.isNotEmpty()) {
                    Glide.with(binding.root.context)
                        .load(item.image)
                        .centerCrop()
                        .into(binding.cartItemImage)
                }

                // Product info
                binding.cartItemName.text = item.name
                binding.cartItemPrice.text = String.format("₱ %.0f", item.price)
                binding.cartItemCategory.text = item.category

                // Quantity display
                binding.quantityText.text = "${item.quantity}"

                // Quantity controls
                binding.decreaseButton.setOnClickListener {
                    if (item.quantity > 1) {
                        val newQuantity = item.quantity - 1
                        onQuantityChanged(item.id, newQuantity)
                    }
                }

                binding.increaseButton.setOnClickListener {
                    if (item.quantity < item.stock) {
                        val newQuantity = item.quantity + 1
                        onQuantityChanged(item.id, newQuantity)
                    }
                }

                // Total price for this item
                binding.itemTotal.text = String.format(
                    "₱ %.0f",
                    item.price * item.quantity
                )

                // Remove button
                binding.removeButton.setOnClickListener {
                    onRemoveClick(item.id)
                }

            } catch (e: Exception) {
                android.util.Log.e("CartItemAdapter", "Error binding cart item: ${e.message}", e)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CartViewHolder {
        val binding = ItemCartBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return CartViewHolder(binding)
    }

    override fun onBindViewHolder(holder: CartViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size
}
