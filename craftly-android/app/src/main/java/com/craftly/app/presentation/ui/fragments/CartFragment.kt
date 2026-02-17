package com.craftly.app.presentation.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.craftly.app.R
import com.craftly.app.data.model.CartItem

class CartFragment : Fragment() {

    private lateinit var cartItemsRecyclerView: RecyclerView
    private lateinit var emptyCartView: LinearLayout
    private lateinit var subtotalTextView: TextView
    private lateinit var deliveryFeeTextView: TextView
    private lateinit var totalTextView: TextView
    private lateinit var checkoutButton: Button

    // Placeholder cart items
    private val cartItems = mutableListOf<CartItem>()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_cart, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        cartItemsRecyclerView = view.findViewById(R.id.cartItemsRecyclerView)
        emptyCartView = view.findViewById(R.id.emptyCartView)
        subtotalTextView = view.findViewById(R.id.subtotalTextView)
        deliveryFeeTextView = view.findViewById(R.id.deliveryFeeTextView)
        totalTextView = view.findViewById(R.id.totalTextView)
        checkoutButton = view.findViewById(R.id.checkoutButton)

        setupRecyclerView()
        displayCart()

        checkoutButton.setOnClickListener {
            if (cartItems.isEmpty()) {
                Toast.makeText(requireContext(), "Cart is empty", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(requireContext(), "Proceeding to checkout...", Toast.LENGTH_SHORT).show()
                // TODO: Navigate to checkout screen
            }
        }
    }

    private fun setupRecyclerView() {
        cartItemsRecyclerView.layoutManager = LinearLayoutManager(requireContext())
        // TODO: Create CartItemAdapter and implement cart management
    }

    private fun displayCart() {
        if (cartItems.isEmpty()) {
            emptyCartView.visibility = View.VISIBLE
            cartItemsRecyclerView.visibility = View.GONE
        } else {
            emptyCartView.visibility = View.GONE
            cartItemsRecyclerView.visibility = View.VISIBLE
            updateCartTotals()
        }
    }

    private fun updateCartTotals() {
        val subtotal = cartItems.sumOf { it.price * it.quantity }
        val deliveryFee = 50.0 // Placeholder delivery fee
        val total = subtotal + deliveryFee

        subtotalTextView.text = "₱${String.format("%.2f", subtotal)}"
        deliveryFeeTextView.text = "₱${String.format("%.2f", deliveryFee)}"
        totalTextView.text = "₱${String.format("%.2f", total)}"
    }
}
