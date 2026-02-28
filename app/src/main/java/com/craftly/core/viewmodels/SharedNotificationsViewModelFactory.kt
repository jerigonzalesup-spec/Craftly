package com.craftly.core.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.craftly.notifications.data.repository.NotificationsRepository

class SharedNotificationsViewModelFactory(
    private val repository: NotificationsRepository
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(SharedNotificationsViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return SharedNotificationsViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
