package com.craftly.orders.presentation.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
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
                Toast.makeText(requireContext(), "Order ${order.id} selected", Toast.LENGTH_SHORT).show()
            },
            onCancelClick = { orderId ->
                viewModel.cancelOrder(orderId)
            }
        )
        binding.ordersRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = ordersAdapter
        }
    }

    private fun observeViewModel() {
        viewModel.uiState.observe(viewLifecycleOwner) { state ->
            when (state) {
                is OrdersUiState.Loading -> showLoading()
                is OrdersUiState.Success -> showOrders(state.orders.data)
                is OrdersUiState.Error -> showError(state.message)
            }
        }

        viewModel.successMessage.observe(viewLifecycleOwner) { message ->
            Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
        }
    }

    private fun showLoading() {
        binding.loadingProgressBar.visibility = View.VISIBLE
        binding.emptyStateContainer.visibility = View.GONE
        binding.ordersRecyclerView.visibility = View.GONE
    }

    private fun showOrders(orders: List<com.craftly.orders.data.models.Order>) {
        binding.loadingProgressBar.visibility = View.GONE

        if (orders.isEmpty()) {
            binding.emptyStateContainer.visibility = View.VISIBLE
            binding.ordersRecyclerView.visibility = View.GONE
        } else {
            binding.emptyStateContainer.visibility = View.GONE
            binding.ordersRecyclerView.visibility = View.VISIBLE
            ordersAdapter?.updateOrders(orders)
        }
    }

    private fun showError(message: String) {
        binding.loadingProgressBar.visibility = View.GONE
        binding.emptyStateContainer.visibility = View.VISIBLE
        binding.ordersRecyclerView.visibility = View.GONE
        Toast.makeText(requireContext(), "Error: $message", Toast.LENGTH_LONG).show()
    }
}
