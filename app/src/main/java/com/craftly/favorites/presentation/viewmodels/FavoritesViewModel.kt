package com.craftly.favorites.presentation.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.favorites.data.models.FavoritesResponse
import com.craftly.favorites.data.repository.FavoritesRepository
import kotlinx.coroutines.launch

sealed class FavoritesUiState {
    object Loading : FavoritesUiState()
    data class Success(val favorites: FavoritesResponse) : FavoritesUiState()
    data class Error(val message: String) : FavoritesUiState()
}

class FavoritesViewModel(private val favoritesRepository: FavoritesRepository) : ViewModel() {

    private val _uiState = MutableLiveData<FavoritesUiState>(FavoritesUiState.Loading)
    val uiState: LiveData<FavoritesUiState> = _uiState

    private val _successMessage = MutableLiveData<String>()
    val successMessage: LiveData<String> = _successMessage

    init {
        loadFavorites()
    }

    fun loadFavorites() {
        viewModelScope.launch {
            _uiState.value = FavoritesUiState.Loading
            val result = favoritesRepository.getFavorites()
            result.onSuccess { response ->
                _uiState.value = FavoritesUiState.Success(response)
            }.onFailure { error ->
                _uiState.value = FavoritesUiState.Error(error.message ?: "Failed to load favorites")
            }
        }
    }

    fun toggleFavorite(productId: String, productName: String, currentlyFavorited: Boolean) {
        viewModelScope.launch {
            val result = if (currentlyFavorited) {
                favoritesRepository.removeFromFavorites(productId)
            } else {
                favoritesRepository.addToFavorites(productId)
            }

            result.onSuccess {
                val message = if (currentlyFavorited) {
                    "Removed $productName from favorites"
                } else {
                    "Added $productName to favorites"
                }
                _successMessage.value = message
                loadFavorites() // Refresh favorites list
            }.onFailure { error ->
                _successMessage.value = "Error: ${error.message}"
            }
        }
    }

    fun removeFromFavorites(productId: String, productName: String) {
        viewModelScope.launch {
            val result = favoritesRepository.removeFromFavorites(productId)
            result.onSuccess {
                _successMessage.value = "Removed $productName from favorites"
                loadFavorites()
            }.onFailure { error ->
                _successMessage.value = "Error: ${error.message}"
            }
        }
    }
}
