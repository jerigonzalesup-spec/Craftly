package com.craftly.notifications.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.notifications.data.models.Notification
import com.craftly.notifications.data.models.NotificationsUiState
import com.craftly.notifications.data.repository.NotificationsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class NotificationsViewModel(private val repository: NotificationsRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(NotificationsUiState())
    val uiState: StateFlow<NotificationsUiState> = _uiState

    fun loadNotifications(userId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            repository.getNotifications(userId).fold(
                onSuccess = { notifications ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        notifications = notifications,
                        unreadCount = notifications.count { !it.isRead }
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to load notifications"
                    )
                }
            )
        }
    }

    fun markAsRead(userId: String, notificationId: String) {
        viewModelScope.launch {
            repository.markAsRead(userId, notificationId)
            // Update local state immediately
            val updated = _uiState.value.notifications.map { n ->
                if (n.id == notificationId) n.copy(isRead = true) else n
            }
            _uiState.value = _uiState.value.copy(
                notifications = updated,
                unreadCount = updated.count { !it.isRead }
            )
        }
    }

    fun markAllAsRead(userId: String) {
        viewModelScope.launch {
            repository.markAllAsRead(userId)
            val updated = _uiState.value.notifications.map { it.copy(isRead = true) }
            _uiState.value = _uiState.value.copy(
                notifications = updated,
                unreadCount = 0
            )
        }
    }

    fun deleteNotification(userId: String, notificationId: String) {
        viewModelScope.launch {
            repository.deleteNotification(userId, notificationId)
            val updated = _uiState.value.notifications.filter { it.id != notificationId }
            _uiState.value = _uiState.value.copy(
                notifications = updated,
                unreadCount = updated.count { !it.isRead }
            )
        }
    }
}
