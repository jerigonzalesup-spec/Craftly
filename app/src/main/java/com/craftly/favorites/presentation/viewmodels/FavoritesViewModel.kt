package com.craftly.favorites.presentation.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.favorites.data.repository.FavoritesRepository
import com.craftly.products.data.models.Product
import com.craftly.products.data.repository.ProductRepository
import kotlinx.coroutines.launch

sealed class FavoritesUiState {
    object Loading : FavoritesUiState()
    data class Success(val products: List<Product>) : FavoritesUiState()
    data class Error(val message: String) : FavoritesUiState()
}

class FavoritesViewModel(
    private val favoritesRepository: FavoritesRepository,
    private val productRepository: ProductRepository
) : ViewModel() {

    private val _uiState = MutableLiveData<FavoritesUiState>(FavoritesUiState.Loading)
    val uiState: LiveData<FavoritesUiState> = _uiState

    private val _successMessage = MutableLiveData<String>()
    val successMessage: LiveData<String> = _successMessage

    private var cachedFavoriteIds: Set<String> = emptySet()

    fun loadFavorites() {
        viewModelScope.launch {
            _uiState.value = FavoritesUiState.Loading
            try {
                // 1. Get favorite IDs
                val favResult = favoritesRepository.getFavorites()
                if (favResult.isFailure) {
                    _uiState.value = FavoritesUiState.Error(
                        favResult.exceptionOrNull()?.message ?: "Failed to load favorites"
                    )
                    return@launch
                }
                cachedFavoriteIds = favResult.getOrDefault(emptySet())

                if (cachedFavoriteIds.isEmpty()) {
                    _uiState.value = FavoritesUiState.Success(emptyList())
                    return@launch
                }

                // 2. Load all active products
                val allProducts = productRepository.getAllProducts()

                // 3. Filter to only favorited products
                val favoriteProducts = allProducts.filter { it.id in cachedFavoriteIds }
                _uiState.value = FavoritesUiState.Success(favoriteProducts)
            } catch (e: Exception) {
                _uiState.value = FavoritesUiState.Error(e.message ?: "An unexpected error occurred")
            }
        }
    }

    fun removeFromFavorites(productId: String, productName: String) {
        viewModelScope.launch {
            val result = favoritesRepository.removeFavorite(productId)
            result.onSuccess { updatedIds ->
                cachedFavoriteIds = updatedIds
                // Update UI state by removing the product from current list
                val currentState = _uiState.value
                if (currentState is FavoritesUiState.Success) {
                    val updatedList = currentState.products.filter { it.id != productId }
                    _uiState.value = FavoritesUiState.Success(updatedList)
                }
                _successMessage.value = "$productName removed from favorites"
            }.onFailure { error ->
                _successMessage.value = "Failed to remove: ${error.message}"
            }
        }
    }
}
