package com.craftly.app.presentation.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.craftly.app.R
import com.craftly.app.data.repository.ProductRepository
import kotlinx.coroutines.launch

class HomeFragment : Fragment() {

    private val productRepository = ProductRepository()
    private lateinit var productsRecyclerView: RecyclerView
    private lateinit var emptyStateView: LinearLayout
    private var productsAdapter: ProductAdapter? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_home, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        productsRecyclerView = view.findViewById(R.id.productsRecyclerView)
        emptyStateView = view.findViewById(R.id.emptyStateView)

        setupRecyclerView()
        loadProducts()
    }

    private fun setupRecyclerView() {
        productsRecyclerView.layoutManager = GridLayoutManager(requireContext(), 2)
        productsAdapter = ProductAdapter(emptyList())
        productsRecyclerView.adapter = productsAdapter
    }

    private fun loadProducts() {
        lifecycleScope.launch {
            val result = productRepository.getAllProducts()

            result.onSuccess { products ->
                if (products.isEmpty()) {
                    emptyStateView.visibility = View.VISIBLE
                    productsRecyclerView.visibility = View.GONE
                } else {
                    emptyStateView.visibility = View.GONE
                    productsRecyclerView.visibility = View.VISIBLE
                    productsAdapter?.updateProducts(products)
                }
            }

            result.onFailure { error ->
                Toast.makeText(
                    requireContext(),
                    "Failed to load products: ${error.message}",
                    Toast.LENGTH_SHORT
                ).show()
                emptyStateView.visibility = View.VISIBLE
                productsRecyclerView.visibility = View.GONE
            }
        }
    }
}
