package com.craftly.messaging.presentation.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.messaging.data.models.Message
import com.craftly.messaging.data.repository.MessagingRepository
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.launch

class ChatViewModel(
    private val repository: MessagingRepository,
) : ViewModel() {

    private val _messages = MutableLiveData<List<Message>>()
    val messages: LiveData<List<Message>> = _messages

    private val _sending = MutableLiveData(false)
    val sending: LiveData<Boolean> = _sending

    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error

    private var listenerRegistration: ListenerRegistration? = null

    fun startListening(conversationId: String) {
        listenerRegistration = repository.listenToMessages(conversationId) { msgs ->
            _messages.postValue(msgs)
        }
    }

    fun sendMessage(
        conversationId: String,
        senderId: String,
        senderName: String,
        text: String,
    ) {
        if (text.isBlank() || _sending.value == true) return
        _sending.value = true
        viewModelScope.launch {
            try {
                repository.sendMessage(conversationId, senderId, senderName, text)
            } catch (e: Exception) {
                _error.postValue("Failed to send message")
            } finally {
                _sending.postValue(false)
            }
        }
    }

    fun markRead(conversationId: String, userId: String) {
        viewModelScope.launch {
            try {
                repository.markConversationRead(conversationId, userId)
            } catch (_: Exception) {}
        }
    }

    override fun onCleared() {
        super.onCleared()
        listenerRegistration?.remove()
    }
}

class ChatViewModelFactory(
    private val repository: MessagingRepository,
) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return ChatViewModel(repository) as T
    }
}
