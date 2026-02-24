package com.craftly.cart.data.models

data class AddToCartRequest(
    val productId: String,
    val quantity: Int
)
