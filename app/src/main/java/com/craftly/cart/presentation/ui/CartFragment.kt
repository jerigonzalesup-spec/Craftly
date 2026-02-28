package com.craftly.cart.presentation.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AnimationUtils
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.craftly.R
import com.craftly.cart.data.repository.CartRepository
import com.craftly.cart.presentation.viewmodels.CartUiState
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.checkout.presentation.ui.CheckoutActivity
import com.craftly.core.network.RetrofitClient
import com.craftly.core.viewmodels.SharedCartViewModel
import com.craftly.core.viewmodels.SharedCartViewModelFactory
import com.craftly.databinding.FragmentCartBinding

class CartFragment : Fragment() {
    private lateinit var binding: FragmentCartBinding
    private lateinit var viewModel: SharedCartViewModel
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

        // Load cart on view created
        viewModel.refreshCart()
    }

    private fun setupViewModel() {
        val apiService = RetrofitClient.createCartApiService()
        val prefsManager = SharedPreferencesManager(requireContext())
        val repository = CartRepository(apiService, prefsManager)

        // Scope to Activity so MarketplaceFragment additions are reflected here
        viewModel = ViewModelProvider(
            requireActivity(),
            SharedCartViewModelFactory(repository)
        ).get(SharedCartViewModel::class.java)
    }

    private fun setupRecyclerView() {
        cartAdapter = CartItemAdapter(
            onQuantityChanged = { productId, quantity ->
                viewModel.updateCartItemQuantity(productId, quantity)
            },
            onRemoveClick = { productId ->
                viewModel.removeCartItem(productId)
            }
        )
        val layoutAnim = android.view.animation.AnimationUtils.loadLayoutAnimation(
            requireContext(), R.anim.layout_fall_down
        )
        binding.cartRecyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = cartAdapter
            layoutAnimation = layoutAnim
            itemAnimator = androidx.recyclerview.widget.DefaultItemAnimator().apply {
                addDuration = 250
                removeDuration = 200
                changeDuration = 150
            }
        }
    }

    private fun setupClickListeners() {
        binding.checkoutButton.setOnClickListener {
            val currentState = viewModel.cartUiState.value
            if (currentState is CartUiState.Success && currentState.cart.data?.items?.isNotEmpty() == true) {
                val intent = Intent(requireContext(), CheckoutActivity::class.java)
                intent.putExtra("cart_items", ArrayList(currentState.cart.data.items))
                val opts = android.app.ActivityOptions.makeCustomAnimation(
                    requireContext(), R.anim.fragment_slide_in, R.anim.fade_out
                )
                startActivity(intent, opts.toBundle())
            } else {
                Toast.makeText(requireContext(), getString(R.string.cart_empty), Toast.LENGTH_SHORT).show()
            }
        }

        binding.continueShopping.setOnClickListener {
            activity?.onBackPressedDispatcher?.onBackPressed()
        }
    }

    private fun observeViewModel() {
        viewModel.cartUiState.observe(viewLifecycleOwner) { state ->
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

    private fun fadeIn(view: View) {
        if (view.visibility != View.VISIBLE) {
            view.alpha = 0f
            view.visibility = View.VISIBLE
            view.animate().alpha(1f).setDuration(250).start()
        }
    }

    private fun fadeOut(view: View) {
        if (view.visibility == View.VISIBLE) {
            view.animate().alpha(0f).setDuration(200).withEndAction {
                view.visibility = View.GONE
            }.start()
        }
    }

    private fun showLoading() {
        fadeIn(binding.loadingProgressBar)
        fadeOut(binding.emptyStateContainer)
        fadeOut(binding.cartContent)
    }

    private fun showCart(cart: com.craftly.cart.data.models.Cart) {
        fadeOut(binding.loadingProgressBar)

        val items = cart.data?.items ?: emptyList()
        if (items.isEmpty()) {
            fadeIn(binding.emptyStateContainer)
            fadeOut(binding.cartContent)
        } else {
            fadeOut(binding.emptyStateContainer)
            fadeIn(binding.cartContent)
            cartAdapter?.submitList(items)
            cart.data?.let { updateCartSummary(it) }
        }
    }

    private fun showError(message: String) {
        fadeOut(binding.loadingProgressBar)
        fadeIn(binding.emptyStateContainer)
        fadeOut(binding.cartContent)
        Toast.makeText(requireContext(), "Error: $message", Toast.LENGTH_LONG).show()
    }

    private fun updateCartSummary(cartData: com.craftly.cart.data.models.CartData) {
        // Backend does not return total/itemCount — compute from items
        val computedTotal = cartData.items.sumOf { it.price * it.quantity }
        binding.cartTotal.text = String.format(getString(R.string.cart_total_format), computedTotal)
        binding.itemCount.text = String.format(getString(R.string.item_count_format), cartData.items.size)
    }
}
