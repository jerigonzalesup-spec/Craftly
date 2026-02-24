package com.craftly.orders.presentation.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.craftly.databinding.ItemOrderBinding
import com.craftly.orders.data.models.Order
import java.text.SimpleDateFormat
import java.util.*

class OrdersListAdapter(
    private var orders: MutableList<Order> = mutableListOf(),
    private val onOrderClick: (Order) -> Unit,
    private val onCancelClick: (String) -> Unit
) : RecyclerView.Adapter<OrdersListAdapter.OrderViewHolder>() {

    fun updateOrders(newOrders: List<Order>) {
        orders = newOrders.toMutableList()
        notifyDataSetChanged()
    }

    inner class OrderViewHolder(private val binding: ItemOrderBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(order: Order) {
            try {
                // Order ID
                binding.orderId.text = "Order #${order.id.takeLast(8).uppercase()}"

                // Order Date
                val dateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
                try {
                    val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).parse(order.createdAt)
                    binding.orderDate.text = dateFormat.format(date ?: Date())
                } catch (e: Exception) {
                    binding.orderDate.text = order.createdAt
                }

                // Order Total
                binding.orderTotal.text = String.format("₱ %.0f", order.totalAmount)

                // Order Status
                binding.orderStatus.text = order.status.replaceFirstChar { it.uppercase() }
                binding.orderStatus.setTextColor(
                    when (order.status) {
                        "delivered" -> android.graphics.Color.parseColor("#4CAF50") // Green
                        "cancelled" -> android.graphics.Color.parseColor("#F44336") // Red
                        "shipped" -> android.graphics.Color.parseColor("#2196F3") // Blue
                        else -> android.graphics.Color.parseColor("#FF9800") // Orange
                    }
                )

                // Item count
                binding.itemCount.text = "${order.items.size} item(s)"

                // Order details button
                binding.root.setOnClickListener {
                    onOrderClick(order)
                }

                // Cancel button visibility (only show if pending or processing)
                if (order.status == "pending" || order.status == "processing") {
                    binding.cancelButton.visibility = android.view.View.VISIBLE
                    binding.cancelButton.setOnClickListener {
                        onCancelClick(order.id)
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
        holder.bind(orders[position])
    }

    override fun getItemCount(): Int = orders.size
}
