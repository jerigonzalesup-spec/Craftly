package com.craftly.cart.presentation.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.craftly.R
import com.craftly.cart.data.repository.CartRepository
import com.craftly.cart.presentation.viewmodels.CartUiState
import com.craftly.cart.presentation.viewmodels.CartViewModel
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.core.network.RetrofitClient
import com.craftly.checkout.presentation.ui.CheckoutActivity
import com.craftly.databinding.FragmentCartBinding

class CartFragment : Fragment() {
    private lateinit var binding: FragmentCartBinding
    private lateinit var viewModel: CartViewModel
    private var cartAdapter: CartItemAdapter? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentCartBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupViewModel()
        setupRecyclerView()
        setupClickListeners()
        observeViewModel()
    }

    private fun setupViewModel() {
        val apiService = RetrofitClient.createCartApiService()
        val prefsManager = SharedPreferencesManager(requireContext())
        val repository = CartRepository(apiService, prefsManager)

        val factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                return CartViewModel(repository) as T
            }
        }
        viewModel = ViewModelProvider(this, factory).get(CartViewModel::class.java)
    }

    private fun setupRecyclerView() {
        cartAdapter = CartItemAdapter(
            onQuantityChanged = { itemId, quantity ->
                viewModel.updateQuantity(itemId, quantity)
            },
            onRemoveClick = { itemId ->
                viewModel.removeFromCart(itemId)
            }
        )
        binding.cartRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = cartAdapter
        }
    }

    private fun setupClickListeners() {
        binding.checkoutButton.setOnClickListener {
            val currentState = viewModel.uiState.value
            if (currentState is CartUiState.Success && currentState.cart.data?.items?.isNotEmpty() == true) {
                // Launch CheckoutActivity with cart data
                val intent = Intent(requireContext(), CheckoutActivity::class.java)
                intent.putExtra("cart_data", currentState.cart.data)
                startActivity(intent)
            } else {
                Toast.makeText(requireContext(), getString(R.string.cart_empty), Toast.LENGTH_SHORT).show()
            }
        }

        binding.continueShopping.setOnClickListener {
            activity?.supportFragmentManager?.popBackStack()
        }
    }

    private fun observeViewModel() {
        viewModel.uiState.observe(viewLifecycleOwner) { state ->
            when (state) {
                is CartUiState.Loading -> showLoading()
                is CartUiState.Success -> showCart(state.cart)
                is CartUiState.Error -> showError(state.message)
            }
        }

        viewModel.successMessage.observe(viewLifecycleOwner) { message ->
            Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
        }
    }

    private fun showLoading() {
        binding.loadingProgressBar.visibility = View.VISIBLE
        binding.emptyStateContainer.visibility = View.GONE
        binding.cartContent.visibility = View.GONE
    }

    private fun showCart(cart: com.craftly.cart.data.models.Cart) {
        binding.loadingProgressBar.visibility = View.GONE

        val items = cart.data?.items ?: emptyList()
        if (items.isEmpty()) {
            binding.emptyStateContainer.visibility = View.VISIBLE
            binding.cartContent.visibility = View.GONE
        } else {
            binding.emptyStateContainer.visibility = View.GONE
            binding.cartContent.visibility = View.VISIBLE
            cartAdapter?.updateItems(items)
            cart.data?.let { cartData ->
                updateCartSummary(cartData)
            }
        }
    }

    private fun showError(message: String) {
        binding.loadingProgressBar.visibility = View.GONE
        binding.emptyStateContainer.visibility = View.VISIBLE
        binding.cartContent.visibility = View.GONE
        Toast.makeText(requireContext(), String.format(getString(R.string.checkout_order_error), message), Toast.LENGTH_LONG).show()
    }

    private fun updateCartSummary(cartData: com.craftly.cart.data.models.CartData) {
        binding.cartTotal.text = String.format(getString(R.string.cart_total_format), cartData.total)
        binding.itemCount.text = String.format(getString(R.string.item_count_format), cartData.items.size)
    }
}
