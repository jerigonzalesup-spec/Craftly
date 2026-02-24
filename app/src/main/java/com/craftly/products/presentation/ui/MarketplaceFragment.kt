package com.craftly.products.presentation.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.GridLayoutManager
import com.craftly.products.data.remote.ProductApiService
import com.craftly.products.data.repository.ProductRepository
import com.craftly.products.presentation.viewmodels.ProductsUiState
import com.craftly.products.presentation.viewmodels.ProductsViewModel
import com.craftly.core.network.RetrofitClient
import com.craftly.core.viewmodels.SharedCartViewModel
import com.craftly.core.viewmodels.SharedCartViewModelFactory
import com.craftly.core.viewmodels.SharedFavoritesViewModel
import com.craftly.core.viewmodels.SharedFavoritesViewModelFactory
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.cart.data.repository.CartRepository
import com.craftly.favorites.data.repository.FavoritesRepository
import com.craftly.databinding.FragmentMarketplaceBinding

class MarketplaceFragment : Fragment() {
    private lateinit var binding: FragmentMarketplaceBinding
    private lateinit var viewModel: ProductsViewModel
    private lateinit var cartViewModel: SharedCartViewModel
    private lateinit var favoritesViewModel: SharedFavoritesViewModel
    private lateinit var adapter: ProductAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentMarketplaceBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Initialize Products ViewModel
        val apiService = RetrofitClient.createProductApiService()
        val repository = ProductRepository(apiService)
        viewModel = ViewModelProvider(
            this,
            ProductsViewModelFactory(repository)
        ).get(ProductsViewModel::class.java)

        // Initialize Shared Cart ViewModel
        val cartApiService = RetrofitClient.createCartApiService()
        val prefsManager = SharedPreferencesManager(requireContext())
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

        // Load products and favorites
        viewModel.loadProducts()
        favoritesViewModel.updateFavoritedIds()
    }

    private fun setupUI() {
        // Setup RecyclerView grid layout (2 columns)
        binding.productsRecyclerView.layoutManager = GridLayoutManager(requireContext(), 2)

        // Initialize adapter with add-to-cart functionality
        adapter = ProductAdapter(
            mutableListOf(),
            onProductClick = { product ->
                val intent = Intent(requireContext(), ProductDetailActivity::class.java)
                intent.putExtra("product_id", product.id)
                startActivity(intent)
            },
            onAddToCartClick = { product ->
                // Actually call the shared cart ViewModel
                cartViewModel.quickAddToCart(product, quantity = 1)
            },
            onFavoriteClick = { product, isFavoriting ->
                if (isFavoriting) {
                    favoritesViewModel.addToFavorites(product.id, product.name)
                } else {
                    favoritesViewModel.removeFromFavorites(product.id, product.name)
                }
            }
        )
        binding.productsRecyclerView.adapter = adapter

        // Setup category spinner
        val categories = listOf("All", "Crafts", "Accessories", "Home Decor", "Gifts", "Jewelry", "Clothing", "Pottery", "Art & Collectibles")
        val categoryAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, categories)
        categoryAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.categorySpinner.adapter = categoryAdapter

        binding.categorySpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val category = if (position == 0) "all" else categories[position].lowercase().replace(" ", "-")
                viewModel.updateCategory(category)
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        // Setup sort spinner
        val sortOptions = listOf("Newest", "Price: Low to High", "Price: High to Low")
        val sortValues = listOf("newest", "price-asc", "price-desc")
        val sortAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, sortOptions)
        sortAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.sortSpinner.adapter = sortAdapter

        binding.sortSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                viewModel.updateSort(sortValues[position])
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        // Setup search
        binding.searchEditText.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}

            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                viewModel.updateSearchQuery(s.toString())
            }

            override fun afterTextChanged(s: android.text.Editable?) {}
        })

        // Setup retry button
        binding.retryButton.setOnClickListener {
            viewModel.retry()
        }
    }

    private fun observeViewModels() {
        viewModel.uiState.observe(viewLifecycleOwner) { state ->
            when (state) {
                is ProductsUiState.Loading -> showLoading()
                is ProductsUiState.Success -> showProducts(state.products)
                is ProductsUiState.Error -> showError(state.message)
            }
        }

        viewModel.filteredProducts.observe(viewLifecycleOwner) { filteredProducts ->
            if (resources.displayMetrics.widthPixels > 600) {
                // Hide loading when we have filtered results
                binding.loadingContainer.visibility = View.GONE
            }
            // Update adapter with filtered products
            adapter.updateData(filteredProducts)

            // Show/hide empty state
            if (filteredProducts.isEmpty()) {
                binding.emptyStateContainer.visibility = View.VISIBLE
                binding.productsRecyclerView.visibility = View.GONE
            } else {
                binding.emptyStateContainer.visibility = View.GONE
                binding.productsRecyclerView.visibility = View.VISIBLE
            }
        }

        // Observe cart success messages
        cartViewModel.successMessage.observe(viewLifecycleOwner) { message ->
            Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
        }

        // Observe favorites favorited IDs
        favoritesViewModel.favoritedIds.observe(viewLifecycleOwner) { ids ->
            adapter.updateFavoritedIds(ids)
        }

        // Observe favorite success/error messages
        favoritesViewModel.successMessage.observe(viewLifecycleOwner) { message ->
            Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
        }
    }

    private fun showLoading() {
        binding.loadingContainer.visibility = View.VISIBLE
        binding.productsRecyclerView.visibility = View.GONE
        binding.errorContainer.visibility = View.GONE
        binding.emptyStateContainer.visibility = View.GONE
    }

    private fun showProducts(products: List<com.craftly.products.data.models.Product>) {
        binding.loadingContainer.visibility = View.GONE
        binding.errorContainer.visibility = View.GONE
        binding.emptyStateContainer.visibility = View.GONE
    }

    private fun showError(message: String) {
        binding.loadingProgressBar.visibility = View.GONE
        binding.productsRecyclerView.visibility = View.GONE
        binding.emptyStateContainer.visibility = View.GONE
        binding.errorContainer.visibility = View.VISIBLE
        binding.errorMessage.text = message
    }
}

class ProductsViewModelFactory(private val repository: ProductRepository) :
    androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return ProductsViewModel(repository) as T
    }
}
