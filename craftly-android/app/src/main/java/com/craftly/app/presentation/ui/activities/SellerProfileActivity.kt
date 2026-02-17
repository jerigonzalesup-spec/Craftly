package com.craftly.app.presentation.ui.activities

import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.craftly.app.R
import com.craftly.app.data.api.ApiService
import com.craftly.app.data.api.RetrofitClient
import com.craftly.app.data.model.User
import com.craftly.app.presentation.ui.fragments.ProductAdapter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class SellerProfileActivity : AppCompatActivity() {

    private val TAG = "SellerProfileActivity"
    private val apiService by lazy {
        RetrofitClient.getApiService()
    }

    private lateinit var backButton: ImageView
    private lateinit var loadingProgressBar: ProgressBar
    private lateinit var sellerAvatar: TextView
    private lateinit var sellerName: TextView
    private lateinit var sellerInfo: TextView
    private lateinit var productsRecyclerView: RecyclerView
    private lateinit var noProductsMessage: TextView

    private var sellerId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_seller_profile)

        sellerId = intent.getStringExtra("sellerId")
        Log.d(TAG, "onCreate: Seller ID = $sellerId")

        if (sellerId == null) {
            Log.e(TAG, "Seller ID not provided")
            Toast.makeText(this, "Seller not found", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        initializeViews()
        setupListeners()
        loadSellerProfile()
    }

    private fun initializeViews() {
        backButton = findViewById(R.id.backButton)
        loadingProgressBar = findViewById(R.id.loadingProgressBar)
        sellerAvatar = findViewById(R.id.sellerAvatar)
        sellerName = findViewById(R.id.sellerName)
        sellerInfo = findViewById(R.id.sellerInfo)
        productsRecyclerView = findViewById(R.id.productsRecyclerView)
        noProductsMessage = findViewById(R.id.noProductsMessage)

        productsRecyclerView.layoutManager = GridLayoutManager(this, 2)
    }

    private fun setupListeners() {
        backButton.setOnClickListener {
            Log.d(TAG, "Back button clicked")
            finish()
        }
    }

    private fun loadSellerProfile() {
        Log.d(TAG, "Loading seller profile for: $sellerId")
        loadingProgressBar.visibility = View.VISIBLE

        CoroutineScope(Dispatchers.Main).launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getUserProfile(sellerId!!)
                }

                if (response.success && response.data != null) {
                    val seller = response.data
                    Log.d(TAG, "Seller loaded: ${seller.fullName}")
                    displaySellerProfile(seller)
                    loadSellerProducts()
                } else {
                    Log.e(TAG, "Failed to load seller: ${response.message}")
                    Toast.makeText(this@SellerProfileActivity, "Failed to load seller", Toast.LENGTH_SHORT).show()
                    finish()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading seller: ${e.message}", e)
                Toast.makeText(this@SellerProfileActivity, "Error loading seller", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }

    private fun displaySellerProfile(seller: User) {
        Log.d(TAG, "Displaying seller profile")
        sellerAvatar.text = seller.fullName.firstOrNull()?.uppercaseChar().toString()
        sellerName.text = seller.fullName

        val infoBuilder = StringBuilder()
        infoBuilder.append("Member since ${SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(Date(seller.createdAt))}\n")
        if (seller.shopName != null) {
            infoBuilder.append("Shop: ${seller.shopName}\n")
        }
        if (seller.shopAddress != null) {
            infoBuilder.append("${seller.shopAddress}, ${seller.shopBarangay}\n")
        }
        sellerInfo.text = infoBuilder.toString()
    }

    private fun loadSellerProducts() {
        Log.d(TAG, "Loading seller products for: $sellerId")
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService.getAllProducts()
                }

                if (response.success && response.data != null) {
                    val sellerProducts = response.data.filter { it.createdBy == sellerId }
                    Log.d(TAG, "Loaded ${sellerProducts.size} products for seller")

                    if (sellerProducts.isEmpty()) {
                        noProductsMessage.visibility = View.VISIBLE
                        productsRecyclerView.visibility = View.GONE
                    } else {
                        productsRecyclerView.visibility = View.VISIBLE
                        noProductsMessage.visibility = View.GONE
                        val adapter = ProductAdapter(sellerProducts)
                        productsRecyclerView.adapter = adapter
                    }
                } else {
                    noProductsMessage.visibility = View.VISIBLE
                    productsRecyclerView.visibility = View.GONE
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading seller products: ${e.message}", e)
                noProductsMessage.visibility = View.VISIBLE
                productsRecyclerView.visibility = View.GONE
            } finally {
                loadingProgressBar.visibility = View.GONE
            }
        }
    }
}
