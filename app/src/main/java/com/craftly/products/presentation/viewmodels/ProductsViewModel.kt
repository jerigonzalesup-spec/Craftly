package com.craftly.products.presentation.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.Observer
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.products.data.models.Product
import com.craftly.products.data.repository.ProductRepository
import kotlinx.coroutines.launch

sealed class ProductsUiState {
    object Loading : ProductsUiState()
    data class Success(val products: List<Product>) : ProductsUiState()
    data class Error(val message: String) : ProductsUiState()
}

class ProductsViewModel(private val repository: ProductRepository) : ViewModel() {
    private val _uiState = MutableLiveData<ProductsUiState>()
    val uiState: LiveData<ProductsUiState> = _uiState

    val searchQuery = MutableLiveData<String>("")
    val selectedCategory = MutableLiveData<String>("all")
    val sortBy = MutableLiveData<String>("newest") // 'newest','price-asc','price-desc'

    private val _filteredProducts = MutableLiveData<List<Product>>()
    val filteredProducts: LiveData<List<Product>> = _filteredProducts

    private var allProducts = listOf<Product>()

    init {
        // Observe all filter changes to update filtered products
        val filterObserver = Observer<Any> {
            updateFilteredProducts()
        }
        searchQuery.observeForever(filterObserver)
        selectedCategory.observeForever(filterObserver)
        sortBy.observeForever(filterObserver)
    }

    private fun updateFilteredProducts() {
        try {
            val query = searchQuery.value ?: ""
            val category = selectedCategory.value ?: "all"
            val sort = sortBy.value ?: "newest"
            
            if (allProducts == null) {
                _filteredProducts.value = emptyList()
                return
            }
            
            val filtered = repository.applyFiltersAndSort(allProducts, query, category, sort)
            _filteredProducts.value = filtered ?: emptyList()
        } catch (e: Exception) {
            android.util.Log.e("ProductsViewModel", "Error filtering products: ${e.message}", e)
            _filteredProducts.value = allProducts ?: emptyList()
        }
    }

    fun loadProducts() {
        viewModelScope.launch {
            _uiState.value = ProductsUiState.Loading
            try {
                val products = repository.getAllProducts()
                if (products == null) {
                    _uiState.value = ProductsUiState.Error("No products returned from API")
                    return@launch
                }
                
                allProducts = products
                updateFilteredProducts()

                // Load stats for first 20 visible products
                if (products.isNotEmpty()) {
                    val firstBatchIds = products.take(20).mapNotNull { if (it.id.isNotBlank()) it.id else null }
                    if (firstBatchIds.isNotEmpty()) {
                        try {
                            val stats = repository.getProductsStats(firstBatchIds)
                            // Stats are merged into cache, no need to do anything else
                            android.util.Log.d("ProductsViewModel", "Stats loaded: ${stats.size} products")
                        } catch (e: Exception) {
                            // Stats loading failed, continue with products (fallback)
                            android.util.Log.w("ProductsViewModel", "Stats loading failed: ${e.message}")
                        }
                    }
                }

                _uiState.value = ProductsUiState.Success(products)
            } catch (e: Exception) {
                android.util.Log.e("ProductsViewModel", "Error loading products: ${e.message}", e)
                val errorMessage = e.message ?: "Unknown error occurred"
                _uiState.value = ProductsUiState.Error(errorMessage)
            }
        }
    }

    fun updateSearchQuery(query: String) {
        searchQuery.value = query
    }

    fun updateCategory(category: String) {
        selectedCategory.value = category
    }

    fun updateSort(sort: String) {
        sortBy.value = sort
    }

    fun retry() {
        loadProducts()
    }
}
