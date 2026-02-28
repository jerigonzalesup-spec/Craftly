package com.craftly.orders.presentation.ui

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModelProvider
import com.bumptech.glide.Glide
import com.craftly.R
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.core.network.RetrofitClient
import com.craftly.databinding.ActivityOrderDetailBinding
import com.craftly.databinding.ItemOrderDetailProductBinding
import com.craftly.orders.data.models.Order
import com.craftly.orders.data.models.OrderItem
import com.craftly.orders.data.repository.OrdersRepository
import com.craftly.orders.presentation.viewmodels.OrderDetailUiState
import com.craftly.orders.presentation.viewmodels.OrdersViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class OrderDetailActivity : AppCompatActivity() {

    private lateinit var binding: ActivityOrderDetailBinding
    private lateinit var viewModel: OrdersViewModel
    private lateinit var orderId: String

    companion object {
        const val EXTRA_ORDER_ID = "ORDER_ID"

        fun createIntent(context: Context, orderId: String): Intent =
            Intent(context, OrderDetailActivity::class.java).putExtra(EXTRA_ORDER_ID, orderId)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityOrderDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)

        orderId = intent.getStringExtra(EXTRA_ORDER_ID) ?: run {
            finish()
            return
        }

        setupViewModel()
        setupListeners()
        observeViewModel()

        viewModel.loadOrderDetails(orderId)
    }

    private fun setupViewModel() {
        val apiService = RetrofitClient.createOrdersApiService()
        val prefsManager = SharedPreferencesManager(this)
        val repository = OrdersRepository(apiService, prefsManager)
        val factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T =
                OrdersViewModel(repository) as T
        }
        viewModel = ViewModelProvider(this, factory).get(OrdersViewModel::class.java)
    }

    private fun setupListeners() {
        binding.backButton.setOnClickListener { finish() }
        binding.retryButton.setOnClickListener { viewModel.loadOrderDetails(orderId) }
    }

    private fun observeViewModel() {
        viewModel.detailUiState.observe(this) { state ->
            when (state) {
                is OrderDetailUiState.Loading -> showLoading()
                is OrderDetailUiState.Success -> showContent(state.order)
                is OrderDetailUiState.Error -> showError()
            }
        }
    }

    // ─────────────────── UI state helpers ───────────────────

    private fun showLoading() {
        binding.progressBar.visibility = View.VISIBLE
        binding.contentScrollView.visibility = View.GONE
        binding.errorContainer.visibility = View.GONE
    }

    private fun showError() {
        binding.progressBar.visibility = View.GONE
        binding.contentScrollView.visibility = View.GONE
        binding.errorContainer.visibility = View.VISIBLE
    }

    private fun showContent(order: Order) {
        binding.progressBar.visibility = View.GONE
        binding.errorContainer.visibility = View.GONE
        binding.contentScrollView.visibility = View.VISIBLE
        populateOrder(order)
    }

    // ─────────────────── Data population ────────────────────

    private fun populateOrder(order: Order) {
        populateStatusBadge(order.orderStatus)
        populateOrderInfo(order)
        populatePayment(order)
        populateItems(order)
        populateShipping(order)
        populateReceipt(order)
    }

    private fun populateStatusBadge(status: String) {
        val (label, colorHex) = when (status.lowercase()) {
            "delivered"  -> "Delivered"  to "#4ADE80"
            "cancelled"  -> "Cancelled"  to "#EF4444"
            "shipped"    -> "Shipped"    to "#60A5FA"
            "processing" -> "Processing" to "#FACC15"
            else         -> "Pending"    to "#D97706"
        }
        binding.orderStatusBadge.text = label
        binding.orderStatusBadge.setTextColor(android.graphics.Color.parseColor(colorHex))
        binding.orderStatusBadge.backgroundTintList =
            android.content.res.ColorStateList.valueOf(
                android.graphics.Color.parseColor(colorHex + "33") // 20 % alpha
            )
    }

    private fun populateOrderInfo(order: Order) {
        binding.orderIdText.text = "#${order.id.takeLast(8).uppercase()}"
        binding.orderDateText.text = formatDate(order.createdAt)
        binding.orderTotalText.text = "₱${String.format("%,.2f", order.totalAmount)}"
    }

    private fun populatePayment(order: Order) {
        binding.paymentMethodText.text = when (order.paymentMethod.lowercase()) {
            "gcash" -> "GCash"
            else    -> "Cash on Delivery"
        }

        val (payLabel, payColor) = when (order.paymentStatus.lowercase()) {
            "paid"                 -> "Paid"         to "#4ADE80"
            "pending_verification" -> "Under Review" to "#D97706"
            "refunded"             -> "Refunded"     to "#60A5FA"
            else                   -> "Unpaid"       to "#F59E0B"
        }
        binding.paymentStatusText.text = payLabel
        binding.paymentStatusText.setTextColor(android.graphics.Color.parseColor(payColor))

        binding.shippingMethodText.text = when (order.shippingMethod.lowercase()) {
            "store-pickup" -> "Store Pickup"
            else           -> "Local Delivery"
        }
    }

    private fun populateItems(order: Order) {
        val displayItems = order.sellerItems?.takeIf { it.isNotEmpty() } ?: order.items
        binding.itemsCardTitle.text = "Items Ordered (${displayItems.size})"
        binding.itemsContainer.removeAllViews()
        displayItems.forEach { item -> addProductRow(item) }

        binding.deliveryFeeText.text = if (order.deliveryFee > 0)
            "₱${String.format("%,.2f", order.deliveryFee)}"
        else "Free"

        binding.grandTotalText.text = "₱${String.format("%,.2f", order.totalAmount)}"
    }

    private fun addProductRow(item: OrderItem) {
        val rowBinding = ItemOrderDetailProductBinding.inflate(
            LayoutInflater.from(this), binding.itemsContainer, false
        )

        Glide.with(this)
            .load(item.image)
            .placeholder(R.drawable.ic_product_placeholder)
            .error(R.drawable.ic_product_placeholder)
            .centerCrop()
            .into(rowBinding.productImage)

        rowBinding.productName.text = item.productName
        rowBinding.productQty.text = "Qty: ${item.quantity}"
        rowBinding.productLineTotal.text = "₱${String.format("%,.2f", item.price * item.quantity)}"

        binding.itemsContainer.addView(rowBinding.root)
    }

    private fun populateShipping(order: Order) {
        val addr = order.shippingAddress
        val isDelivery = order.shippingMethod.lowercase() == "local-delivery"

        binding.shippingCardTitle.text =
            if (isDelivery) "Shipping Details" else "Pickup Contact"

        binding.recipientName.text = addr.fullName.ifBlank { "—" }
        binding.recipientEmail.text = addr.email.ifBlank { "—" }
        binding.recipientPhone.text = addr.contactNumber.ifBlank { "—" }

        if (isDelivery) {
            val parts = listOfNotNull(
                addr.streetAddress, addr.barangay, addr.city,
                addr.postalCode, addr.country
            ).filter { it.isNotBlank() }
            binding.shippingAddressText.text = parts.joinToString(", ")
            binding.shippingAddressText.visibility = View.VISIBLE
        } else {
            binding.shippingAddressText.visibility = View.GONE
        }
    }

    private fun populateReceipt(order: Order) {
        if (order.paymentMethod.lowercase() != "gcash") {
            binding.receiptCard.visibility = View.GONE
            return
        }
        binding.receiptCard.visibility = View.VISIBLE

        val url = order.receiptImageUrl
        if (!url.isNullOrBlank()) {
            binding.receiptImage.visibility = View.VISIBLE
            binding.noReceiptText.visibility = View.GONE
            Glide.with(this)
                .load(url)
                .placeholder(R.drawable.ic_product_placeholder)
                .into(binding.receiptImage)
        } else {
            binding.receiptImage.visibility = View.GONE
            binding.noReceiptText.visibility = View.VISIBLE
        }
    }

    // ─────────────────── Utility ────────────────────────────

    private fun formatDate(rawDate: String): String {
        if (rawDate.isBlank()) return "—"
        return try {
            val parsers = listOf(
                SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US),
                SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US),
                SimpleDateFormat("yyyy-MM-dd", Locale.US)
            )
            val date: Date? = parsers.firstNotNullOfOrNull { fmt ->
                runCatching { fmt.parse(rawDate) }.getOrNull()
            }
            date?.let { SimpleDateFormat("MMM dd, yyyy", Locale.US).format(it) } ?: rawDate
        } catch (e: Exception) {
            rawDate
        }
    }
}
