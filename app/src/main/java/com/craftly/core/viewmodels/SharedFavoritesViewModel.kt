package com.craftly.core.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.favorites.data.repository.FavoritesRepository
import kotlinx.coroutines.launch

class SharedFavoritesViewModel(private val favoritesRepository: FavoritesRepository) : ViewModel() {

    val successMessage = MutableLiveData<String>()

    // Track favorited product IDs for quick lookup - exposed to UI
    private val _favoritedIds = MutableLiveData<Set<String>>(emptySet())
    val favoritedIds: LiveData<Set<String>> = _favoritedIds

    fun toggleFavorite(productId: String, productName: String, currentlyFavorited: Boolean) {
        viewModelScope.launch {
            try {
                val result = if (currentlyFavorited) {
                    favoritesRepository.removeFromFavorites(productId)
                } else {
                    favoritesRepository.addToFavorites(productId)
                }

                result.onSuccess {
                    val message = if (currentlyFavorited) {
                        "❤️ Removed from favorites"
                    } else {
                        "❤️ Added to favorites"
                    }
                    successMessage.value = message
                    updateFavoritedIds(productId, !currentlyFavorited)
                }.onFailure { error ->
                    successMessage.value = "Error: ${error.message}"
                }
            } catch (e: Exception) {
                successMessage.value = "Error: ${e.message}"
            }
        }
    }

    fun addToFavorites(productId: String, productName: String) {
        viewModelScope.launch {
            try {
                val result = favoritesRepository.addToFavorites(productId)
                result.onSuccess {
                    successMessage.value = "❤️ Added to favorites"
                    updateFavoritedIds(productId, true)
                }.onFailure { error ->
                    successMessage.value = "Error: ${error.message}"
                }
            } catch (e: Exception) {
                successMessage.value = "Error: ${e.message}"
            }
        }
    }

    fun removeFromFavorites(productId: String, productName: String) {
        viewModelScope.launch {
            try {
                val result = favoritesRepository.removeFromFavorites(productId)
                result.onSuccess {
                    successMessage.value = "❤️ Removed from favorites"
                    updateFavoritedIds(productId, false)
                }.onFailure { error ->
                    successMessage.value = "Error: ${error.message}"
                }
            } catch (e: Exception) {
                successMessage.value = "Error: ${e.message}"
            }
        }
    }

    fun isFavorited(productId: String): Boolean {
        return _favoritedIds.value?.contains(productId) ?: false
    }

    fun updateFavoritedIds() {
        viewModelScope.launch {
            try {
                val result = favoritesRepository.getFavorites()
                result.onSuccess { response ->
                    // Extract product IDs from favorites array
                    val ids = response.data.favorites.toSet()
                    _favoritedIds.value = ids
                }
            } catch (e: Exception) {
                android.util.Log.e("SharedFavoritesViewModel", "Error loading favorited IDs: ${e.message}")
            }
        }
    }

    private fun updateFavoritedIds(productId: String, isFavorited: Boolean) {
        val currentIds = _favoritedIds.value?.toMutableSet() ?: mutableSetOf()
        if (isFavorited) {
            currentIds.add(productId)
        } else {
            currentIds.remove(productId)
        }
        _favoritedIds.value = currentIds
    }
}
