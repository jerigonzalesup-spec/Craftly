package com.craftly.messaging.data.models

import com.google.firebase.Timestamp

data class Message(
    val id: String = "",
    val senderId: String = "",
    val senderName: String = "",
    val text: String = "",
    val createdAt: Timestamp? = null,
    val read: Boolean = false,
)
