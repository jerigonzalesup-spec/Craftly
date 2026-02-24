package com.craftly.products.presentation.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.products.data.models.Product
import com.craftly.products.data.repository.ProductRepository
import kotlinx.coroutines.launch

sealed class ProductDetailUiState {
    object Loading : ProductDetailUiState()
    data class Success(val product: Product) : ProductDetailUiState()
    data class Error(val message: String) : ProductDetailUiState()
}

class ProductDetailViewModel(
    private val repository: ProductRepository,
    private val productId: String
) : ViewModel() {
    private val _uiState = MutableLiveData<ProductDetailUiState>()
    val uiState: LiveData<ProductDetailUiState> = _uiState

    fun loadProduct() {
        viewModelScope.launch {
            _uiState.value = ProductDetailUiState.Loading
            try {
                val product = repository.getProductById(productId)

                // Load stats in background
                try {
                    repository.getProductsStats(listOf(productId))
                } catch (e: Exception) {
                    // Stats loading failed, but continue with product
                }

                _uiState.value = ProductDetailUiState.Success(product)
            } catch (e: Exception) {
                _uiState.value = ProductDetailUiState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun retry() {
        loadProduct()
    }
}
