package com.craftly.checkout.presentation.ui

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.craftly.MainActivity
import com.craftly.cart.data.models.CartItem
import com.craftly.cart.data.repository.CartRepository
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.checkout.presentation.viewmodels.CheckoutState
import com.craftly.checkout.presentation.viewmodels.CheckoutViewModel
import com.craftly.checkout.presentation.viewmodels.CheckoutViewModelFactory
import com.craftly.core.network.RetrofitClient
import com.craftly.databinding.ActivityCheckoutBinding
import com.craftly.orders.data.repository.OrdersRepository
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

class CheckoutActivity : AppCompatActivity() {
    private lateinit var binding: ActivityCheckoutBinding
    private lateinit var viewModel: CheckoutViewModel
    private var cartItems: List<CartItem> = emptyList()

    // Receipt image state
    private var selectedReceiptUri: Uri? = null
    private var receiptImageUrl: String? = null

    private val receiptPickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.data?.let { uri ->
                selectedReceiptUri = uri
                receiptImageUrl = null // clear previously uploaded URL
                val fileName = getFileNameFromUri(uri) ?: "receipt.jpg"
                binding.receiptFileName.text = "Selected: $fileName"
                binding.receiptPreviewContainer.visibility = View.VISIBLE
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCheckoutBinding.inflate(layoutInflater)
        setContentView(binding.root)

        @Suppress("DEPRECATION")
        cartItems = intent.getSerializableExtra("cart_items") as? List<CartItem> ?: emptyList()

        if (cartItems.isEmpty()) {
            Toast.makeText(this, "Cart is empty", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        val prefsManager = SharedPreferencesManager(this)
        val ordersApiService = RetrofitClient.createOrdersApiService()
        val ordersRepository = OrdersRepository(ordersApiService, prefsManager)
        val cartApiService = RetrofitClient.createCartApiService()
        val cartRepository = CartRepository(cartApiService, prefsManager)

        viewModel = ViewModelProvider(
            this,
            CheckoutViewModelFactory(ordersRepository, cartRepository)
        ).get(CheckoutViewModel::class.java)

        setupUI()
        observeViewModel()
    }

    private fun setupUI() {
        displayCartSummary()

        binding.backButton.setOnClickListener {
            finish()
        }

        // Delivery method — RadioButtons are now direct children of RadioGroup, so mutual exclusion works
        binding.deliveryMethodGroup.setOnCheckedChangeListener { _, checkedId ->
            when (checkedId) {
                binding.localDeliveryRadio.id -> {
                    binding.shippingAddressContainer.visibility = View.VISIBLE
                    displayCartSummary()
                }
                binding.storePickupRadio.id -> {
                    binding.shippingAddressContainer.visibility = View.GONE
                    displayCartSummary()
                }
            }
        }

        // Payment method — RadioGroup-level listener so only one fires at a time
        binding.paymentMethodGroup.setOnCheckedChangeListener { _, checkedId ->
            when (checkedId) {
                binding.codRadio.id -> {
                    binding.gcashDetails.visibility = View.GONE
                }
                binding.gcashRadio.id -> {
                    binding.gcashDetails.visibility = View.VISIBLE
                    fetchSellerGcashDetails()
                }
            }
        }

        // Receipt image picker
        binding.pickReceiptButton.setOnClickListener {
            val intent = Intent(Intent.ACTION_PICK).apply {
                type = "image/*"
            }
            receiptPickerLauncher.launch(intent)
        }

        binding.placeOrderButton.setOnClickListener {
            placeOrder()
        }

        binding.continueShoppingButton.setOnClickListener {
            startActivity(Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
            })
            finish()
        }
    }

    private fun fetchSellerGcashDetails() {
        val sellerId = cartItems.firstOrNull()?.createdBy ?: return

        binding.gcashInfoLoading.visibility = View.VISIBLE
        binding.gcashSellerInfoContainer.visibility = View.GONE
        binding.gcashNotAvailableText.visibility = View.GONE
        binding.pickReceiptButton.isEnabled = false

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.createProfileApiService().getUserProfile(sellerId)
                val profileData = response.data

                binding.gcashInfoLoading.visibility = View.GONE

                if (profileData?.gcashName != null && profileData.gcashNumber != null) {
                    binding.gcashSellerName.text = "Account Name: ${profileData.gcashName}"
                    binding.gcashSellerNumber.text = "GCash Number: ${profileData.gcashNumber}"
                    binding.gcashSellerInfoContainer.visibility = View.VISIBLE
                    binding.pickReceiptButton.isEnabled = true
                } else {
                    binding.gcashNotAvailableText.text =
                        "Seller has not set up GCash. Please choose Cash on Delivery."
                    binding.gcashNotAvailableText.visibility = View.VISIBLE
                    binding.pickReceiptButton.isEnabled = false
                }
            } catch (e: Exception) {
                binding.gcashInfoLoading.visibility = View.GONE
                binding.gcashNotAvailableText.text =
                    "Could not load seller GCash info. Please choose another payment method."
                binding.gcashNotAvailableText.visibility = View.VISIBLE
                binding.pickReceiptButton.isEnabled = false
            }
        }
    }

    private fun displayCartSummary() {
        val subtotal = cartItems.sumOf { it.price * it.quantity }
        val deliveryFee = if (binding.localDeliveryRadio.isChecked) 50.0 else 0.0
        val total = subtotal + deliveryFee

        binding.itemCount.text = "Items: ${cartItems.size}"
        binding.subtotal.text = "₱${String.format("%.2f", subtotal)}"
        binding.cartTotal.text = "₱${String.format("%.2f", total)}"
    }

    private fun placeOrder() {
        val recipientName = binding.recipientName.text.toString().trim()
        val contactNumber = binding.contactNumber.text.toString().trim()

        if (recipientName.isBlank() || contactNumber.isBlank()) {
            Toast.makeText(this, "Please fill in all required fields", Toast.LENGTH_SHORT).show()
            return
        }

        val shippingMethod = if (binding.localDeliveryRadio.isChecked) "local-delivery" else "store-pickup"
        val paymentMethod = if (binding.codRadio.isChecked) "cod" else "gcash"

        if (paymentMethod == "gcash") {
            if (selectedReceiptUri == null) {
                Toast.makeText(this, "Please upload your GCash payment receipt", Toast.LENGTH_SHORT).show()
                return
            }
            uploadReceiptAndPlaceOrder(recipientName, contactNumber, shippingMethod)
        } else {
            submitOrder(recipientName, contactNumber, shippingMethod, paymentMethod, null)
        }
    }

    private fun uploadReceiptAndPlaceOrder(
        recipientName: String,
        contactNumber: String,
        shippingMethod: String
    ) {
        val prefsManager = SharedPreferencesManager(this)
        val userId = prefsManager.getUser()?.uid ?: run {
            Toast.makeText(this, "Not logged in", Toast.LENGTH_SHORT).show()
            return
        }

        binding.placeOrderButton.isEnabled = false
        binding.loadingProgressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val uri = selectedReceiptUri!!
                val inputStream = contentResolver.openInputStream(uri)
                    ?: throw Exception("Cannot open receipt image")
                val bytes = inputStream.readBytes()
                inputStream.close()

                val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
                val fileName = getFileNameFromUri(uri) ?: "receipt_${System.currentTimeMillis()}.jpg"
                val requestBody = bytes.toRequestBody(mimeType.toMediaType())
                val part = MultipartBody.Part.createFormData("image", fileName, requestBody)

                val uploadService = RetrofitClient.createImageUploadService()
                val uploadResponse = uploadService.uploadImage(userId, part)

                if (uploadResponse.success && uploadResponse.data?.imageUrl != null) {
                    receiptImageUrl = uploadResponse.data.imageUrl
                    submitOrder(recipientName, contactNumber, shippingMethod, "gcash", receiptImageUrl)
                } else {
                    binding.loadingProgressBar.visibility = View.GONE
                    binding.placeOrderButton.isEnabled = true
                    Toast.makeText(
                        this@CheckoutActivity,
                        "Failed to upload receipt. Please try again.",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } catch (e: Exception) {
                binding.loadingProgressBar.visibility = View.GONE
                binding.placeOrderButton.isEnabled = true
                Toast.makeText(
                    this@CheckoutActivity,
                    "Receipt upload failed. Please try again.",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun submitOrder(
        recipientName: String,
        contactNumber: String,
        shippingMethod: String,
        paymentMethod: String,
        receiptUrl: String?
    ) {
        val streetAddress = binding.streetAddress.text.toString().trim()
        val barangay = binding.barangay.text.toString().trim()
        val deliveryFee = if (shippingMethod == "local-delivery") 50.0 else 0.0

        val nameParts = recipientName.split(" ", limit = 2)
        val firstName = nameParts.getOrNull(0) ?: ""
        val lastName = nameParts.getOrNull(1) ?: ""

        viewModel.placeOrder(
            cartItems = cartItems,
            firstName = firstName,
            lastName = lastName,
            email = "",
            contactNumber = contactNumber,
            streetAddress = streetAddress,
            barangay = barangay,
            shippingMethod = shippingMethod,
            paymentMethod = paymentMethod,
            deliveryFee = deliveryFee,
            receiptImageUrl = receiptUrl
        )
    }

    private fun getFileNameFromUri(uri: Uri): String? {
        return try {
            contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                cursor.moveToFirst()
                if (nameIndex >= 0) cursor.getString(nameIndex) else null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun observeViewModel() {
        viewModel.checkoutState.observe(this) { state ->
            when (state) {
                is CheckoutState.Loading -> {
                    binding.placeOrderButton.isEnabled = false
                    binding.loadingProgressBar.visibility = View.VISIBLE
                }
                is CheckoutState.Success -> {
                    binding.loadingProgressBar.visibility = View.GONE
                    binding.checkoutForm.visibility = View.GONE
                    binding.placeOrderButton.visibility = View.GONE
                    binding.successContainer.visibility = View.VISIBLE
                    binding.successOrderId.text = "Order #${state.orderId}"
                }
                is CheckoutState.Error -> {
                    binding.loadingProgressBar.visibility = View.GONE
                    binding.placeOrderButton.isEnabled = true
                    Toast.makeText(this, state.message, Toast.LENGTH_LONG).show()
                }
                CheckoutState.Idle -> {
                    binding.loadingProgressBar.visibility = View.GONE
                    binding.placeOrderButton.isEnabled = true
                }
            }
        }
    }
}
