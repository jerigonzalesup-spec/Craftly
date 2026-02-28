package com.craftly.orders.presentation.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.orders.data.models.Order
import com.craftly.orders.data.repository.OrdersRepository
import kotlinx.coroutines.launch
import com.craftly.core.utils.ErrorMapper
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

sealed class SellerSalesUiState {
    object Loading : SellerSalesUiState()
    data class Success(val orders: List<Order>) : SellerSalesUiState()
    data class Error(val message: String) : SellerSalesUiState()
}

class SellerSalesViewModel(
    private val repository: OrdersRepository
) : ViewModel() {

    private val _uiState = MutableLiveData<SellerSalesUiState>(SellerSalesUiState.Loading)
    val uiState: LiveData<SellerSalesUiState> = _uiState

    private val _message = MutableLiveData<String>()
    val message: LiveData<String> = _message

    private val _isUpdating = MutableLiveData(false)
    val isUpdating: LiveData<Boolean> = _isUpdating

    fun loadSellerOrders() {
        viewModelScope.launch {
            _uiState.value = SellerSalesUiState.Loading
            val result = repository.getSellerOrders()
            result.onSuccess { orders ->
                // Sort newest first (ISO date strings sort lexicographically)
                val sorted = orders.sortedByDescending { it.createdAt }
                _uiState.value = SellerSalesUiState.Success(sorted)
            }.onFailure { e ->
                _uiState.value = SellerSalesUiState.Error(ErrorMapper.friendlyMessage(e))
            }
        }
    }

    /**
     * Returns true if this order was placed MORE than 24 hours ago
     * (status updates are locked after 24h — mirrors the web behaviour).
     */
    fun isOrderLocked(createdAt: String): Boolean {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            val orderDate: Date = sdf.parse(createdAt) ?: return false
            val hoursElapsed =
                (System.currentTimeMillis() - orderDate.time) / (1000.0 * 60 * 60)
            hoursElapsed > 24
        } catch (e: Exception) {
            false
        }
    }

    fun hoursRemainingToEdit(createdAt: String): Int {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            val orderDate: Date = sdf.parse(createdAt) ?: return 0
            val hoursElapsed =
                (System.currentTimeMillis() - orderDate.time) / (1000.0 * 60 * 60)
            maxOf(0, (24 - hoursElapsed).toInt())
        } catch (e: Exception) {
            0
        }
    }

    fun updateOrderStatus(orderId: String, newStatus: String, createdAt: String) {
        if (isOrderLocked(createdAt)) {
            _message.value = "Order is locked. Status can only be changed within 24 hours of creation."
            return
        }
        viewModelScope.launch {
            _isUpdating.value = true
            val result = repository.updateOrderStatus(orderId, newStatus)
            result.onSuccess { updatedOrder ->
                _message.value = "Order status updated to $newStatus"
                // Update the order in the current list (optimistic UI)
                val currentState = _uiState.value
                if (currentState is SellerSalesUiState.Success) {
                    val updatedList = currentState.orders.map {
                        if (it.id == orderId) updatedOrder else it
                    }
                    _uiState.value = SellerSalesUiState.Success(updatedList)
                }
            }.onFailure { e ->
                _message.value = "Failed to update order status. Please try again."
            }
            _isUpdating.value = false
        }
    }

    fun updatePaymentStatus(orderId: String, paymentStatus: String) {
        viewModelScope.launch {
            _isUpdating.value = true
            val result = repository.updatePaymentStatus(orderId, paymentStatus)
            result.onSuccess { updatedOrder ->
                _message.value = when (paymentStatus) {
                    "paid"   -> "Payment approved — order moved to processing"
                    "unpaid" -> "Receipt rejected. Buyer will be notified."
                    else     -> "Payment status updated"
                }
                val currentState = _uiState.value
                if (currentState is SellerSalesUiState.Success) {
                    val updatedList = currentState.orders.map {
                        if (it.id == orderId) updatedOrder else it
                    }
                    _uiState.value = SellerSalesUiState.Success(updatedList)
                }
            }.onFailure {
                _message.value = "Failed to update payment status. Please try again."
            }
            _isUpdating.value = false
        }
    }
}
