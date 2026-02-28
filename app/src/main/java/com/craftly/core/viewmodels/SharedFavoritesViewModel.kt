package com.craftly.core.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.favorites.data.repository.FavoritesRepository
import kotlinx.coroutines.launch

class SharedFavoritesViewModel(private val favoritesRepository: FavoritesRepository) : ViewModel() {

    private val _favoritedIds = MutableLiveData<Set<String>>(setOf())
    val favoritedIds: LiveData<Set<String>> = _favoritedIds

    private val _successMessage = MutableLiveData<String>()
    val successMessage: LiveData<String> = _successMessage

    fun updateFavoritedIds() {
        viewModelScope.launch {
            val result = favoritesRepository.getFavorites()
            result.onSuccess { favorites ->
                _favoritedIds.value = favorites
            }.onFailure { error ->
                _successMessage.value = "Failed to load favorites: ${error.message}"
            }
        }
    }

    fun addToFavorites(productId: String, productName: String) {
        viewModelScope.launch {
            val result = favoritesRepository.addFavorite(productId)
            result.onSuccess { favorites ->
                _favoritedIds.value = favorites
                _successMessage.value = "Added to favorites!"
            }.onFailure { error ->
                _successMessage.value = "Failed to add to favorites: ${error.message}"
            }
        }
    }

    fun removeFromFavorites(productId: String, productName: String) {
        viewModelScope.launch {
            val result = favoritesRepository.removeFavorite(productId)
            result.onSuccess { favorites ->
                _favoritedIds.value = favorites
                _successMessage.value = "Removed from favorites!"
            }.onFailure { error ->
                _successMessage.value = "Failed to remove from favorites: ${error.message}"
            }
        }
    }
}
