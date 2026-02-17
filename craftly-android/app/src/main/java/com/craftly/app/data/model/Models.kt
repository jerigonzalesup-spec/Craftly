package com.craftly.app.data.model

// User Model
data class User(
    val uid: String = "",
    val fullName: String = "",
    val email: String = "",
    val role: String = "buyer",
    val profilePhoto: String? = null,
    val contactNumber: String = "",
    val streetAddress: String = "",
    val barangay: String = "",
    val accountStatus: String = "active",
    val createdAt: Long = 0,
    val shopName: String? = null,
    val shopAddress: String? = null,
    val shopBarangay: String? = null,
    val allowShipping: Boolean = true,
    val allowPickup: Boolean = true,
    val gcashName: String? = null,
    val gcashNumber: String? = null,
    val postalCode: String? = null
)

// Product Model
data class Product(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val price: Double = 0.0,
    val stock: Int = 0,
    val images: List<String> = emptyList(),
    val category: String = "",
    val createdBy: String = "",
    val status: String = "active",
    val archiveReason: String? = null,
    val createdAt: Long = 0,
    val rating: Double = 0.0,
    val reviewCount: Int = 0,
    val materialsUsed: String = ""
)

// CartItem Model
data class CartItem(
    val id: String = "",
    val productId: String = "",
    val name: String = "",
    val price: Double = 0.0,
    val quantity: Int = 1,
    val image: String = "",
    val createdBy: String = "",
    val stock: Int = 0
) {
    fun getSubtotal(): Double = price * quantity
}

// Order Model
data class Order(
    val orderId: String = "",
    val items: List<OrderItem> = emptyList(),
    val totalAmount: Double = 0.0,
    val shippingMethod: String = "local-delivery",
    val shippingAddress: ShippingAddress = ShippingAddress(),
    val deliveryFee: Double = 0.0,
    val paymentMethod: String = "cod",
    val orderStatus: String = "pending",
    val receiptImageUrl: String? = null,
    val createdAt: Long = 0,
    val buyerId: String = "",
    val notes: String? = null
)

data class OrderItem(
    val productId: String = "",
    val productName: String = "",
    val quantity: Int = 0,
    val price: Double = 0.0,
    val image: String = "",
    val sellerId: String = ""
)

data class ShippingAddress(
    val fullName: String = "",
    val email: String = "",
    val contactNumber: String = "",
    val streetAddress: String = "",
    val barangay: String = "",
    val city: String = "Dagupan",
    val postalCode: String = "2400",
    val country: String = "Philippines"
)

// Response wrapper models
data class ApiResponse<T>(
    val success: Boolean = false,
    val message: String = "",
    val data: T? = null,
    val errors: Map<String, String>? = null
)

// Login/Register request/response
data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val email: String,
    val password: String,
    val fullName: String,
    val role: String = "buyer"
)

data class AuthResponse(
    val uid: String = "",
    val email: String = "",
    val displayName: String = "",
    val role: String = "",
    val recoveryCodes: List<String>? = null
)

// Review Model
data class Review(
    val id: String = "",
    val userId: String = "",
    val userName: String = "",
    val rating: Int = 5,
    val comment: String = "",
    val createdAt: Long = 0
)
