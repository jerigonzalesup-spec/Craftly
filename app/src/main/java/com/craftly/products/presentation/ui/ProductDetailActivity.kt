package com.craftly.products.presentation.ui

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.bumptech.glide.Glide
import com.craftly.R
import com.craftly.products.data.repository.ProductRepository
import com.craftly.products.presentation.viewmodels.ProductDetailUiState
import com.craftly.products.presentation.viewmodels.ProductDetailViewModel
import com.craftly.core.network.RetrofitClient
import com.craftly.core.viewmodels.SharedCartViewModel
import com.craftly.core.viewmodels.SharedCartViewModelFactory
import com.craftly.core.viewmodels.SharedFavoritesViewModel
import com.craftly.core.viewmodels.SharedFavoritesViewModelFactory
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.cart.data.repository.CartRepository
import com.craftly.favorites.data.repository.FavoritesRepository
import com.craftly.databinding.ActivityProductDetailBinding
import com.craftly.products.data.remote.ProductApiService

class ProductDetailActivity : AppCompatActivity() {
    private lateinit var binding: ActivityProductDetailBinding
    private lateinit var viewModel: ProductDetailViewModel
    private lateinit var cartViewModel: SharedCartViewModel
    private lateinit var favoritesViewModel: SharedFavoritesViewModel
    private var currentImageIndex = 0
    private var currentProduct: com.craftly.products.data.models.Product? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProductDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val productId = intent.getStringExtra("product_id")
        if (productId.isNullOrEmpty()) {
            Toast.makeText(this, getString(R.string.product_not_found), Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        // Initialize Product Detail ViewModel
        val apiService = RetrofitClient.createProductApiService()
        val repository = ProductRepository(apiService)
        viewModel = ViewModelProvider(
            this,
            ProductDetailViewModelFactory(repository, productId)
        ).get(ProductDetailViewModel::class.java)

        // Initialize Shared Cart ViewModel
        val cartApiService = RetrofitClient.createCartApiService()
        val prefsManager = SharedPreferencesManager(this)
        val cartRepository = CartRepository(cartApiService, prefsManager)
        cartViewModel = ViewModelProvider(
            this,
            SharedCartViewModelFactory(cartRepository)
        ).get(SharedCartViewModel::class.java)

        // Initialize Shared Favorites ViewModel
        val favoritesApiService = RetrofitClient.createFavoritesApiService()
        val favoritesRepository = FavoritesRepository(favoritesApiService, prefsManager)
        favoritesViewModel = ViewModelProvider(
            this,
            SharedFavoritesViewModelFactory(favoritesRepository)
        ).get(SharedFavoritesViewModel::class.java)

        setupUI()
        observeViewModels()

        // Load product and favorites
        viewModel.loadProduct()
        favoritesViewModel.updateFavoritedIds()
    }

    private fun setupUI() {
        binding.backButton.setOnClickListener {
            finish()
        }

        binding.prevImageButton.setOnClickListener {
            if (currentImageIndex > 0) {
                currentImageIndex--
                updateImage()
            }
        }

        binding.nextImageButton.setOnClickListener {
            if (::viewModel.isInitialized && viewModel.uiState.value is ProductDetailUiState.Success) {
                val product = (viewModel.uiState.value as ProductDetailUiState.Success).product
                if (currentImageIndex < product.images.size - 1) {
                    currentImageIndex++
                    updateImage()
                }
            }
        }
    }

    private fun observeViewModels() {
        viewModel.uiState.observe(this) { state ->
            when (state) {
                is ProductDetailUiState.Loading -> showLoading()
                is ProductDetailUiState.Success -> {
                    currentProduct = state.product
                    showProduct(state.product)
                }
                is ProductDetailUiState.Error -> showError(state.message)
            }
        }

        // Observe cart success messages
        cartViewModel.successMessage.observe(this) { message ->
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
        }

        // Observe favorites favorited IDs and update button appearance
        favoritesViewModel.favoritedIds.observe(this) { ids ->
            currentProduct?.let { product ->
                updateFavoriteButtonAppearance(ids.contains(product.id))
            }
        }

        // Observe favorite success/error messages
        favoritesViewModel.successMessage.observe(this) { message ->
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
        }
    }

    private fun showLoading() {
        binding.loadingProgressBar.visibility = View.VISIBLE
        binding.productContent.visibility = View.GONE
        binding.errorMessage.visibility = View.GONE
    }

    private fun showProduct(product: com.craftly.products.data.models.Product) {
        try {
            binding.loadingProgressBar.visibility = View.GONE
            binding.errorMessage.visibility = View.GONE
            binding.productContent.visibility = View.VISIBLE

            // Images carousel
            if (product.images != null && product.images.isNotEmpty()) {
                updateImage()
            }

            // Product info
            binding.productName.text = product.name.ifEmpty { getString(R.string.product_unknown) }
            binding.productPrice.text = String.format("₱ %.0f", product.price)
            binding.productCategory.text = product.category.ifEmpty { getString(R.string.product_uncategorized) }

            // Rating
            if ((product.reviewCount ?: 0) > 0) {
                binding.ratingText.text = String.format(
                    "★ %.1f (${product.reviewCount} reviews)",
                    product.averageRating ?: 0.0
                )
            } else {
                binding.ratingText.text = getString(R.string.product_rating_no_ratings)
            }

            // Sales count
            binding.salesCount.apply {
                if ((product.salesCount ?: 0) > 0) {
                    text = String.format(getString(R.string.product_sales_format), product.salesCount)
                    visibility = View.VISIBLE
                } else {
                    visibility = View.GONE
                }
            }

            // Seller
            binding.sellerName.text = String.format(getString(R.string.product_seller_format), product.sellerName ?: getString(R.string.product_unknown_seller))

            // Description
            binding.productDescription.text = product.description.ifEmpty { getString(R.string.product_no_description) }

            // Materials
            binding.materialsList.text = product.materialsUsed.ifEmpty { getString(R.string.product_no_materials) }

            // Delivery badges
            binding.shippingBadge.visibility = if (product.allowShipping) View.VISIBLE else View.GONE
            binding.pickupBadge.visibility = if (product.allowPickup) View.VISIBLE else View.GONE

            // Stock
            binding.stockStatus.text = if (product.stock > 0) {
                String.format(getString(R.string.product_stock_format), product.stock)
            } else {
                getString(R.string.product_out_of_stock)
            }

            // Buttons
            binding.addToCartButton.setOnClickListener {
                cartViewModel.quickAddToCart(product, quantity = 1)
            }

            binding.buyNowButton.setOnClickListener {
                // Add to cart first, then proceed to checkout
                cartViewModel.quickAddToCart(product, quantity = 1)
                Toast.makeText(
                    this,
                    getString(R.string.product_added_to_cart),
                    Toast.LENGTH_SHORT
                ).show()
                // TODO: Navigate to checkout screen when created
            }

            binding.favoriteButton.setOnClickListener {
                val isFavorited = favoritesViewModel.favoritedIds.value?.contains(product.id) ?: false
                if (isFavorited) {
                    favoritesViewModel.removeFromFavorites(product.id, product.name)
                } else {
                    favoritesViewModel.addToFavorites(product.id, product.name)
                }
            }

            // Update favorite button appearance
            val isFavorited = favoritesViewModel.favoritedIds.value?.contains(product.id) ?: false
            updateFavoriteButtonAppearance(isFavorited)
        } catch (e: Exception) {
            android.util.Log.e("ProductDetailActivity", "Error showing product: ${e.message}", e)
            showError(e.message ?: getString(R.string.error_generic))
        }
    }

    private fun showError(message: String) {
        binding.loadingProgressBar.visibility = View.GONE
        binding.productContent.visibility = View.GONE
        binding.errorMessage.visibility = View.VISIBLE
        android.widget.Toast.makeText(this, String.format(getString(R.string.product_error_display), message), android.widget.Toast.LENGTH_LONG).show()
    }

    private fun updateImage() {
        try {
            if (::viewModel.isInitialized && viewModel.uiState.value is ProductDetailUiState.Success) {
                val product = (viewModel.uiState.value as ProductDetailUiState.Success).product
                if (product.images != null && product.images.isNotEmpty() && currentImageIndex < product.images.size) {
                    Glide.with(this)
                        .load(product.images[currentImageIndex])
                        .centerCrop()
                        .into(binding.productImage)
                    binding.imageCounter.text = "${currentImageIndex + 1}/${product.images.size}"
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("ProductDetailActivity", "Error updating image: ${e.message}", e)
        }
    }

    private fun updateFavoriteButtonAppearance(isFavorited: Boolean) {
        binding.favoriteButton.text = if (isFavorited) getString(R.string.favorite_button_labeled) else getString(R.string.favorite_button_unlabeled)
    }
}

class ProductDetailViewModelFactory(
    private val repository: ProductRepository,
    private val productId: String
) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return ProductDetailViewModel(repository, productId) as T
    }
}
