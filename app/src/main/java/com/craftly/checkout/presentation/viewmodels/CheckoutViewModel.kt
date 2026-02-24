package com.craftly.checkout.presentation.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.orders.data.models.CreateOrderRequest
import com.craftly.orders.data.models.Order
import com.craftly.orders.data.repository.OrdersRepository
import kotlinx.coroutines.launch

sealed class CheckoutUiState {
    object Loading : CheckoutUiState()
    data class Review(val subtotal: Double, val total: Double) : CheckoutUiState()
    data class Success(val order: Order) : CheckoutUiState()
    data class Error(val message: String) : CheckoutUiState()
}

class CheckoutViewModel(private val ordersRepository: OrdersRepository) : ViewModel() {

    private val _uiState = MutableLiveData<CheckoutUiState>(CheckoutUiState.Loading)
    val uiState: LiveData<CheckoutUiState> = _uiState

    private val _successMessage = MutableLiveData<String>()
    val successMessage: LiveData<String> = _successMessage

    private var selectedPaymentMethod = "cod"
    private var selectedAddressId = ""

    fun setPaymentMethod(method: String) {
        selectedPaymentMethod = method
    }

    fun setAddress(addressId: String) {
        selectedAddressId = addressId
    }

    fun placeOrder(orderRequest: CreateOrderRequest) {
        viewModelScope.launch {
            _uiState.value = CheckoutUiState.Loading
            val result = ordersRepository.createOrder(orderRequest)
            result.onSuccess { order ->
                _uiState.value = CheckoutUiState.Success(order)
                _successMessage.value = "Order placed successfully! Order ID: ${order.id.takeLast(8)}"
            }.onFailure { error ->
                _uiState.value = CheckoutUiState.Error(error.message ?: "Failed to place order")
            }
        }
    }

    fun showReview(subtotal: Double, total: Double) {
        _uiState.value = CheckoutUiState.Review(subtotal, total)
    }
}
