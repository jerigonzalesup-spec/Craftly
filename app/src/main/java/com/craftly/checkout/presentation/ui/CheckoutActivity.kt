package com.craftly.checkout.presentation.ui

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.craftly.R
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.cart.data.models.CartData
import com.craftly.cart.data.models.CartItem
import com.craftly.checkout.presentation.viewmodels.CheckoutUiState
import com.craftly.checkout.presentation.viewmodels.CheckoutViewModel
import com.craftly.checkout.presentation.viewmodels.CheckoutViewModelFactory
import com.craftly.core.network.RetrofitClient
import com.craftly.databinding.ActivityCheckoutBinding
import com.craftly.orders.data.models.CreateOrderRequest
import com.craftly.orders.data.models.OrderItem
import com.craftly.orders.data.models.ShippingAddress
import com.craftly.orders.data.repository.OrdersRepository

class CheckoutActivity : AppCompatActivity() {
    private lateinit var binding: ActivityCheckoutBinding
    private lateinit var viewModel: CheckoutViewModel
    private var cartData: CartData? = null
    private var selectedDeliveryMethod: String = "local-delivery"
    private var selectedPaymentMethod: String = "cod"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCheckoutBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Get cart data from intent
        @Suppress("DEPRECATION")
        cartData = intent.getSerializableExtra("cart_data") as? CartData

        // Initialize ViewModel
        val apiService = RetrofitClient.createOrdersApiService()
        val prefsManager = SharedPreferencesManager(this)
        val repository = OrdersRepository(apiService, prefsManager)
        viewModel = ViewModelProvider(
            this,
            CheckoutViewModelFactory(repository)
        ).get(CheckoutViewModel::class.java)

        setupUI()
        observeViewModel()
    }

    private fun setupUI() {
        // Back button
        binding.backButton.setOnClickListener {
            finish()
        }

        // Cart summary
        cartData?.let { cart ->
            binding.itemCount.text = "${cart.items.size} item(s)"
            binding.cartTotal.text = String.format("₱ %.0f", cart.total)
            binding.subtotal.text = String.format("₱ %.0f", cart.total)
        }

        // Delivery method selection
        binding.deliveryMethodGroup.setOnCheckedChangeListener { _, checkedId ->
            selectedDeliveryMethod = when (checkedId) {
                R.id.localDeliveryRadio -> "local-delivery"
                R.id.storePickupRadio -> "store-pickup"
                else -> "local-delivery"
            }
            // Show/hide shipping address based on delivery method
            binding.shippingAddressContainer.visibility =
                if (selectedDeliveryMethod == "local-delivery") View.VISIBLE else View.GONE
        }

        // Payment method selection
        binding.codRadio.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                selectedPaymentMethod = "cod"
                binding.gcashDetails.visibility = View.GONE
            }
        }

        binding.gcashRadio.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                selectedPaymentMethod = "gcash"
                binding.gcashDetails.visibility = View.VISIBLE
            }
        }

        // Place order button
        binding.placeOrderButton.setOnClickListener {
            placeOrder()
        }
    }

    private fun placeOrder() {
        val currentCartData = cartData
        if (currentCartData == null || currentCartData.items.isNullOrEmpty()) {
            Toast.makeText(this, getString(R.string.cart_empty), Toast.LENGTH_SHORT).show()
            return
        }

        // Validate required fields
        if (binding.recipientName.text.toString().isEmpty() || binding.contactNumber.text.toString().isEmpty()) {
            Toast.makeText(this, getString(R.string.checkout_recipient_details_required), Toast.LENGTH_SHORT).show()
            return
        }

        // For local delivery, validate address fields
        if (selectedDeliveryMethod == "local-delivery") {
            if (binding.streetAddress.text.toString().isEmpty() ||
                binding.barangay.text.toString().isEmpty() ||
                binding.city.text.toString().isEmpty() ||
                binding.postalCode.text.toString().isEmpty()
            ) {
                Toast.makeText(this, getString(R.string.checkout_address_required), Toast.LENGTH_SHORT).show()
                return
            }
        }

        // Create order items from cart items (safe to access: currentCartData is verified non-null above)
        val orderItems = currentCartData.items.map { cartItem ->
            OrderItem(
                productId = cartItem.productId,
                productName = cartItem.name,
                quantity = cartItem.quantity,
                price = cartItem.price,
                image = cartItem.image,
                category = cartItem.category
            )
        }

        // Get shipping address from inputs
        val shippingAddress = ShippingAddress(
            street = binding.streetAddress.text.toString(),
            barangay = binding.barangay.text.toString(),
            city = binding.city.text.toString(),
            postalCode = binding.postalCode.text.toString(),
            country = binding.country.text.toString()
        )

        // Create order request with delivery method
        val orderRequest = CreateOrderRequest(
            items = orderItems,
            shippingAddress = shippingAddress,
            recipientName = binding.recipientName.text.toString(),
            recipientPhone = binding.contactNumber.text.toString(),
            paymentMethod = selectedPaymentMethod,
            shippingMethod = selectedDeliveryMethod
        )

        // Place order
        viewModel.placeOrder(orderRequest)
    }

    private fun observeViewModel() {
        viewModel.uiState.observe(this) { state ->
            when (state) {
                is CheckoutUiState.Loading -> {
                    binding.placeOrderButton.isEnabled = false
                    binding.loadingProgressBar.visibility = View.VISIBLE
                }
                is CheckoutUiState.Success -> {
                    binding.loadingProgressBar.visibility = View.GONE
                    showOrderSuccess(state.order)
                }
                is CheckoutUiState.Error -> {
                    binding.placeOrderButton.isEnabled = true
                    binding.loadingProgressBar.visibility = View.GONE
                    Toast.makeText(
                        this,
                        String.format(getString(R.string.checkout_order_error), state.message),
                        Toast.LENGTH_LONG
                    ).show()
                }
                is CheckoutUiState.Review -> {
                    // Show review state if needed
                }
            }
        }

        viewModel.successMessage.observe(this) { message ->
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
        }
    }

    private fun showOrderSuccess(order: com.craftly.orders.data.models.Order) {
        binding.successContainer.visibility = View.VISIBLE
        binding.checkoutForm.visibility = View.GONE
        binding.successOrderId.text = "Order #${order.id.takeLast(8).uppercase()}"
        binding.successMessage.text = "Your order has been placed successfully!"
        binding.continueShoppingButton.setOnClickListener {
            finish()
        }
    }
}
