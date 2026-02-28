package com.craftly.cart.presentation.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions
import com.craftly.cart.data.models.CartItem
import com.craftly.databinding.ItemCartBinding

class CartItemAdapter(
    private val onQuantityChanged: (String, Int) -> Unit,
    private val onRemoveClick: (String) -> Unit
) : ListAdapter<CartItem, CartItemAdapter.CartViewHolder>(CartItemDiffCallback()) {

    inner class CartViewHolder(private val binding: ItemCartBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(item: CartItem) {
            try {
                // Product image with crossfade
                Glide.with(binding.root.context)
                    .load(item.image.ifEmpty { null })
                    .centerCrop()
                    .transition(DrawableTransitionOptions.withCrossFade(200))
                    .into(binding.cartItemImage)

                binding.cartItemName.text = item.name
                binding.cartItemPrice.text = String.format("₱ %.0f", item.price)
                binding.cartItemCategory.text = item.category
                binding.quantityText.text = "${item.quantity}"
                binding.itemTotal.text = String.format("₱ %.0f", item.price * item.quantity)

                // Use productId as the stable identifier (id may be empty from server)
                val stableId = item.productId.ifEmpty { item.id }

                binding.decreaseButton.setOnClickListener {
                    if (item.quantity > 1) {
                        onQuantityChanged(stableId, item.quantity - 1)
                    }
                }

                binding.increaseButton.setOnClickListener {
                    if (item.quantity < item.stock) {
                        onQuantityChanged(stableId, item.quantity + 1)
                    } else {
                        android.widget.Toast.makeText(
                            binding.root.context,
                            "Max stock reached (${item.stock})",
                            android.widget.Toast.LENGTH_SHORT
                        ).show()
                    }
                }

                binding.removeButton.setOnClickListener {
                    it.animate().scaleX(0.85f).scaleY(0.85f).setDuration(80).withEndAction {
                        it.animate().scaleX(1f).scaleY(1f).setDuration(80).start()
                        onRemoveClick(stableId)
                    }.start()
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
        holder.bind(getItem(position))
    }

    // Legacy compat — used transitionally
    fun updateItems(newItems: List<CartItem>) = submitList(newItems.toList())
}

class CartItemDiffCallback : DiffUtil.ItemCallback<CartItem>() {
    override fun areItemsTheSame(oldItem: CartItem, newItem: CartItem): Boolean {
        val oldId = oldItem.productId.ifEmpty { oldItem.id }
        val newId = newItem.productId.ifEmpty { newItem.id }
        return oldId == newId
    }

    override fun areContentsTheSame(oldItem: CartItem, newItem: CartItem) =
        oldItem.quantity == newItem.quantity &&
        oldItem.price == newItem.price &&
        oldItem.name == newItem.name
}

