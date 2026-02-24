package com.craftly.orders.data.models

import java.io.Serializable

data class Order(
    val id: String = "",
    val userId: String = "",
    val items: List<OrderItem> = emptyList(),
    val totalAmount: Double = 0.0,
    val status: String = "pending", // pending, processing, shipped, delivered, cancelled
    val paymentStatus: String = "pending", // pending, paid, failed
    val paymentMethod: String = "cod", // cod, gcash
    val shippingAddress: ShippingAddress = ShippingAddress(),
    val recipientName: String = "",
    val recipientPhone: String = "",
    val createdAt: String = "",
    val updatedAt: String = "",
    val estimatedDelivery: String? = null,
    val trackingNumber: String? = null
) : Serializable

data class OrderItem(
    val id: String = "",
    val productId: String = "",
    val productName: String = "",
    val quantity: Int = 1,
    val price: Double = 0.0,
    val image: String = "",
    val category: String = ""
) : Serializable

data class ShippingAddress(
    val street: String = "",
    val barangay: String = "",
    val city: String = "",
    val postalCode: String = "",
    val country: String = ""
) : Serializable

data class OrdersResponse(
    val success: Boolean = false,
    val data: List<Order> = emptyList(),
    val message: String? = null
)

data class OrderDetailResponse(
    val success: Boolean = false,
    val data: Order = Order(),
    val message: String? = null
)

data class CreateOrderRequest(
    val items: List<OrderItem>,
    val shippingAddress: ShippingAddress,
    val recipientName: String,
    val recipientPhone: String,
    val paymentMethod: String = "cod",
    val shippingMethod: String = "local-delivery"
)

data class UpdateOrderStatusRequest(
    val status: String,
    val trackingNumber: String? = null
)
