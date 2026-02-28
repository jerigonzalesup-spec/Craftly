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
import com.craftly.R
import com.craftly.MainActivity
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.core.network.RetrofitClient
import com.craftly.databinding.FragmentFavoritesBinding
import com.craftly.favorites.data.repository.FavoritesRepository
import com.craftly.favorites.presentation.viewmodels.FavoritesUiState
import com.craftly.favorites.presentation.viewmodels.FavoritesViewModel
import com.craftly.products.data.repository.ProductRepository
import com.craftly.products.presentation.ui.ProductDetailActivity

class FavoritesFragment : Fragment() {
    private lateinit var binding: FragmentFavoritesBinding
    private lateinit var viewModel: FavoritesViewModel
    private var adapter: FavoriteItemAdapter? = null

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

        // Pull-to-refresh
        binding.swipeRefreshLayout.setOnRefreshListener { viewModel.loadFavorites() }

        // Empty state CTA — navigate to Browse tab
        binding.browseFavoritesButton.setOnClickListener {
            (requireActivity() as? MainActivity)?.bottomNav?.selectedItemId = R.id.nav_browse
        }
    }

    private fun setupViewModel() {
        val prefsManager = SharedPreferencesManager(requireContext())
        val favoritesApiService = RetrofitClient.createFavoritesApiService()
        val favoritesRepository = FavoritesRepository(favoritesApiService, prefsManager)
        val productApiService = RetrofitClient.createProductApiService()
        val productRepository = ProductRepository(productApiService)

        val factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                return FavoritesViewModel(favoritesRepository, productRepository) as T
            }
        }
        viewModel = ViewModelProvider(this, factory)[FavoritesViewModel::class.java]
    }

    private fun setupRecyclerView() {
        adapter = FavoriteItemAdapter(
            onProductClick = { product ->
                val intent = Intent(requireContext(), ProductDetailActivity::class.java)
                intent.putExtra("product_id", product.id)
                val opts = android.app.ActivityOptions.makeCustomAnimation(
                    requireContext(), R.anim.fragment_slide_in, R.anim.fade_out
                )
                startActivity(intent, opts.toBundle())
            },
            onRemoveClick = { product ->
                viewModel.removeFromFavorites(product.id, product.name)
            }
        )
        val layoutAnim = android.view.animation.AnimationUtils.loadLayoutAnimation(
            requireContext(), R.anim.layout_fall_down
        )
        binding.favoritesRecyclerView.apply {
            layoutManager = GridLayoutManager(requireContext(), 2)
            adapter = this@FavoritesFragment.adapter
            layoutAnimation = layoutAnim
            itemAnimator = androidx.recyclerview.widget.DefaultItemAnimator().apply {
                addDuration = 250
                removeDuration = 200
            }
        }
    }

    private fun observeViewModel() {
        viewModel.uiState.observe(viewLifecycleOwner) { state ->
            when (state) {
                is FavoritesUiState.Loading -> showLoading()
                is FavoritesUiState.Success -> showFavorites(state.products)
                is FavoritesUiState.Error -> showError(state.message)
            }
        }

        viewModel.successMessage.observe(viewLifecycleOwner) { message ->
            Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
        }
    }

    private fun fadeIn(v: View) {
        if (v.visibility != View.VISIBLE) {
            v.alpha = 0f; v.visibility = View.VISIBLE
            v.animate().alpha(1f).setDuration(250).start()
        }
    }

    private fun showLoading() {
        fadeIn(binding.loadingProgressBar)
        binding.emptyStateContainer.visibility = View.GONE
        binding.swipeRefreshLayout.visibility = View.GONE
    }

    private fun showFavorites(products: List<com.craftly.products.data.models.Product>) {
        binding.loadingProgressBar.visibility = View.GONE
        binding.swipeRefreshLayout.isRefreshing = false
        if (products.isEmpty()) {
            fadeIn(binding.emptyStateContainer)
            binding.swipeRefreshLayout.visibility = View.GONE
        } else {
            binding.emptyStateContainer.visibility = View.GONE
            binding.swipeRefreshLayout.visibility = View.VISIBLE
            adapter?.updateData(products)
            binding.favoritesRecyclerView.scheduleLayoutAnimation()
        }
    }

    private fun showError(message: String) {
        binding.loadingProgressBar.visibility = View.GONE
        binding.swipeRefreshLayout.isRefreshing = false
        fadeIn(binding.emptyStateContainer)
        binding.swipeRefreshLayout.visibility = View.GONE
        Toast.makeText(requireContext(), "Error: $message", Toast.LENGTH_LONG).show()
    }

    override fun onResume() {
        super.onResume()
        viewModel.loadFavorites()
    }
}

