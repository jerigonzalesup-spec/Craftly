package com.craftly.cart.data.models

import java.io.Serializable

data class CartItem(
    val id: String = "",
    val productId: String = "",
    val name: String = "",
    val price: Double = 0.0,
    val quantity: Int = 1,
    val image: String = "",
    val createdBy: String = "", // Seller ID
    val stock: Int = 0,
    val category: String = ""
) : Serializable

data class Cart(
    val success: Boolean = false,
    val data: CartData? = null,
    val message: String? = null
) : Serializable

data class CartData(
    val items: List<CartItem> = emptyList(),
    val total: Double = 0.0,
    val itemCount: Int = 0
) : Serializable

data class SyncCartRequest(
    val items: List<CartItem>
)
