package com.craftly.products.presentation.viewmodels

import androidx.lifecycle.LiveData
import com.craftly.core.utils.ErrorMapper
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.products.data.models.Product
import com.craftly.products.data.remote.CreateProductRequest
import com.craftly.products.data.remote.UpdateProductRequest
import com.craftly.products.data.repository.ProductRepository
import kotlinx.coroutines.launch

sealed class SellerProductsUiState {
    object Loading : SellerProductsUiState()
    data class Success(val products: List<Product>) : SellerProductsUiState()
    data class Error(val message: String) : SellerProductsUiState()
}

class SellerProductsViewModel(
    private val repository: ProductRepository,
    private val sellerId: String
) : ViewModel() {

    private val _uiState = MutableLiveData<SellerProductsUiState>(SellerProductsUiState.Loading)
    val uiState: LiveData<SellerProductsUiState> = _uiState

    private val _message = MutableLiveData<String>()
    val message: LiveData<String> = _message

    private val _isMutating = MutableLiveData(false)
    val isMutating: LiveData<Boolean> = _isMutating

    fun loadProducts() {
        viewModelScope.launch {
            _uiState.value = SellerProductsUiState.Loading
            try {
                val products = repository.getSellerProducts(sellerId)
                _uiState.value = SellerProductsUiState.Success(products)
            } catch (e: Exception) {
                _uiState.value = SellerProductsUiState.Error(ErrorMapper.friendlyMessage(e))
            }
        }
    }

    fun createProduct(request: CreateProductRequest) {
        viewModelScope.launch {
            _isMutating.value = true
            try {
                repository.createProduct(sellerId, request)
                _message.value = "Product created successfully"
                loadProducts() // refresh list
            } catch (e: Exception) {
                _message.value = "Failed to create product. Please try again."
            } finally {
                _isMutating.value = false
            }
        }
    }

    fun updateProduct(productId: String, request: UpdateProductRequest) {
        viewModelScope.launch {
            _isMutating.value = true
            try {
                repository.updateProduct(productId, sellerId, request)
                _message.value = "Product updated successfully"
                loadProducts()
            } catch (e: Exception) {
                _message.value = "Failed to update product. Please try again."
            } finally {
                _isMutating.value = false
            }
        }
    }

    fun deleteProduct(productId: String, productName: String) {
        viewModelScope.launch {
            _isMutating.value = true
            try {
                repository.deleteProduct(productId, sellerId)
                _message.value = "$productName deleted"
                // Remove from current list immediately (optimistic UI)
                val currentState = _uiState.value
                if (currentState is SellerProductsUiState.Success) {
                    _uiState.value = SellerProductsUiState.Success(
                        currentState.products.filter { it.id != productId }
                    )
                }
            } catch (e: Exception) {
                _message.value = "Error: ${e.message}"
            } finally {
                _isMutating.value = false
            }
        }
    }
}
