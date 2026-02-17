package com.craftly.app.presentation.ui.fragments

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.craftly.app.R
import com.craftly.app.data.model.Product
import com.craftly.app.data.repository.ProductRepository
import kotlinx.coroutines.launch

class SearchFragment : Fragment() {

    private val productRepository = ProductRepository()
    private lateinit var searchEditText: EditText
    private lateinit var searchResultsRecyclerView: RecyclerView
    private lateinit var emptyStateView: LinearLayout
    private var searchAdapter: ProductAdapter? = null
    private var allProducts: List<Product> = emptyList()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_search, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        searchEditText = view.findViewById(R.id.searchEditText)
        searchResultsRecyclerView = view.findViewById(R.id.searchResultsRecyclerView)
        emptyStateView = view.findViewById(R.id.emptyStateView)

        setupRecyclerView()
        loadAllProducts()
        setupSearchListener()
    }

    private fun setupRecyclerView() {
        searchResultsRecyclerView.layoutManager = GridLayoutManager(requireContext(), 2)
        searchAdapter = ProductAdapter(emptyList())
        searchResultsRecyclerView.adapter = searchAdapter
    }

    private fun loadAllProducts() {
        lifecycleScope.launch {
            val result = productRepository.getAllProducts()

            result.onSuccess { products ->
                allProducts = products
                if (products.isEmpty()) {
                    showEmptyState()
                } else {
                    searchAdapter?.updateProducts(products)
                    showResults()
                }
            }

            result.onFailure { error ->
                Toast.makeText(
                    requireContext(),
                    "Failed to load products: ${error.message}",
                    Toast.LENGTH_SHORT
                ).show()
                showEmptyState()
            }
        }
    }

    private fun setupSearchListener() {
        searchEditText.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}

            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                filterProducts(s.toString())
            }

            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun filterProducts(query: String) {
        val filtered = if (query.isEmpty()) {
            allProducts
        } else {
            allProducts.filter { product ->
                product.name.contains(query, ignoreCase = true) ||
                product.category?.contains(query, ignoreCase = true) == true
            }
        }

        if (filtered.isEmpty()) {
            showEmptyState()
        } else {
            searchAdapter?.updateProducts(filtered)
            showResults()
        }
    }

    private fun showResults() {
        emptyStateView.visibility = View.GONE
        searchResultsRecyclerView.visibility = View.VISIBLE
    }

    private fun showEmptyState() {
        emptyStateView.visibility = View.VISIBLE
        searchResultsRecyclerView.visibility = View.GONE
    }
}
