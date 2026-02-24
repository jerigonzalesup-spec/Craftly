package com.craftly.checkout.presentation.viewmodels

import androidx.lifecycle.ViewModelProvider
import com.craftly.orders.data.repository.OrdersRepository

class CheckoutViewModelFactory(private val ordersRepository: OrdersRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        return CheckoutViewModel(ordersRepository) as T
    }
}
