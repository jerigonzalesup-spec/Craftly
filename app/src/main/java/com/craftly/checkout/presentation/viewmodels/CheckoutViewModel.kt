package com.craftly.checkout.presentation.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.cart.data.models.CartItem
import com.craftly.cart.data.repository.CartRepository
import com.craftly.orders.data.models.CreateOrderRequest
import com.craftly.orders.data.models.OrderItem
import com.craftly.orders.data.models.ShippingAddress
import com.craftly.orders.data.repository.OrdersRepository
import kotlinx.coroutines.launch

class CheckoutViewModel(
    private val ordersRepository: OrdersRepository,
    private val cartRepository: CartRepository
) : ViewModel() {

    private val _checkoutState = MutableLiveData<CheckoutState>(CheckoutState.Idle)
    val checkoutState: LiveData<CheckoutState> = _checkoutState

    private val _errorMessage = MutableLiveData<String>()
    val errorMessage: LiveData<String> = _errorMessage

    fun placeOrder(
        cartItems: List<CartItem>,
        firstName: String,
        lastName: String,
        email: String,
        contactNumber: String,
        streetAddress: String,
        barangay: String,
        shippingMethod: String,
        paymentMethod: String,
        deliveryFee: Double,
        receiptImageUrl: String? = null
    ) {
        viewModelScope.launch {
            _checkoutState.value = CheckoutState.Loading

            // Validate cart is not empty
            if (cartItems.isEmpty()) {
                _errorMessage.value = "Cart is empty"
                _checkoutState.value = CheckoutState.Error("Empty cart.")
                return@launch
            }

            // Validate required fields
            if (firstName.isBlank() || lastName.isBlank() || email.isBlank() || contactNumber.isBlank()) {
                _errorMessage.value = "Please fill in all required personal information"
                _checkoutState.value = CheckoutState.Error("All fields required")
                return@launch
            }

            // Validate address for local delivery
            if (shippingMethod == "local-delivery") {
                // Barangay is REQUIRED for local delivery
                if (barangay.isBlank()) {
                    _errorMessage.value = "Please select a barangay for delivery"
                    _checkoutState.value = CheckoutState.Error("Barangay required")
                    return@launch
                }

                // Street address must be at least 5 characters with number and letter
                if (streetAddress.length < 5) {
                    _errorMessage.value = "Street address must be at least 5 characters"
                    _checkoutState.value = CheckoutState.Error("Invalid street address")
                    return@launch
                }

                val hasNumber = streetAddress.any { it.isDigit() }
                val hasLetter = streetAddress.any { it.isLetter() }
                if (!hasNumber || !hasLetter) {
                    _errorMessage.value = "Street address must contain numbers and letters"
                    _checkoutState.value = CheckoutState.Error("Invalid street address")
                    return@launch
                }
            }

            // Build order items from cart (matching web structure)
            val orderItems = cartItems.map { cartItem ->
                OrderItem(
                    productId = cartItem.productId,
                    productName = cartItem.name,
                    quantity = cartItem.quantity,
                    price = cartItem.price,
                    sellerId = cartItem.createdBy
                )
            }

            // Calculate total (matching web logic)
            val cartTotal = cartItems.sumOf { it.price * it.quantity }
            val totalAmount = cartTotal + deliveryFee

            // Build shipping address (matching web structure exactly)
            val shippingAddr = if (shippingMethod == "local-delivery") {
                ShippingAddress(
                    fullName = "$firstName $lastName",
                    email = email,
                    contactNumber = contactNumber,
                    streetAddress = streetAddress,
                    barangay = barangay,
                    city = "Dagupan",
                    postalCode = "2400",
                    country = "Philippines"
                )
            } else {
                // Store pickup - address fields null (matching backend)
                ShippingAddress(
                    fullName = "$firstName $lastName",
                    email = email,
                    contactNumber = contactNumber
                )
            }

            // Build order request (matching web structure)
            val orderRequest = CreateOrderRequest(
                items = orderItems,
                shippingAddress = shippingAddr,
                recipientName = "$firstName $lastName",
                recipientPhone = contactNumber,
                paymentMethod = paymentMethod.lowercase(),
                shippingMethod = shippingMethod,
                receiptImageUrl = receiptImageUrl
            )

            // Place order
            val result = ordersRepository.createOrder(orderRequest)
            result.onSuccess { order ->
                // Clear cart after successful order
                cartRepository.clearCart()
                _checkoutState.value = CheckoutState.Success(order.id ?: "")
            }.onFailure { exception ->
                _errorMessage.value = exception.message ?: "Failed to place order"
                _checkoutState.value = CheckoutState.Error(exception.message ?: "Failed to place order")
            }
        }
    }
}

sealed class CheckoutState {
    object Idle : CheckoutState()
    object Loading : CheckoutState()
    data class Success(val orderId: String) : CheckoutState()
    data class Error(val message: String) : CheckoutState()
}
