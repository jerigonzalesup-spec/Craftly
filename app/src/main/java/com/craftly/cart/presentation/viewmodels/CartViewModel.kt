package com.craftly.cart.presentation.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.cart.data.models.Cart
import com.craftly.cart.data.models.CartItem
import com.craftly.cart.data.repository.CartRepository
import kotlinx.coroutines.launch

sealed class CartUiState {
    object Loading : CartUiState()
    data class Success(val cart: Cart) : CartUiState()
    data class Error(val message: String) : CartUiState()
}

class CartViewModel(private val cartRepository: CartRepository) : ViewModel() {
    private val _uiState = MutableLiveData<CartUiState>(CartUiState.Loading)
    val uiState: LiveData<CartUiState> = _uiState

    private val _successMessage = MutableLiveData<String>()
    val successMessage: LiveData<String> = _successMessage

    init {
        loadCart()
    }

    fun loadCart() {
        viewModelScope.launch {
            _uiState.value = CartUiState.Loading
            val result = cartRepository.getCart()
            result.onSuccess { cart ->
                _uiState.value = CartUiState.Success(cart)
            }.onFailure { error ->
                _uiState.value = CartUiState.Error(error.message ?: "Failed to load cart")
            }
        }
    }

    fun addToCart(product: CartItem) {
        viewModelScope.launch {
            val result = cartRepository.addToCart(product)
            result.onSuccess { cart ->
                _uiState.value = CartUiState.Success(cart)
                _successMessage.value = "${product.name} added to cart"
            }.onFailure { error ->
                _uiState.value = CartUiState.Error(error.message ?: "Failed to add to cart")
            }
        }
    }

    fun updateQuantity(itemId: String, quantity: Int) {
        viewModelScope.launch {
            val result = cartRepository.updateCartItem(itemId, quantity)
            result.onSuccess { cart ->
                _uiState.value = CartUiState.Success(cart)
            }.onFailure { error ->
                _uiState.value = CartUiState.Error(error.message ?: "Failed to update cart item")
            }
        }
    }

    fun removeFromCart(itemId: String) {
        viewModelScope.launch {
            val result = cartRepository.removeFromCart(itemId)
            result.onSuccess { cart ->
                _uiState.value = CartUiState.Success(cart)
                _successMessage.value = "Item removed from cart"
            }.onFailure { error ->
                _uiState.value = CartUiState.Error(error.message ?: "Failed to remove item")
            }
        }
    }

    fun clearCart() {
        viewModelScope.launch {
            val result = cartRepository.clearCart()
            result.onSuccess { cart ->
                _uiState.value = CartUiState.Success(cart)
                _successMessage.value = "Cart cleared"
            }.onFailure { error ->
                _uiState.value = CartUiState.Error(error.message ?: "Failed to clear cart")
            }
        }
    }
}
