package com.craftly.checkout.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.craftly.cart.data.repository.CartRepository
import com.craftly.orders.data.repository.OrdersRepository

class CheckoutViewModelFactory(
    private val ordersRepository: OrdersRepository,
    private val cartRepository: CartRepository
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return CheckoutViewModel(ordersRepository, cartRepository) as T
    }
}
