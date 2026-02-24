package com.craftly.orders.presentation.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.orders.data.models.Order
import com.craftly.orders.data.models.OrdersResponse
import com.craftly.orders.data.repository.OrdersRepository
import kotlinx.coroutines.launch

sealed class OrdersUiState {
    object Loading : OrdersUiState()
    data class Success(val orders: OrdersResponse) : OrdersUiState()
    data class Error(val message: String) : OrdersUiState()
}

sealed class OrderDetailUiState {
    object Loading : OrderDetailUiState()
    data class Success(val order: Order) : OrderDetailUiState()
    data class Error(val message: String) : OrderDetailUiState()
}

class OrdersViewModel(private val ordersRepository: OrdersRepository) : ViewModel() {
    private val _uiState = MutableLiveData<OrdersUiState>(OrdersUiState.Loading)
    val uiState: LiveData<OrdersUiState> = _uiState

    private val _detailUiState = MutableLiveData<OrderDetailUiState>(OrderDetailUiState.Loading)
    val detailUiState: LiveData<OrderDetailUiState> = _detailUiState

    private val _successMessage = MutableLiveData<String>()
    val successMessage: LiveData<String> = _successMessage

    init {
        loadOrders()
    }

    fun loadOrders() {
        viewModelScope.launch {
            _uiState.value = OrdersUiState.Loading
            val result = ordersRepository.getOrders()
            result.onSuccess { response ->
                _uiState.value = OrdersUiState.Success(response)
            }.onFailure { error ->
                _uiState.value = OrdersUiState.Error(error.message ?: "Failed to load orders")
            }
        }
    }

    fun loadOrderDetails(orderId: String) {
        viewModelScope.launch {
            _detailUiState.value = OrderDetailUiState.Loading
            val result = ordersRepository.getOrderDetails(orderId)
            result.onSuccess { order ->
                _detailUiState.value = OrderDetailUiState.Success(order)
            }.onFailure { error ->
                _detailUiState.value = OrderDetailUiState.Error(error.message ?: "Failed to load order details")
            }
        }
    }

    fun cancelOrder(orderId: String) {
        viewModelScope.launch {
            val result = ordersRepository.cancelOrder(orderId)
            result.onSuccess { order ->
                _successMessage.value = "Order cancelled successfully"
                loadOrders() // Refresh orders list
            }.onFailure { error ->
                _successMessage.value = "Failed to cancel order: ${error.message}"
            }
        }
    }
}
