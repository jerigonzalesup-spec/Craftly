package com.craftly.messaging.presentation.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.messaging.data.models.Conversation
import com.craftly.messaging.data.repository.MessagingRepository
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.launch

class ConversationsViewModel(
    private val repository: MessagingRepository,
) : ViewModel() {

    private val _conversations = MutableLiveData<List<Conversation>>()
    val conversations: LiveData<List<Conversation>> = _conversations

    private val _loading = MutableLiveData(true)
    val loading: LiveData<Boolean> = _loading

    private var listenerRegistration: ListenerRegistration? = null

    fun startListening(userId: String) {
        _loading.value = true
        listenerRegistration = repository.listenToConversations(userId) { convs ->
            _conversations.postValue(convs)
            _loading.postValue(false)
        }
    }

    override fun onCleared() {
        super.onCleared()
        listenerRegistration?.remove()
    }
}

class ConversationsViewModelFactory(
    private val repository: MessagingRepository,
) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return ConversationsViewModel(repository) as T
    }
}
