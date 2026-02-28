package com.craftly.products.presentation.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.craftly.R
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.core.network.RetrofitClient
import com.craftly.databinding.ActivitySellerProductsBinding
import com.craftly.databinding.ItemSellerProductBinding
import com.craftly.products.data.models.Product
import com.craftly.products.data.repository.ProductRepository
import com.craftly.products.presentation.viewmodels.SellerProductsUiState
import com.craftly.products.presentation.viewmodels.SellerProductsViewModel

class SellerProductsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySellerProductsBinding
    private lateinit var viewModel: SellerProductsViewModel
    private lateinit var adapter: SellerProductsAdapter
    private lateinit var userId: String
    private var highlightProductId: String? = null
    private var autoOpenedEdit = false

    // Launcher — refreshes products when the form activity returns RESULT_OK
    private val productFormLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            viewModel.loadProducts()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySellerProductsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val prefsManager = SharedPreferencesManager(this)
        userId = prefsManager.getUser()?.uid ?: run {
            Toast.makeText(this, "Please log in again", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        setupViewModel()
        setupRecyclerView()
        setupClickListeners()
        observeViewModel()

        highlightProductId = intent.getStringExtra("product_id")
        viewModel.loadProducts()
    }

    private fun setupViewModel() {
        val apiService = RetrofitClient.createProductApiService()
        val repository = ProductRepository(apiService)

        val factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                return SellerProductsViewModel(repository, userId) as T
            }
        }
        viewModel = ViewModelProvider(this, factory)[SellerProductsViewModel::class.java]
    }

    private fun setupRecyclerView() {
        adapter = SellerProductsAdapter(
            onEditClick = { product ->
                productFormLauncher.launch(ProductFormActivity.createIntent(this, product))
            },
            onDeleteClick = { product -> confirmDelete(product) }
        )
        binding.productsRecyclerView.apply {
            layoutManager = LinearLayoutManager(this@SellerProductsActivity)
            adapter = this@SellerProductsActivity.adapter
        }
    }

    private fun setupClickListeners() {
        binding.backButton.setOnClickListener { finish() }
        binding.addProductButton.setOnClickListener {
            productFormLauncher.launch(ProductFormActivity.createIntent(this))
        }
    }

    private fun observeViewModel() {
        viewModel.uiState.observe(this) { state ->
            when (state) {
                is SellerProductsUiState.Loading -> {
                    binding.loadingProgressBar.visibility = View.VISIBLE
                    binding.productsRecyclerView.visibility = View.GONE
                    binding.emptyStateContainer.visibility = View.GONE
                }
                is SellerProductsUiState.Success -> {
                    binding.loadingProgressBar.visibility = View.GONE
                    if (state.products.isEmpty()) {
                        binding.emptyStateContainer.visibility = View.VISIBLE
                        binding.productsRecyclerView.visibility = View.GONE
                    } else {
                        binding.emptyStateContainer.visibility = View.GONE
                        binding.productsRecyclerView.visibility = View.VISIBLE
                        adapter.updateData(state.products)
                        // Auto-open edit form if launched from product detail
                        if (!highlightProductId.isNullOrEmpty() && !autoOpenedEdit) {
                            state.products.find { it.id == highlightProductId }?.let { product ->
                                autoOpenedEdit = true
                                productFormLauncher.launch(ProductFormActivity.createIntent(this, product))
                            }
                        }
                    }
                }
                is SellerProductsUiState.Error -> {
                    binding.loadingProgressBar.visibility = View.GONE
                    binding.emptyStateContainer.visibility = View.VISIBLE
                    binding.productsRecyclerView.visibility = View.GONE
                    Toast.makeText(this, state.message, Toast.LENGTH_LONG).show()
                }
            }
        }

        viewModel.message.observe(this) { msg ->
            Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
        }
    }

    private fun confirmDelete(product: Product) {
        AlertDialog.Builder(this)
            .setTitle("Delete Product")
            .setMessage("Are you sure you want to delete \"${product.name}\"? This cannot be undone.")
            .setPositiveButton("Delete") { dialog, _ ->
                viewModel.deleteProduct(product.id, product.name)
                dialog.dismiss()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ── Inner adapter ──────────────────────────────────────────────────────────

    class SellerProductsAdapter(
        private var products: MutableList<Product> = mutableListOf(),
        private val onEditClick: (Product) -> Unit,
        private val onDeleteClick: (Product) -> Unit
    ) : RecyclerView.Adapter<SellerProductsAdapter.ViewHolder>() {

        fun updateData(newProducts: List<Product>) {
            val diffResult = DiffUtil.calculateDiff(object : DiffUtil.Callback() {
                override fun getOldListSize() = products.size
                override fun getNewListSize() = newProducts.size
                override fun areItemsTheSame(o: Int, n: Int) = products[o].id == newProducts[n].id
                override fun areContentsTheSame(o: Int, n: Int) =
                    products[o].name == newProducts[n].name &&
                    products[o].price == newProducts[n].price &&
                    products[o].stock == newProducts[n].stock
            })
            products = newProducts.toMutableList()
            diffResult.dispatchUpdatesTo(this)
        }

        inner class ViewHolder(val binding: ItemSellerProductBinding) :
            RecyclerView.ViewHolder(binding.root)

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val binding = ItemSellerProductBinding.inflate(
                LayoutInflater.from(parent.context), parent, false
            )
            return ViewHolder(binding)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val product = products[position]
            with(holder.binding) {
                // Image
                Glide.with(root.context)
                    .load(if (product.images.isNotEmpty()) product.images[0] else null)
                    .centerCrop()
                    .transition(com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions.withCrossFade(200))
                    .into(sellerProductImage)
                sellerProductName.text = product.name
                sellerProductCategory.text = product.category
                sellerProductPrice.text = String.format("₱ %.0f", product.price)
                sellerProductStock.text = "${product.stock} in stock"

                editProductButton.setOnClickListener { onEditClick(product) }
                deleteProductButton.setOnClickListener { onDeleteClick(product) }
            }
        }

        override fun getItemCount() = products.size
    }
}
