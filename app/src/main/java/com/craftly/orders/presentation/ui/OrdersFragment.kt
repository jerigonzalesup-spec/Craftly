package com.craftly.orders.presentation.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.content.Intent
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.craftly.R
import com.craftly.MainActivity
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.core.network.RetrofitClient
import com.craftly.databinding.FragmentOrdersBinding
import com.craftly.orders.data.repository.OrdersRepository
import com.craftly.orders.presentation.viewmodels.OrdersUiState
import com.craftly.orders.presentation.viewmodels.OrdersViewModel

class OrdersFragment : Fragment() {
    private lateinit var binding: FragmentOrdersBinding
    private lateinit var viewModel: OrdersViewModel
    private var ordersAdapter: OrdersListAdapter? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentOrdersBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupViewModel()
        setupRecyclerView()
        observeViewModel()

        // Pull-to-refresh
        binding.swipeRefreshLayout.setOnRefreshListener { viewModel.loadOrders() }

        // Empty state CTA — navigate to Browse tab
        binding.startShoppingButton.setOnClickListener {
            (requireActivity() as? MainActivity)?.bottomNav?.selectedItemId = R.id.nav_browse
        }
    }

    private fun setupViewModel() {
        val apiService = RetrofitClient.createOrdersApiService()
        val prefsManager = SharedPreferencesManager(requireContext())
        val repository = OrdersRepository(apiService, prefsManager)

        val factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                return OrdersViewModel(repository) as T
            }
        }
        viewModel = ViewModelProvider(this, factory).get(OrdersViewModel::class.java)
    }

    private fun setupRecyclerView() {
        ordersAdapter = OrdersListAdapter(
            onOrderClick = { order ->
                val intent = OrderDetailActivity.createIntent(requireContext(), order.id)
                startActivity(intent)
            },
            onCancelClick = { orderId ->
                AlertDialog.Builder(requireContext())
                    .setTitle("Cancel Order")
                    .setMessage("Are you sure you want to cancel this order? This cannot be undone.")
                    .setPositiveButton("Cancel Order") { _, _ ->
                        viewModel.cancelOrder(orderId)
                    }
                    .setNegativeButton("Keep Order", null)
                    .show()
            }
        )
        val layoutAnim = android.view.animation.AnimationUtils.loadLayoutAnimation(
            requireContext(), R.anim.layout_fall_down
        )
        binding.ordersRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = ordersAdapter
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
                is OrdersUiState.Loading -> showLoading()
                is OrdersUiState.Success -> showOrders(state.orders.data?.orders ?: emptyList())
                is OrdersUiState.Error -> showError(state.message)
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

    private fun showOrders(orders: List<com.craftly.orders.data.models.Order>) {
        binding.loadingProgressBar.visibility = View.GONE
        binding.swipeRefreshLayout.isRefreshing = false

        if (orders.isEmpty()) {
            fadeIn(binding.emptyStateContainer)
            binding.swipeRefreshLayout.visibility = View.GONE
        } else {
            binding.emptyStateContainer.visibility = View.GONE
            binding.swipeRefreshLayout.visibility = View.VISIBLE
            ordersAdapter?.updateOrders(orders)
            binding.ordersRecyclerView.scheduleLayoutAnimation()
        }
    }

    private fun showError(message: String) {
        binding.loadingProgressBar.visibility = View.GONE
        binding.swipeRefreshLayout.isRefreshing = false
        fadeIn(binding.emptyStateContainer)
        binding.swipeRefreshLayout.visibility = View.GONE
        Toast.makeText(requireContext(), "Error loading orders: $message", Toast.LENGTH_LONG).show()
    }
}

