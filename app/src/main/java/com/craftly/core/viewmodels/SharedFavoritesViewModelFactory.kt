package com.craftly.core.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.craftly.favorites.data.repository.FavoritesRepository

class SharedFavoritesViewModelFactory(
    private val favoritesRepository: FavoritesRepository
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return SharedFavoritesViewModel(favoritesRepository) as T
    }
}
