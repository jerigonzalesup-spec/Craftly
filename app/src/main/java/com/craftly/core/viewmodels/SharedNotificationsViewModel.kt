package com.craftly.core.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.notifications.data.repository.NotificationsRepository
import kotlinx.coroutines.launch

class SharedNotificationsViewModel(
    private val repository: NotificationsRepository
) : ViewModel() {

    private val _unreadCount = MutableLiveData(0)
    val unreadCount: LiveData<Int> = _unreadCount

    fun refreshUnreadCount(userId: String) {
        viewModelScope.launch {
            repository.getNotifications(userId).onSuccess { notifications ->
                _unreadCount.postValue(notifications.count { !it.isRead })
            }
        }
    }

    fun decrementOnRead() {
        val current = _unreadCount.value ?: 0
        if (current > 0) _unreadCount.postValue(current - 1)
    }

    fun clearAll() {
        _unreadCount.postValue(0)
    }
}
