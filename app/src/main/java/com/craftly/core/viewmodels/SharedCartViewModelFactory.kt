package com.craftly.core.viewmodels

import androidx.lifecycle.ViewModelProvider
import com.craftly.cart.data.repository.CartRepository

class SharedCartViewModelFactory(private val cartRepository: CartRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        return SharedCartViewModel(cartRepository) as T
    }
}
