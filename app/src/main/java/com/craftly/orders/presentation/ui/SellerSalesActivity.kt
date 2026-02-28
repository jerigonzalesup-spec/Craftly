package com.craftly.orders.presentation.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.core.network.RetrofitClient
import com.craftly.databinding.ActivitySellerSalesBinding
import com.craftly.databinding.ItemSellerSaleBinding
import com.craftly.orders.data.models.Order
import com.craftly.orders.data.repository.OrdersRepository
import com.craftly.orders.presentation.viewmodels.SellerSalesUiState
import com.craftly.orders.presentation.viewmodels.SellerSalesViewModel
import java.text.SimpleDateFormat
import java.util.Locale

class SellerSalesActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySellerSalesBinding
    private lateinit var viewModel: SellerSalesViewModel
    private lateinit var adapter: SellerSalesAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySellerSalesBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupViewModel()
        setupRecyclerView()

        binding.backButton.setOnClickListener { finish() }

        observeViewModel()
        viewModel.loadSellerOrders()
    }

    private fun setupViewModel() {
        val prefsManager = SharedPreferencesManager(this)
        val apiService = RetrofitClient.createOrdersApiService()
        val repository = OrdersRepository(apiService, prefsManager)

        val factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                return SellerSalesViewModel(repository) as T
            }
        }
        viewModel = ViewModelProvider(this, factory)[SellerSalesViewModel::class.java]
    }

    private fun setupRecyclerView() {
        adapter = SellerSalesAdapter(
            onUpdateStatusClick = { order ->
                if (viewModel.isOrderLocked(order.createdAt)) {
                    Toast.makeText(this, "Status locked: 24-hour editing window has passed", Toast.LENGTH_LONG).show()
                } else {
                    showStatusDialog(order)
                }
            },
            onReviewPaymentClick = { order ->
                showReceiptApprovalDialog(order)
            }
        )
        binding.salesRecyclerView.apply {
            layoutManager = LinearLayoutManager(this@SellerSalesActivity)
            adapter = this@SellerSalesActivity.adapter
        }
    }

    private fun observeViewModel() {
        viewModel.uiState.observe(this) { state ->
            when (state) {
                is SellerSalesUiState.Loading -> {
                    binding.loadingProgressBar.visibility = View.VISIBLE
                    binding.salesRecyclerView.visibility = View.GONE
                    binding.emptyStateContainer.visibility = View.GONE
                    binding.statsCard.visibility = View.GONE
                }
                is SellerSalesUiState.Success -> {
                    binding.loadingProgressBar.visibility = View.GONE
                    showStats(state.orders)
                    if (state.orders.isEmpty()) {
                        binding.emptyStateContainer.visibility = View.VISIBLE
                        binding.salesRecyclerView.visibility = View.GONE
                    } else {
                        binding.emptyStateContainer.visibility = View.GONE
                        binding.salesRecyclerView.visibility = View.VISIBLE
                        adapter.updateData(state.orders, viewModel)
                    }
                }
                is SellerSalesUiState.Error -> {
                    binding.loadingProgressBar.visibility = View.GONE
                    binding.emptyStateContainer.visibility = View.VISIBLE
                    binding.salesRecyclerView.visibility = View.GONE
                    binding.statsCard.visibility = View.GONE
                    Toast.makeText(this, state.message, Toast.LENGTH_LONG).show()
                }
            }
        }

        viewModel.message.observe(this) { msg ->
            Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
        }
    }

    private fun showStats(orders: List<Order>) {
        val revenue = orders
            .filter { it.orderStatus != "cancelled" }
            .sumOf { it.sellerTotal ?: it.totalAmount }
        val pending    = orders.count { it.orderStatus == "pending" }
        val processing = orders.count { it.orderStatus == "processing" }
        val delivered  = orders.count { it.orderStatus == "delivered" }
        val cancelled  = orders.count { it.orderStatus == "cancelled" }

        binding.statsCard.visibility = View.VISIBLE
        binding.statTotalRevenue.text = "\u20b1 ${String.format("%,.0f", revenue)}"
        binding.statTotalOrders.text  = "${orders.size}"
        binding.statPending.text      = "Pending\n$pending"
        binding.statProcessing.text   = "Processing\n$processing"
        binding.statDelivered.text    = "Delivered\n$delivered"
        binding.statCancelled.text    = "Cancelled\n$cancelled"
    }

    private fun showStatusDialog(order: Order) {
        val statuses = arrayOf("pending", "processing", "shipped", "delivered", "cancelled")
        val current = statuses.indexOf(order.orderStatus).let { if (it < 0) 0 else it }

        AlertDialog.Builder(this)
            .setTitle("Update Order Status")
            .setSingleChoiceItems(statuses, current) { dialog, which ->
                val newStatus = statuses[which]
                viewModel.updateOrderStatus(order.id, newStatus, order.createdAt)
                dialog.dismiss()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showReceiptApprovalDialog(order: Order) {
        val receiptUrl = order.receiptImageUrl

        val dialogView = LayoutInflater.from(this).inflate(
            android.R.layout.simple_list_item_2, null
        )

        AlertDialog.Builder(this)
            .setTitle("🧾 Review GCash Receipt")
            .setMessage(
                if (!receiptUrl.isNullOrBlank())
                    "The buyer has uploaded a GCash receipt for Order #${order.id.take(8)}.\n\nApprove to confirm payment and move order to processing, or reject if the receipt is invalid."
                else
                    "No receipt has been uploaded yet for Order #${order.id.take(8)}.\n\nYou can reject the order or wait for the buyer to upload a receipt."
            )
            .setPositiveButton("✅ Approve Payment") { _, _ ->
                viewModel.updatePaymentStatus(order.id, "paid")
            }
            .setNegativeButton("❌ Reject Receipt") { _, _ ->
                viewModel.updatePaymentStatus(order.id, "unpaid")
            }
            .setNeutralButton("Cancel", null)
            .show()
    }

    // ── Adapter ───────────────────────────────────────────────────────────────

    class SellerSalesAdapter(
        private var orders: MutableList<Order> = mutableListOf(),
        private var viewModel: SellerSalesViewModel? = null,
        private val onUpdateStatusClick: (Order) -> Unit,
        private val onReviewPaymentClick: (Order) -> Unit = {}
    ) : RecyclerView.Adapter<SellerSalesAdapter.ViewHolder>() {

        fun updateData(newOrders: List<Order>, vm: SellerSalesViewModel) {
            orders = newOrders.toMutableList()
            viewModel = vm
            notifyDataSetChanged()
        }

        inner class ViewHolder(val binding: ItemSellerSaleBinding) :
            RecyclerView.ViewHolder(binding.root)

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val binding = ItemSellerSaleBinding.inflate(
                LayoutInflater.from(parent.context), parent, false
            )
            return ViewHolder(binding)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val order = orders[position]
            with(holder.binding) {
                // Order ID (first 8 chars for readability)
                saleOrderId.text = "Order #${order.id.take(8)}"

                // Date
                saleDate.text = formatDate(order.createdAt)

                // Buyer name from shipping address
                val buyer = order.shippingAddress.fullName.ifEmpty { "Unknown Buyer" }
                saleBuyerName.text = "Buyer: $buyer"

                // Items summary — prefer seller-specific items if available
                val displayItems = order.sellerItems ?: order.items
                val itemCount = displayItems.size
                val itemNames = displayItems.take(2).joinToString(", ") { it.productName }
                val moreSuffix = if (displayItems.size > 2) " +${displayItems.size - 2} more" else ""
                saleItemsSummary.text = "$itemCount item(s): $itemNames$moreSuffix"

                // Total — prefer seller-specific total for multi-seller orders
                val displayTotal = order.sellerTotal ?: order.totalAmount
                saleTotal.text = String.format("₱ %,.2f", displayTotal)

                // Status with colour
                saleStatus.text = order.orderStatus.replaceFirstChar { it.uppercase() }
                saleStatus.setTextColor(
                    when (order.orderStatus) {
                        "delivered" -> android.graphics.Color.parseColor("#4ADE80")
                        "cancelled" -> android.graphics.Color.parseColor("#EF4444")
                        "shipped"   -> android.graphics.Color.parseColor("#60A5FA")
                        "processing"-> android.graphics.Color.parseColor("#FACC15")
                        else        -> android.graphics.Color.parseColor("#D97706")
                    }
                )

                // Lock state
                val locked = viewModel?.isOrderLocked(order.createdAt) ?: false
                lockedWarning.visibility = if (locked) View.VISIBLE else View.GONE
                updateStatusButton.isEnabled = !locked

                updateStatusButton.setOnClickListener { onUpdateStatusClick(order) }

                // Receipt review button: show only for GCash orders awaiting verification
                val needsReview = order.paymentMethod.lowercase() == "gcash" &&
                    order.paymentStatus.lowercase() == "pending_verification"
                paymentReviewBadge.visibility = if (needsReview) View.VISIBLE else View.GONE
                reviewPaymentButton.visibility = if (needsReview && !locked) View.VISIBLE else View.GONE
                reviewPaymentButton.setOnClickListener { onReviewPaymentClick(order) }
            }
        }

        override fun getItemCount() = orders.size

        private fun formatDate(isoDate: String): String {
            return try {
                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                val date = sdf.parse(isoDate) ?: return isoDate
                SimpleDateFormat("MMM dd, yyyy", Locale.US).format(date)
            } catch (e: Exception) {
                isoDate.take(10) // fallback to YYYY-MM-DD
            }
        }
    }
}
