package com.craftly.messaging.data.models

import com.google.firebase.Timestamp

data class Conversation(
    val id: String = "",
    val participants: List<String> = emptyList(),
    val participantNames: Map<String, String> = emptyMap(),
    val lastMessage: String = "",
    val lastMessageAt: Timestamp? = null,
    val lastMessageBy: String? = null,
    val unreadCount: Map<String, Long> = emptyMap(),
    val createdAt: Timestamp? = null,
)
