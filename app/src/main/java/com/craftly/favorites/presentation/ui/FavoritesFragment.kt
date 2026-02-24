package com.craftly.favorites.presentation.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.GridLayoutManager
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.core.network.RetrofitClient
import com.craftly.databinding.FragmentFavoritesBinding
import com.craftly.favorites.data.repository.FavoritesRepository
import com.craftly.favorites.presentation.viewmodels.FavoritesUiState
import com.craftly.favorites.presentation.viewmodels.FavoritesViewModel
import com.craftly.products.presentation.ui.ProductDetailActivity

class FavoritesFragment : Fragment() {
    private lateinit var binding: FragmentFavoritesBinding
    private lateinit var viewModel: FavoritesViewModel
    private var favoritesAdapter: FavoritesAdapter? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentFavoritesBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupViewModel()
        setupRecyclerView()
        observeViewModel()
        viewModel.loadFavorites()
    }

    private fun setupViewModel() {
        val apiService = RetrofitClient.createFavoritesApiService()
        val prefsManager = SharedPreferencesManager(requireContext())
        val repository = FavoritesRepository(apiService, prefsManager)

        val factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                return FavoritesViewModel(repository) as T
            }
        }
        viewModel = ViewModelProvider(this, factory).get(FavoritesViewModel::class.java)
    }

    private fun setupRecyclerView() {
        favoritesAdapter = FavoritesAdapter(
            onItemClick = { favorite ->
                // Navigate to product detail
                val intent = Intent(requireContext(), ProductDetailActivity::class.java)
                intent.putExtra("product_id", favorite.productId)
                startActivity(intent)
            },
            onRemoveClick = { favoriteId, productName ->
                viewModel.removeFromFavorites(favoriteId, productName)
            }
        )
        binding.favoritesRecyclerView.apply {
            layoutManager = GridLayoutManager(requireContext(), 2)
            adapter = favoritesAdapter
        }
    }

    private fun observeViewModel() {
        viewModel.uiState.observe(viewLifecycleOwner) { state ->
            when (state) {
                is FavoritesUiState.Loading -> showLoading()
                is FavoritesUiState.Success -> showFavorites(state.favorites.data)
                is FavoritesUiState.Error -> showError(state.message)
            }
        }

        viewModel.successMessage.observe(viewLifecycleOwner) { message ->
            Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
        }
    }

    private fun showLoading() {
        binding.loadingProgressBar.visibility = View.VISIBLE
        binding.emptyStateContainer.visibility = View.GONE
        binding.favoritesRecyclerView.visibility = View.GONE
    }

    private fun showFavorites(favoritesData: com.craftly.favorites.data.models.FavoritesData) {
        binding.loadingProgressBar.visibility = View.GONE

        if (favoritesData.favorites.isEmpty()) {
            binding.emptyStateContainer.visibility = View.VISIBLE
            binding.favoritesRecyclerView.visibility = View.GONE
        } else {
            binding.emptyStateContainer.visibility = View.GONE
            binding.favoritesRecyclerView.visibility = View.VISIBLE
            // For now, show a simple message since API returns only product IDs
            // In a full implementation, fetch product details for each favorited ID
            Toast.makeText(
                requireContext(),
                "You have ${favoritesData.count} favorite products. Go to Marketplace to browse them!",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    private fun showError(message: String) {
        binding.loadingProgressBar.visibility = View.GONE
        binding.emptyStateContainer.visibility = View.VISIBLE
        binding.favoritesRecyclerView.visibility = View.GONE
        Toast.makeText(requireContext(), "Error: $message", Toast.LENGTH_LONG).show()
    }
}
