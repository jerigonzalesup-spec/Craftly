package com.craftly.orders.presentation.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.craftly.databinding.ItemOrderBinding
import com.craftly.orders.data.models.Order
import java.text.SimpleDateFormat
import java.util.*

class OrdersListAdapter(
    private val onOrderClick: (Order) -> Unit,
    private val onCancelClick: (String) -> Unit
) : ListAdapter<Order, OrdersListAdapter.OrderViewHolder>(OrderDiffCallback()) {

    fun updateOrders(newOrders: List<Order>) = submitList(newOrders.toList())

    inner class OrderViewHolder(private val binding: ItemOrderBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(order: Order) {
            try {
                binding.orderId.text = "Order #${order.id.takeLast(8).uppercase()}"

                val dateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
                try {
                    val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).parse(order.createdAt)
                    binding.orderDate.text = dateFormat.format(date ?: Date())
                } catch (e: Exception) {
                    binding.orderDate.text = order.createdAt
                }

                binding.orderTotal.text = String.format("₱ %.0f", order.totalAmount)

                binding.orderStatus.text = order.orderStatus.replaceFirstChar { it.uppercase() }
                binding.orderStatus.setTextColor(
                    when (order.orderStatus) {
                        "delivered" -> android.graphics.Color.parseColor("#4ADE80")
                        "cancelled" -> android.graphics.Color.parseColor("#EF4444")
                        "shipped" -> android.graphics.Color.parseColor("#60A5FA")
                        "processing" -> android.graphics.Color.parseColor("#FACC15")
                        else -> android.graphics.Color.parseColor("#D97706")
                    }
                )

                binding.itemCount.text = "${order.items.size} item(s)"

                binding.root.setOnClickListener { onOrderClick(order) }

                if (order.orderStatus == "pending" || order.orderStatus == "processing") {
                    binding.cancelButton.visibility = android.view.View.VISIBLE
                    binding.cancelButton.setOnClickListener {
                        it.animate().scaleX(0.9f).scaleY(0.9f).setDuration(80).withEndAction {
                            it.animate().scaleX(1f).scaleY(1f).setDuration(80).start()
                            onCancelClick(order.id)
                        }.start()
                    }
                } else {
                    binding.cancelButton.visibility = android.view.View.GONE
                }

            } catch (e: Exception) {
                android.util.Log.e("OrdersListAdapter", "Error binding order: ${e.message}", e)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OrderViewHolder {
        val binding = ItemOrderBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return OrderViewHolder(binding)
    }

    override fun onBindViewHolder(holder: OrderViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
}

class OrderDiffCallback : DiffUtil.ItemCallback<Order>() {
    override fun areItemsTheSame(oldItem: Order, newItem: Order) = oldItem.id == newItem.id
    override fun areContentsTheSame(oldItem: Order, newItem: Order) =
        oldItem.orderStatus == newItem.orderStatus && oldItem.totalAmount == newItem.totalAmount
}

