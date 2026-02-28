package com.craftly.products.presentation.ui

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.bumptech.glide.Glide
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.core.network.RetrofitClient
import com.craftly.databinding.ActivityProductFormBinding
import com.craftly.products.data.models.Product
import com.craftly.products.data.remote.CreateProductRequest
import com.craftly.products.data.remote.UpdateProductRequest
import com.craftly.products.data.repository.ProductRepository
import com.craftly.products.presentation.viewmodels.SellerProductsUiState
import com.craftly.products.presentation.viewmodels.SellerProductsViewModel
import kotlinx.coroutines.launch

class ProductFormActivity : AppCompatActivity() {

    private lateinit var binding: ActivityProductFormBinding
    private lateinit var viewModel: SellerProductsViewModel
    private lateinit var userId: String

    private var editingProduct: Product? = null
    private var isSaving = false

    companion object {
        const val EXTRA_PRODUCT = "PRODUCT"

        // Categories matching the web app
        private val CATEGORIES = listOf(
            "Pottery", "Jewelry", "Textiles", "Woodwork", "Paintings",
            "Sculptures", "Glasswork", "Leatherwork", "Metalwork",
            "Embroidery", "Candles", "Soaps", "Bags", "Clothing",
            "Home Decor", "Garden", "Food & Beverage", "Toys", "Other"
        )

        fun createIntent(context: Context, product: Product? = null): Intent =
            Intent(context, ProductFormActivity::class.java).apply {
                product?.let { putExtra(EXTRA_PRODUCT, it) }
            }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProductFormBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val prefsManager = SharedPreferencesManager(this)
        userId = prefsManager.getUser()?.uid ?: run {
            Toast.makeText(this, "Please log in again", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        @Suppress("DEPRECATION")
        editingProduct = intent.getSerializableExtra(EXTRA_PRODUCT) as? Product

        setupViewModel()
        setupCategoryDropdown()
        setupImagePreview()
        setupContent()
        observeViewModel()

        binding.backButton.setOnClickListener { finish() }
        binding.saveButton.setOnClickListener { save() }
        binding.saveButtonBottom.setOnClickListener { save() }
    }

    private fun setupViewModel() {
        val apiService = RetrofitClient.createProductApiService()
        val repository = ProductRepository(apiService)
        val factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T =
                SellerProductsViewModel(repository, userId) as T
        }
        viewModel = ViewModelProvider(this, factory)[SellerProductsViewModel::class.java]
    }

    private fun setupCategoryDropdown() {
        val adapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, CATEGORIES)
        binding.productCategoryInput.setAdapter(adapter)
        binding.productCategoryInput.threshold = 1
    }

    private fun setupImagePreview() {
        // Live-preview image as the URL is typed (debounced on focus-lost)
        binding.productImageUrlInput.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) loadImagePreview()
        }
        binding.previewImageButton.setOnClickListener { loadImagePreview() }
    }

    private fun loadImagePreview() {
        val url = binding.productImageUrlInput.text.toString().trim()
        if (url.isEmpty()) {
            binding.productImagePreview.visibility = View.GONE
            binding.noImagePlaceholder.visibility = View.VISIBLE
            return
        }
        binding.productImagePreview.visibility = View.VISIBLE
        binding.noImagePlaceholder.visibility = View.GONE
        Glide.with(this).load(url).centerCrop().into(binding.productImagePreview)
    }

    private fun setupContent() {
        val product = editingProduct
        if (product != null) {
            binding.formTitle.text = "Edit Product"
            binding.productNameInput.setText(product.name)
            binding.productDescriptionInput.setText(product.description)
            binding.productPriceInput.setText(product.price.toString())
            binding.productStockInput.setText(product.stock.toString())
            binding.productCategoryInput.setText(product.category)
            binding.productMaterialsInput.setText(product.materialsUsed)
            if (product.images.isNotEmpty()) {
                binding.productImageUrlInput.setText(product.images[0])
                loadImagePreview()
            }
            binding.allowShippingCheckbox.isChecked = product.allowShipping
            binding.allowPickupCheckbox.isChecked = product.allowPickup
        } else {
            binding.formTitle.text = "Add Product"
            // Sensible defaults from profile settings would be ideal; for now keep unchecked
            binding.allowShippingCheckbox.isChecked = true
        }
    }

    private fun observeViewModel() {
        viewModel.uiState.observe(this) { state ->
            when (state) {
                is SellerProductsUiState.Loading -> {
                    // handled via isSaving flag above
                }
                is SellerProductsUiState.Success -> {
                    if (isSaving) {
                        // Save completed — return to list
                        setResult(RESULT_OK)
                        finish()
                    }
                }
                is SellerProductsUiState.Error -> {
                    if (isSaving) {
                        isSaving = false
                        hideSavingProgress()
                        Toast.makeText(this, state.message, Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        viewModel.message.observe(this) { msg ->
            if (msg.isNotBlank()) {
                Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
                if (isSaving) {
                    // Message means the save was processed (success or fail)
                    setResult(RESULT_OK)
                    finish()
                }
            }
        }
    }

    private fun save() {
        val name     = binding.productNameInput.text.toString().trim()
        val desc     = binding.productDescriptionInput.text.toString().trim()
        val priceStr = binding.productPriceInput.text.toString().trim()
        val category = binding.productCategoryInput.text.toString().trim()
        val stockStr = binding.productStockInput.text.toString().trim()
        val materials = binding.productMaterialsInput.text.toString().trim()
        val imageUrl  = binding.productImageUrlInput.text.toString().trim()
        val allowShipping = binding.allowShippingCheckbox.isChecked
        val allowPickup   = binding.allowPickupCheckbox.isChecked

        // Validate required fields
        var hasError = false
        if (name.isEmpty()) {
            binding.productNameInput.error = "Required"
            hasError = true
        }
        if (desc.isEmpty()) {
            binding.productDescriptionInput.error = "Required"
            hasError = true
        }
        if (priceStr.isEmpty()) {
            binding.productPriceInput.error = "Required"
            hasError = true
        }
        if (category.isEmpty()) {
            binding.productCategoryInput.error = "Required"
            hasError = true
        }
        if (stockStr.isEmpty()) {
            binding.productStockInput.error = "Required"
            hasError = true
        }
        if (hasError) return

        val price = priceStr.toDoubleOrNull() ?: run {
            binding.productPriceInput.error = "Invalid number"
            return
        }
        val stock = stockStr.toIntOrNull() ?: run {
            binding.productStockInput.error = "Invalid number"
            return
        }
        if (price <= 0) {
            binding.productPriceInput.error = "Must be greater than 0"
            return
        }
        if (stock < 0) {
            binding.productStockInput.error = "Cannot be negative"
            return
        }

        val images = if (imageUrl.isNotEmpty()) listOf(imageUrl) else emptyList()

        isSaving = true
        showSavingProgress()

        if (editingProduct == null) {
            viewModel.createProduct(
                CreateProductRequest(name, desc, price, category, stock, materials, allowShipping, allowPickup, images)
            )
        } else {
            viewModel.updateProduct(
                editingProduct!!.id,
                UpdateProductRequest(name, desc, price, category, stock, materials, allowShipping, allowPickup, images)
            )
        }
    }

    private fun showSavingProgress() {
        binding.savingProgressBar.visibility = View.VISIBLE
        binding.saveButton.isEnabled = false
        binding.saveButtonBottom.isEnabled = false
    }

    private fun hideSavingProgress() {
        binding.savingProgressBar.visibility = View.GONE
        binding.saveButton.isEnabled = true
        binding.saveButtonBottom.isEnabled = true
    }
}
