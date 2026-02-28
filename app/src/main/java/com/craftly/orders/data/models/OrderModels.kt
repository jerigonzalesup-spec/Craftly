package com.craftly.orders.data.models

import com.craftly.core.network.FlexibleDate
import java.io.Serializable

data class Order(
    val id: String = "",
    val buyerId: String = "",
    val items: List<OrderItem> = emptyList(),
    val totalAmount: Double = 0.0,
    val orderStatus: String = "pending",
    val paymentStatus: String = "unpaid",
    val paymentMethod: String = "cod",
    val shippingMethod: String = "local-delivery",
    val deliveryFee: Double = 0.0,
    val shippingAddress: ShippingAddress = ShippingAddress(),
    val receiptImageUrl: String? = null,
    @FlexibleDate val createdAt: String = "",
    @FlexibleDate val updatedAt: String = "",
    val estimatedDelivery: String? = null,
    val trackingNumber: String? = null,
    val sellerTotal: Double? = null,
    val sellerItems: List<OrderItem>? = null
) : Serializable

data class OrderItem(
    val id: String = "",
    val productId: String = "",
    val productName: String = "",
    val quantity: Int = 1,
    val price: Double = 0.0,
    val image: String? = null,   // backend stores null for missing images
    val category: String = "",
    val sellerId: String? = null  // backend stores null for missing sellerIds
) : Serializable

data class ShippingAddress(
    val fullName: String = "",
    val email: String = "",
    val contactNumber: String = "",
    val streetAddress: String? = null,
    val barangay: String? = null,
    val city: String? = null,
    val postalCode: String? = null,
    val country: String? = null
) : Serializable

data class OrdersData(
    val userId: String = "",
    val orders: List<Order> = emptyList(),
    val count: Int = 0,
    val total: Int = 0,
    val hasMore: Boolean = false
)

data class OrdersResponse(
    val success: Boolean = false,
    val data: OrdersData? = null,
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
    val shippingMethod: String = "local-delivery",
    val receiptImageUrl: String? = null
)

data class UpdateOrderStatusRequest(
    val status: String,
    val trackingNumber: String? = null
)
