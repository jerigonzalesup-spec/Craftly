package com.craftly.products.presentation.ui

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
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
import com.craftly.R
import com.craftly.databinding.FragmentMarketplaceBinding

class MarketplaceFragment : Fragment() {
    private lateinit var binding: FragmentMarketplaceBinding
    private lateinit var viewModel: ProductsViewModel
    private lateinit var cartViewModel: SharedCartViewModel
    private lateinit var favoritesViewModel: SharedFavoritesViewModel
    private lateinit var adapter: ProductAdapter
    private lateinit var prefsManager: SharedPreferencesManager

    private val searchHandler = Handler(Looper.getMainLooper())
    private var searchRunnable: Runnable? = null

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

        // Initialize Shared Cart ViewModel — scoped to Activity so CartFragment shares same instance
        val cartApiService = RetrofitClient.createCartApiService()
        prefsManager = SharedPreferencesManager(requireContext())
        val cartRepository = CartRepository(cartApiService, prefsManager)
        cartViewModel = ViewModelProvider(
            requireActivity(),
            SharedCartViewModelFactory(cartRepository)
        ).get(SharedCartViewModel::class.java)

        // Initialize Shared Favorites ViewModel — scoped to Activity so FavoritesFragment shares same instance
        val favoritesApiService = RetrofitClient.createFavoritesApiService()
        val favoritesRepository = FavoritesRepository(favoritesApiService, prefsManager)
        favoritesViewModel = ViewModelProvider(
            requireActivity(),
            SharedFavoritesViewModelFactory(favoritesRepository)
        ).get(SharedFavoritesViewModel::class.java)

        setupUI()
        observeViewModels()

        // Load products and favorites
        viewModel.loadProducts()
        favoritesViewModel.updateFavoritedIds()
    }

    private fun setupUI() {
        // Setup RecyclerView grid layout (2 columns) with slide-in animation
        binding.productsRecyclerView.layoutManager = GridLayoutManager(requireContext(), 2)
        val layoutAnim = android.view.animation.AnimationUtils.loadLayoutAnimation(
            requireContext(), R.anim.layout_fall_down
        )
        binding.productsRecyclerView.layoutAnimation = layoutAnim

        // Initialize adapter with add-to-cart functionality
        adapter = ProductAdapter(
            mutableListOf(),
            onProductClick = { product ->
                val intent = Intent(requireContext(), ProductDetailActivity::class.java)
                intent.putExtra("product_id", product.id)
                startActivity(intent)
            },
            onAddToCartClick = { product ->
                val currentUserId = prefsManager.getUser()?.uid
                if (!product.createdBy.isNullOrEmpty() && product.createdBy == currentUserId) {
                    Toast.makeText(requireContext(), "You cannot add your own product to your cart", Toast.LENGTH_SHORT).show()
                } else {
                    // Actually call the shared cart ViewModel
                    cartViewModel.quickAddToCart(product, quantity = 1)
                }
            },
            onFavoriteClick = { product, isFavoriting ->
                val currentUserId = prefsManager.getUser()?.uid
                if (!product.createdBy.isNullOrEmpty() && product.createdBy == currentUserId) {
                    Toast.makeText(requireContext(), "You cannot favorite your own product", Toast.LENGTH_SHORT).show()
                } else if (isFavoriting) {
                    favoritesViewModel.addToFavorites(product.id, product.name)
                } else {
                    favoritesViewModel.removeFromFavorites(product.id, product.name)
                }
            },
            currentUserId = prefsManager.getUser()?.uid,
            onManageClick = { product ->
                val intent = Intent(requireContext(), SellerProductsActivity::class.java)
                intent.putExtra("product_id", product.id)
                startActivity(intent)
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

        // Setup search with 400ms debounce
        binding.searchEditText.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}

            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                searchRunnable?.let { searchHandler.removeCallbacks(it) }
                searchRunnable = Runnable { viewModel.updateSearchQuery(s.toString()) }
                searchHandler.postDelayed(searchRunnable!!, 400)
            }

            override fun afterTextChanged(s: android.text.Editable?) {}
        })

        // Pull-to-refresh
        binding.swipeRefreshLayout.setOnRefreshListener { viewModel.retry() }

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

            // Show/hide empty state + trigger layout animation on first load
            if (filteredProducts.isEmpty()) {
                binding.emptyStateContainer.visibility = View.VISIBLE
                binding.productsRecyclerView.visibility = View.GONE
            } else {
                binding.emptyStateContainer.visibility = View.GONE
                binding.productsRecyclerView.visibility = View.VISIBLE
                binding.productsRecyclerView.scheduleLayoutAnimation()
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

    private fun fadeInView(view: View) {
        if (view.visibility != View.VISIBLE) {
            view.alpha = 0f
            view.visibility = View.VISIBLE
            view.animate().alpha(1f).setDuration(250).start()
        }
    }

    private fun hideView(view: View) {
        view.visibility = View.GONE
    }

    private fun showLoading() {
        fadeInView(binding.loadingContainer)
        hideView(binding.productsRecyclerView)
        hideView(binding.errorContainer)
        hideView(binding.emptyStateContainer)
    }

    private fun showProducts(products: List<com.craftly.products.data.models.Product>) {
        binding.swipeRefreshLayout.isRefreshing = false
        hideView(binding.loadingContainer)
        hideView(binding.errorContainer)
        hideView(binding.emptyStateContainer)
    }

    private fun showError(message: String) {
        binding.swipeRefreshLayout.isRefreshing = false
        hideView(binding.loadingContainer)
        hideView(binding.productsRecyclerView)
        hideView(binding.emptyStateContainer)
        fadeInView(binding.errorContainer)
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
