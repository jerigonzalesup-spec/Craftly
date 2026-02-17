package com.craftly.app.presentation.ui.fragments

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.craftly.app.R
import com.craftly.app.data.model.Product
import com.craftly.app.data.repository.ProductRepository
import com.craftly.app.presentation.auth.AuthManager
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch

class HomeFragment : Fragment() {

    private val TAG = "HomeFragment"
    private val productRepository = ProductRepository()
    private lateinit var productsRecyclerView: RecyclerView
    private lateinit var emptyStateView: LinearLayout
    private lateinit var loadingProgressBar: ProgressBar
    private lateinit var greetingTextView: TextView
    private lateinit var subtitleTextView: TextView
    private lateinit var searchEditText: TextInputEditText
    private lateinit var categoryChipsContainer: LinearLayout
    private var productsAdapter: ProductAdapter? = null
    private var allProducts: List<Product> = emptyList()

    // Category list
    private val categories = listOf(
        "All" to null,
        "Crafts" to "crafts",
        "Home Decor" to "home-decor",
        "Accessories" to "accessories",
        "Gifts" to "gifts"
    )

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        Log.d(TAG, "onCreateView called")
        return inflater.inflate(R.layout.fragment_home, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Log.d(TAG, "onViewCreated called")

        // Initialize views
        productsRecyclerView = view.findViewById(R.id.productsRecyclerView)
        emptyStateView = view.findViewById(R.id.emptyStateView)
        loadingProgressBar = view.findViewById(R.id.loadingProgressBar)
        greetingTextView = view.findViewById(R.id.greetingTextView)
        subtitleTextView = view.findViewById(R.id.subtitleTextView)
        searchEditText = view.findViewById(R.id.searchEditText)
        categoryChipsContainer = view.findViewById(R.id.categoryChipsContainer)

        // Setup UI
        setupGreeting()
        setupRecyclerView()
        setupCategoryChips()
        setupSearchListener()
        loadProducts()
    }

    private fun setupGreeting() {
        Log.d(TAG, "Setting up greeting")
        val currentUser = AuthManager.getCurrentUser(requireContext())
        val userName = currentUser?.fullName?.split(" ")?.firstOrNull() ?: "User"
        greetingTextView.text = "Hi $userName! Welcome back"
    }

    private fun setupRecyclerView() {
        Log.d(TAG, "Setting up RecyclerView")
        productsRecyclerView.layoutManager = GridLayoutManager(requireContext(), 2)
        productsAdapter = ProductAdapter(emptyList())
        productsRecyclerView.adapter = productsAdapter
        Log.d(TAG, "RecyclerView setup complete")
    }

    private fun setupCategoryChips() {
        Log.d(TAG, "Setting up category chips")
        categoryChipsContainer.removeAllViews()

        categories.forEach { (name, categoryValue) ->
            val chip = Chip(requireContext()).apply {
                text = name
                isCheckable = true
                if (name == "All") {
                    isChecked = true
                }

                setOnCheckedChangeListener { _, isChecked ->
                    if (isChecked) {
                        Log.d(TAG, "Category selected: $name")
                        filterByCategory(categoryValue)
                        // Uncheck other chips
                        for (i in 0 until categoryChipsContainer.childCount) {
                            val otherChip = categoryChipsContainer.getChildAt(i) as? Chip
                            if (otherChip != this && otherChip?.isChecked == true) {
                                otherChip.isChecked = false
                            }
                        }
                    }
                }
            }
            categoryChipsContainer.addView(chip)
        }
    }

    private fun setupSearchListener() {
        Log.d(TAG, "Setting up search listener")
        searchEditText.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}

            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val query = s.toString().trim()
                if (query.isEmpty()) {
                    Log.d(TAG, "Search cleared, showing all products")
                    displayProducts(allProducts)
                } else {
                    Log.d(TAG, "Searching for: $query")
                    searchProducts(query)
                }
            }

            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun loadProducts() {
        Log.d(TAG, "loadProducts called - starting API request")
        showLoading(true)

        lifecycleScope.launch {
            try {
                Log.d(TAG, "Calling productRepository.getAllProducts()")
                val result = productRepository.getAllProducts()

                result.onSuccess { products ->
                    Log.d(TAG, "API Success! Received ${products.size} products")
                    allProducts = products
                    displayProducts(products)
                    showLoading(false)
                }

                result.onFailure { error ->
                    Log.e(TAG, "API Error: ${error.message}", error)
                    showLoading(false)
                    showError("Failed to load products: ${error.message}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Exception while loading products: ${e.message}", e)
                showLoading(false)
                showError("An error occurred: ${e.message}")
            }
        }
    }

    private fun displayProducts(products: List<Product>) {
        Log.d(TAG, "Displaying ${products.size} products")

        if (products.isEmpty()) {
            Log.w(TAG, "No products to display")
            emptyStateView.visibility = View.VISIBLE
            productsRecyclerView.visibility = View.GONE
        } else {
            emptyStateView.visibility = View.GONE
            productsRecyclerView.visibility = View.VISIBLE
            productsAdapter?.updateProducts(products)
        }
    }

    private fun filterByCategory(categoryValue: String?) {
        Log.d(TAG, "Filtering by category: $categoryValue")

        val filtered = if (categoryValue == null) {
            allProducts
        } else {
            allProducts.filter { it.category == categoryValue }
        }

        displayProducts(filtered)

        if (filtered.isEmpty()) {
            Toast.makeText(requireContext(), "No products in this category", Toast.LENGTH_SHORT).show()
        }
    }

    private fun searchProducts(query: String) {
        val searchQuery = query.lowercase()
        val filtered = allProducts.filter { product ->
            product.name.lowercase().contains(searchQuery) ||
            product.category.lowercase().contains(searchQuery) ||
            product.description.lowercase().contains(searchQuery)
        }

        Log.d(TAG, "Search results: ${filtered.size} products found")
        displayProducts(filtered)
    }

    private fun showLoading(isLoading: Boolean) {
        Log.d(TAG, "Show loading: $isLoading")
        loadingProgressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
    }

    private fun showError(message: String) {
        Log.e(TAG, "Showing error: $message")
        Toast.makeText(
            requireContext(),
            message,
            Toast.LENGTH_LONG
        ).show()
        emptyStateView.visibility = View.VISIBLE
        productsRecyclerView.visibility = View.GONE
    }
}
