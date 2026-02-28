package com.craftly.notifications.data.models

import com.squareup.moshi.Json

data class NotificationTimestamp(
    @Json(name = "_seconds") val seconds: Long = 0,
    @Json(name = "_nanoseconds") val nanoseconds: Int = 0
)

data class Notification(
    val id: String = "",
    val message: String = "",
    val link: String? = null,
    val isRead: Boolean = false,
    val createdAt: NotificationTimestamp? = null,
    val type: String? = null
) {
    fun getCreatedAtMillis(): Long = (createdAt?.seconds ?: 0L) * 1000L
}

data class NotificationsData(
    val notifications: List<Notification> = emptyList(),
    val unreadCount: Int = 0
)

data class NotificationsResponse(
    val success: Boolean,
    val data: NotificationsData? = null,
    val error: String? = null
)

data class SimpleSuccessResponse(
    val success: Boolean,
    val message: String? = null
)

// UI State
data class NotificationsUiState(
    val isLoading: Boolean = true,   // start in loading so spinner shows immediately
    val notifications: List<Notification> = emptyList(),
    val unreadCount: Int = 0,
    val error: String? = null
)
