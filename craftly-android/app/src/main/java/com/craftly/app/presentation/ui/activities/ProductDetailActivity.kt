package com.craftly.app.presentation.ui.activities

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.ViewPager2
import com.craftly.app.R
import com.craftly.app.data.api.RetrofitClient
import com.craftly.app.data.model.Product
import com.craftly.app.data.model.Review
import com.craftly.app.data.model.User
import com.craftly.app.presentation.ui.adapters.ImageCarouselAdapter
import com.craftly.app.presentation.ui.adapters.ReviewAdapter
import com.google.gson.Gson
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ProductDetailActivity : AppCompatActivity() {

    private val TAG = "ProductDetailActivity"
    private var apiService: com.craftly.app.data.api.ApiService? = null
    private val gson = Gson()

    private lateinit var backButton: ImageView
    private lateinit var favoriteButton: ImageView
    private lateinit var loadingProgressBar: ProgressBar
    private lateinit var imageViewPager: ViewPager2
    private lateinit var pageIndicator: View
    private lateinit var productName: TextView
    private lateinit var productRating: TextView
    private lateinit var reviewCount: TextView
    private lateinit var sellerName: TextView
    private lateinit var productPrice: TextView
    private lateinit var productDescription: TextView
    private lateinit var materialsUsed: TextView
    private lateinit var stockCount: TextView
    private lateinit var decrementQuantity: android.widget.Button
    private lateinit var quantityInput: android.widget.EditText
    private lateinit var incrementQuantity: android.widget.Button
    private lateinit var addToCartButton: android.widget.Button
    private lateinit var buyNowButton: android.widget.Button
    private lateinit var reviewsRecyclerView: RecyclerView
    private lateinit var noReviewsMessage: TextView
    private lateinit var reviewsLoadingProgress: ProgressBar
    private lateinit var deliveryMethodsText: TextView

    private var productId: String? = null
    private var product: Product? = null
    private var seller: User? = null
    private var quantity = 1
    private var selectedImageIndex = 0
    private var reviews: MutableList<Review> = mutableListOf()
    private lateinit var reviewAdapter: ReviewAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "===== ProductDetailActivity onCreate START =====")
        setContentView(R.layout.activity_product_detail)
        Log.d(TAG, "✓ Layout set")
        apiService = RetrofitClient.getApiService()
        Log.d(TAG, "✓ API Service initialized: ${apiService != null}")

        Log.d(TAG, "ProductDetailActivity created")

        productId = intent.getStringExtra("productId")
        Log.d(TAG, "onCreate: Product ID = $productId")

        if (productId == null) {
            Log.e(TAG, "Product ID not provided!")
            Toast.makeText(this, "Product not found", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        try {
            Log.d(TAG, "Calling initializeViews()...")
            initializeViews()
            Log.d(TAG, "✓ initializeViews() completed")

            Log.d(TAG, "Calling setupListeners()...")
            setupListeners()
            Log.d(TAG, "✓ setupListeners() completed")

            Log.d(TAG, "Calling setupReviewsRecyclerView()...")
            setupReviewsRecyclerView()
            Log.d(TAG, "✓ setupReviewsRecyclerView() completed")

            Log.d(TAG, "Calling loadProductDetails()...")
            loadProductDetails()
            Log.d(TAG, "✓ loadProductDetails() called (async)")
        } catch (e: Exception) {
            Log.e(TAG, "Error in onCreate: ${e.message}", e)
            e.printStackTrace()
            Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            finish()
        }
        Log.d(TAG, "===== ProductDetailActivity onCreate END =====")
    }

    private fun initializeViews() {
        try {
            Log.d(TAG, "Starting view initialization...")
            backButton = findViewById(R.id.backButton)
            Log.d(TAG, "✓ backButton initialized")
            favoriteButton = findViewById(R.id.favoriteButton)
            Log.d(TAG, "✓ favoriteButton initialized")
            loadingProgressBar = findViewById(R.id.loadingProgressBar)
            Log.d(TAG, "✓ loadingProgressBar initialized")
            imageViewPager = findViewById(R.id.imageViewPager)
            Log.d(TAG, "✓ imageViewPager initialized")
            pageIndicator = findViewById(R.id.pageIndicator)
            Log.d(TAG, "✓ pageIndicator initialized")
            productName = findViewById(R.id.productName)
            Log.d(TAG, "✓ productName initialized")
            productRating = findViewById(R.id.productRating)
            Log.d(TAG, "✓ productRating initialized")
            reviewCount = findViewById(R.id.reviewCount)
            Log.d(TAG, "✓ reviewCount initialized")
            sellerName = findViewById(R.id.sellerName)
            Log.d(TAG, "✓ sellerName initialized")
            productPrice = findViewById(R.id.productPrice)
            Log.d(TAG, "✓ productPrice initialized")
            productDescription = findViewById(R.id.productDescription)
            Log.d(TAG, "✓ productDescription initialized")
            materialsUsed = findViewById(R.id.materialsUsed)
            Log.d(TAG, "✓ materialsUsed initialized")
            stockCount = findViewById(R.id.stockCount)
            Log.d(TAG, "✓ stockCount initialized")
            decrementQuantity = findViewById(R.id.decrementQuantity)
            Log.d(TAG, "✓ decrementQuantity initialized")
            quantityInput = findViewById(R.id.quantityInput)
            Log.d(TAG, "✓ quantityInput initialized")
            incrementQuantity = findViewById(R.id.incrementQuantity)
            Log.d(TAG, "✓ incrementQuantity initialized")
            addToCartButton = findViewById(R.id.addToCartButton)
            Log.d(TAG, "✓ addToCartButton initialized")
            buyNowButton = findViewById(R.id.buyNowButton)
            Log.d(TAG, "✓ buyNowButton initialized")
            reviewsRecyclerView = findViewById(R.id.reviewsRecyclerView)
            Log.d(TAG, "✓ reviewsRecyclerView initialized")
            noReviewsMessage = findViewById(R.id.noReviewsMessage)
            Log.d(TAG, "✓ noReviewsMessage initialized")
            reviewsLoadingProgress = findViewById(R.id.reviewsLoadingProgress)
            Log.d(TAG, "✓ reviewsLoadingProgress initialized")
            deliveryMethodsText = findViewById(R.id.deliveryMethodsText)
            Log.d(TAG, "✓ deliveryMethodsText initialized")

            Log.d(TAG, "All views initialized successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing views: ${e.message}", e)
            e.printStackTrace()
            throw e
        }
    }

    private fun setupListeners() {
        backButton.setOnClickListener {
            Log.d(TAG, "Back button clicked")
            finish()
        }

        favoriteButton.setOnClickListener {
            Log.d(TAG, "Favorite button clicked")
            toggleFavorite()
        }

        decrementQuantity.setOnClickListener {
            updateQuantity(quantity - 1)
        }

        incrementQuantity.setOnClickListener {
            updateQuantity(quantity + 1)
        }

        quantityInput.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                val newQuantity = quantityInput.text.toString().toIntOrNull() ?: 1
                updateQuantity(newQuantity)
            }
        }

        addToCartButton.setOnClickListener {
            addToCart()
        }

        buyNowButton.setOnClickListener {
            buyNow()
        }

        imageViewPager.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                selectedImageIndex = position
                updatePageIndicators()
            }
        })
    }

    private fun setupReviewsRecyclerView() {
        reviewAdapter = ReviewAdapter(reviews)
        reviewsRecyclerView.layoutManager = LinearLayoutManager(this)
        reviewsRecyclerView.adapter = reviewAdapter
    }

    private fun loadProductDetails() {
        Log.d(TAG, "Loading product details for ID: $productId")
        loadingProgressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                Log.d(TAG, "Coroutine started for product loading")
                if (apiService == null) {
                    Log.e(TAG, "API Service is NULL!")
                    throw Exception("API Service is null")
                }
                Log.d(TAG, "API Service is OK, making network call...")

                val response = withContext(Dispatchers.IO) {
                    Log.d(TAG, "Making API call for product ID: $productId")
                    val result = apiService!!.getProductById(productId!!)
                    Log.d(TAG, "API call completed, response received")
                    result
                }

                Log.d(TAG, "API Response: success=${response.success}, hasData=${response.data != null}")
                if (response.data != null) {
                    Log.d(TAG, "Product name: ${response.data!!.name}")
                }

                if (response.success && response.data != null) {
                    product = response.data
                    Log.d(TAG, "✓ Product loaded: ${product?.name}")
                    displayProductDetails()
                    loadReviews()
                    fetchSellerName()
                } else {
                    Log.e(TAG, "Failed to load product: ${response.message}")
                    Toast.makeText(
                        this@ProductDetailActivity,
                        "Failed to load product: ${response.message}",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            } catch (e: Exception) {
                Log.e(TAG, "CRASH! Error loading product: ${e.message}", e)
                e.printStackTrace()
                Toast.makeText(
                    this@ProductDetailActivity,
                    "Error loading product: ${e.message}",
                    Toast.LENGTH_LONG
                ).show()
            } finally {
                loadingProgressBar.visibility = View.GONE
            }
        }
    }

    private fun displayProductDetails() {
        Log.d(TAG, "Displaying product details")
        product?.let { p ->
            try {
                productName.text = p.name
                productPrice.text = "₱${String.format("%.2f", p.price)}"
                productDescription.text = if (p.description.isEmpty()) "No description" else p.description
                materialsUsed.text =
                    if (p.materialsUsed.isEmpty()) "Not specified" else p.materialsUsed
                stockCount.text = "${p.stock} in stock"
                productRating.text = if (p.rating > 0) String.format("%.1f", p.rating) else "No rating"
                reviewCount.text = "(${p.reviewCount} reviews)"

                // Set up image carousel
                if (p.images.isNotEmpty()) {
                    try {
                        val carouselAdapter = ImageCarouselAdapter(p.images)
                        imageViewPager.adapter = carouselAdapter
                        updatePageIndicators()
                    } catch (e: Exception) {
                        Log.e(TAG, "Error setting carousel: ${e.message}")
                    }
                } else {
                    Log.w(TAG, "No images for product")
                }

                // Disable buttons if out of stock
                if (p.stock <= 0) {
                    addToCartButton.isEnabled = false
                    buyNowButton.isEnabled = false
                    addToCartButton.text = "Out of Stock"
                    incrementQuantity.isEnabled = false
                    quantityInput.isEnabled = false
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error displaying product details: ${e.message}", e)
                Toast.makeText(this, "Error displaying details: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updatePageIndicators() {
        try {
            val dotsLayout = findViewById<android.widget.LinearLayout>(R.id.pageIndicator)
            dotsLayout.removeAllViews()

            product?.images?.forEachIndexed { index, _ ->
                val dot = View(this)
                val dotSize = 8
                val layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.util.TypedValue.applyDimension(
                        android.util.TypedValue.COMPLEX_UNIT_DIP,
                        dotSize.toFloat(),
                        resources.displayMetrics
                    ).toInt(),
                    android.util.TypedValue.applyDimension(
                        android.util.TypedValue.COMPLEX_UNIT_DIP,
                        dotSize.toFloat(),
                        resources.displayMetrics
                    ).toInt()
                )
                layoutParams.setMargins(4, 0, 4, 0)
                dot.layoutParams = layoutParams
                dot.setBackgroundColor(
                    if (index == selectedImageIndex)
                        getColor(R.color.md_theme_light_primary)
                    else
                        getColor(R.color.md_theme_light_surfaceVariant)
                )
                dotsLayout.addView(dot)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error updating page indicators: ${e.message}")
        }
    }

    private fun fetchSellerName() {
        product?.let { p ->
            Log.d(TAG, "Fetching seller profile for: ${p.createdBy}")
            try {
                lifecycleScope.launch {
                    Log.d(TAG, "Seller coroutine scope created")
                    try {
                        if (apiService == null) {
                            Log.e(TAG, "API Service is null when fetching seller")
                            return@launch
                        }
                        Log.d(TAG, "Calling API for seller profile...")

                        val response = withContext(Dispatchers.IO) {
                            Log.d(TAG, "Making seller API call with ID: ${p.createdBy}")
                            val result = apiService!!.getUserProfile(p.createdBy)
                            Log.d(TAG, "Seller API response received")
                            result
                        }

                        Log.d(TAG, "Seller response back on main thread: success=${response.success}, hasData=${response.data != null}")

                        if (response.success && response.data != null) {
                            seller = response.data
                            Log.d(TAG, "Seller loaded: ${seller?.fullName}")
                            Log.d(TAG, "Calling displaySellerInfo()...")
                            displaySellerInfo()
                            Log.d(TAG, "✓ displaySellerInfo() returned")
                        } else {
                            Log.w(TAG, "Failed to load seller: ${response.message}")
                            sellerName.text = "Unknown Seller"
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "CRASH! Error in seller coroutine: ${e.message}", e)
                        e.printStackTrace()
                        try {
                            sellerName.text = "Unknown Seller"
                        } catch (ex: Exception) {
                            Log.e(TAG, "Even setting seller name failed: ${ex.message}")
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "CRASH! Error creating seller coroutine: ${e.message}", e)
                e.printStackTrace()
            }
        }
    }

    private fun displaySellerInfo() {
        Log.d(TAG, "displaySellerInfo() called")
        seller?.let { s ->
            try {
                Log.d(TAG, "Seller object exists, fullName: ${s.fullName}")

                Log.d(TAG, "Setting seller name text...")
                sellerName.text = s.fullName
                Log.d(TAG, "✓ Seller name text set")

                Log.d(TAG, "Setting seller name click listener...")
                sellerName.setOnClickListener {
                    Log.d(TAG, "Seller name clicked")
                    try {
                        val intent = Intent(this@ProductDetailActivity, SellerProfileActivity::class.java)
                        intent.putExtra("sellerId", s.uid)
                        startActivity(intent)
                        Log.d(TAG, "✓ Seller profile activity started")
                    } catch (e: Exception) {
                        Log.e(TAG, "Error starting seller profile activity: ${e.message}")
                    }
                }
                Log.d(TAG, "✓ Click listener set")

                // Display delivery methods
                Log.d(TAG, "Processing delivery methods: allowShipping=${s.allowShipping}, allowPickup=${s.allowPickup}")
                val deliveryMethods = mutableListOf<String>()
                if (s.allowShipping) {
                    deliveryMethods.add("Shipping Available")
                }
                if (s.allowPickup) {
                    deliveryMethods.add("Local Pickup Available")
                }

                Log.d(TAG, "Delivery methods: $deliveryMethods")
                Log.d(TAG, "Setting delivery methods text...")
                if (deliveryMethods.isEmpty()) {
                    deliveryMethodsText.text = "No delivery methods available"
                } else {
                    deliveryMethodsText.text = "Delivery: ${deliveryMethods.joinToString(", ")}"
                }
                Log.d(TAG, "✓ Delivery methods text set")

                Log.d(TAG, "Seller info displayed: ${s.fullName}, Methods: $deliveryMethods")
            } catch (e: Exception) {
                Log.e(TAG, "CRASH! Error displaying seller info: ${e.message}", e)
                e.printStackTrace()
                try {
                    sellerName.text = "Unknown Seller"
                    deliveryMethodsText.text = "Delivery info unavailable"
                } catch (ex: Exception) {
                    Log.e(TAG, "Error setting fallback seller info: ${ex.message}")
                }
            }
        }
    }

    private fun loadReviews() {
        Log.d(TAG, "Loading reviews for product: $productId")
        reviewsLoadingProgress.visibility = View.VISIBLE

        lifecycleScope.launch {
            Log.d(TAG, "Reviews coroutine launched")
            try {
                if (apiService == null) {
                    Log.e(TAG, "API Service is null when loading reviews")
                    return@launch
                }
                Log.d(TAG, "Making reviews API call...")

                val response = withContext(Dispatchers.IO) {
                    Log.d(TAG, "IO thread - calling getReviews API...")
                    val result = apiService!!.getReviews(productId!!)
                    Log.d(TAG, "Reviews API response received")
                    result
                }

                Log.d(TAG, "Back on main thread with reviews response: success=${response.success}, hasData=${response.data != null}")

                if (response.success && response.data != null) {
                    Log.d(TAG, "Processing reviews data...")
                    val reviewsData = response.data
                    Log.d(TAG, "Review data keys: ${reviewsData.keys}")

                    @Suppress("UNCHECKED_CAST")
                    val reviewList = reviewsData["reviews"] as? List<Map<String, Any>> ?: emptyList()
                    Log.d(TAG, "Extracted ${reviewList.size} reviews from data")

                    Log.d(TAG, "Mapping review objects...")
                    reviews = reviewList.map { reviewMap ->
                        try {
                            Review(
                                id = (reviewMap["id"] as? String) ?: "",
                                userId = (reviewMap["userId"] as? String) ?: "",
                                userName = (reviewMap["userName"] as? String) ?: "Anonymous",
                                rating = (reviewMap["rating"] as? Number)?.toInt() ?: 5,
                                comment = (reviewMap["comment"] as? String) ?: "",
                                createdAt = when (val date = reviewMap["createdAt"]) {
                                    is String -> {
                                        try {
                                            SimpleDateFormat(
                                                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                                                Locale.getDefault()
                                            ).parse(date)?.time ?: System.currentTimeMillis()
                                        } catch (e: Exception) {
                                            System.currentTimeMillis()
                                        }
                                    }

                                    is Number -> date.toLong()
                                    else -> System.currentTimeMillis()
                                }
                            )
                        } catch (e: Exception) {
                            Log.e(TAG, "Error mapping review: ${e.message}")
                            Review()
                        }
                    }.toMutableList()

                    Log.d(TAG, "✓ Mapped ${reviews.size} reviews successfully")

                    if (reviews.isEmpty()) {
                        Log.d(TAG, "No reviews found, showing no reviews message")
                        noReviewsMessage.visibility = View.VISIBLE
                        reviewsRecyclerView.visibility = View.GONE
                    } else {
                        Log.d(TAG, "Found ${reviews.size} reviews, updating adapter...")
                        reviewsRecyclerView.visibility = View.VISIBLE
                        noReviewsMessage.visibility = View.GONE
                        Log.d(TAG, "Calling adapter.updateReviews()...")
                        reviewAdapter.updateReviews(reviews)
                        Log.d(TAG, "✓ Adapter updated successfully")
                    }
                } else {
                    Log.w(TAG, "No reviews or error loading reviews: ${response.message}")
                    noReviewsMessage.visibility = View.VISIBLE
                    reviewsRecyclerView.visibility = View.GONE
                }
            } catch (e: Exception) {
                Log.e(TAG, "CRASH! Error loading reviews: ${e.message}", e)
                e.printStackTrace()
                try {
                    noReviewsMessage.visibility = View.VISIBLE
                    reviewsRecyclerView.visibility = View.GONE
                } catch (ex: Exception) {
                    Log.e(TAG, "Error setting reviews UI on crash: ${ex.message}")
                }
            } finally {
                try {
                    Log.d(TAG, "Finally block: hiding reviews progress bar")
                    reviewsLoadingProgress.visibility = View.GONE
                    Log.d(TAG, "✓ Reviews loading complete")
                } catch (e: Exception) {
                    Log.e(TAG, "Error hiding reviews progress bar: ${e.message}")
                }
            }
        }
    }

    private fun updateQuantity(newQuantity: Int) {
        product?.let { p ->
            val validQuantity = newQuantity.coerceIn(1, p.stock)
            quantity = validQuantity
            quantityInput.setText(quantity.toString())
            Log.d(TAG, "Quantity updated to: $quantity")
        }
    }

    private fun toggleFavorite() {
        Toast.makeText(this, "Added to favorites", Toast.LENGTH_SHORT).show()
    }

    private fun addToCart() {
        Log.d(TAG, "Adding to cart. Quantity: $quantity")
        product?.let { p ->
            if (quantity > p.stock) {
                Toast.makeText(
                    this,
                    "Only ${p.stock} items available",
                    Toast.LENGTH_SHORT
                ).show()
                return
            }

            Toast.makeText(this, "Added $quantity item(s) to cart", Toast.LENGTH_SHORT).show()
            quantity = 1
            quantityInput.setText("1")
        }
    }

    private fun buyNow() {
        Log.d(TAG, "Buy now clicked. Quantity: $quantity")
        product?.let { p ->
            if (quantity > p.stock) {
                Toast.makeText(
                    this,
                    "Only ${p.stock} items available",
                    Toast.LENGTH_SHORT
                ).show()
                return
            }

            Toast.makeText(this, "Redirecting to checkout", Toast.LENGTH_SHORT).show()
        }
    }
}
