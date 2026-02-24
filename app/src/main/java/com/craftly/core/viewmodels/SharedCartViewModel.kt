package com.craftly.core.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.cart.data.models.CartItem
import com.craftly.cart.data.repository.CartRepository
import kotlinx.coroutines.launch

class SharedCartViewModel(private val cartRepository: CartRepository) : ViewModel() {

    // Expose cart state for all fragments/activities
    val cartUiState = MutableLiveData<com.craftly.cart.presentation.viewmodels.CartUiState>(
        com.craftly.cart.presentation.viewmodels.CartUiState.Loading
    )

    val successMessage = MutableLiveData<String>()

    // Quick add-to-cart that persists to backend
    fun quickAddToCart(product: com.craftly.products.data.models.Product, quantity: Int = 1) {
        viewModelScope.launch {
            try {
                val cartItem = CartItem(
                    productId = product.id,
                    name = product.name,
                    price = product.price,
                    quantity = quantity,
                    image = product.images.firstOrNull() ?: "",
                    stock = product.stock,
                    category = product.category,
                    createdBy = product.createdBy
                )

                val result = cartRepository.addToCart(cartItem)
                result.onSuccess { cart ->
                    cartUiState.value = com.craftly.cart.presentation.viewmodels.CartUiState.Success(cart)
                    successMessage.value = "${product.name} added to cart!"
                }.onFailure { error ->
                    successMessage.value = "Failed to add to cart: ${error.message}"
                }
            } catch (e: Exception) {
                successMessage.value = "Error: ${e.message}"
            }
        }
    }

    fun refreshCart() {
        viewModelScope.launch {
            cartUiState.value = com.craftly.cart.presentation.viewmodels.CartUiState.Loading
            val result = cartRepository.getCart()
            result.onSuccess { cart ->
                cartUiState.value = com.craftly.cart.presentation.viewmodels.CartUiState.Success(cart)
            }.onFailure { error ->
                cartUiState.value = com.craftly.cart.presentation.viewmodels.CartUiState.Error(
                    error.message ?: "Failed to refresh cart"
                )
            }
        }
    }
}
