package com.craftly.app.presentation.ui.activities

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.EditText
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
import com.craftly.app.presentation.ui.adapters.ImageCarouselAdapter
import com.craftly.app.presentation.ui.adapters.ReviewAdapter
import com.craftly.app.presentation.auth.AuthManager
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
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
    private lateinit var decrementQuantity: Button
    private lateinit var quantityInput: EditText
    private lateinit var incrementQuantity: Button
    private lateinit var addToCartButton: Button
    private lateinit var buyNowButton: Button
    private lateinit var reviewsRecyclerView: RecyclerView
    private lateinit var noReviewsMessage: TextView
    private lateinit var reviewsLoadingProgress: ProgressBar

    private var productId: String? = null
    private var product: Product? = null
    private var quantity = 1
    private var selectedImageIndex = 0
    private var reviews: MutableList<Review> = mutableListOf()
    private lateinit var reviewAdapter: ReviewAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        apiService = RetrofitClient.getApiService()
        
        setContentView(R.layout.activity_product_detail)

        productId = intent.getStringExtra("productId")
        Log.d(TAG, "onCreate: Product ID = $productId")

        if (productId == null) {
            Log.e(TAG, "Product ID not provided")
            Toast.makeText(this, "Product not found", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        initializeViews()
        setupListeners()
        setupReviewsRecyclerView()
        loadProductDetails()
    }

    private fun initializeViews() {
        backButton = findViewById(R.id.backButton)
        favoriteButton = findViewById(R.id.favoriteButton)
        loadingProgressBar = findViewById(R.id.loadingProgressBar)
        imageViewPager = findViewById(R.id.imageViewPager)
        pageIndicator = findViewById(R.id.pageIndicator)
        productName = findViewById(R.id.productName)
        productRating = findViewById(R.id.productRating)
        reviewCount = findViewById(R.id.reviewCount)
        sellerName = findViewById(R.id.sellerName)
        productPrice = findViewById(R.id.productPrice)
        productDescription = findViewById(R.id.productDescription)
        materialsUsed = findViewById(R.id.materialsUsed)
        stockCount = findViewById(R.id.stockCount)
        decrementQuantity = findViewById(R.id.decrementQuantity)
        quantityInput = findViewById(R.id.quantityInput)
        incrementQuantity = findViewById(R.id.incrementQuantity)
        addToCartButton = findViewById(R.id.addToCartButton)
        buyNowButton = findViewById(R.id.buyNowButton)
        reviewsRecyclerView = findViewById(R.id.reviewsRecyclerView)
        noReviewsMessage = findViewById(R.id.noReviewsMessage)
        reviewsLoadingProgress = findViewById(R.id.reviewsLoadingProgress)

        Log.d(TAG, "Views initialized")
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
            Log.d(TAG, "Decrement quantity clicked")
            updateQuantity(quantity - 1)
        }

        incrementQuantity.setOnClickListener {
            Log.d(TAG, "Increment quantity clicked")
            updateQuantity(quantity + 1)
        }

        quantityInput.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                val newQuantity = quantityInput.text.toString().toIntOrNull() ?: 1
                updateQuantity(newQuantity)
            }
        }

        addToCartButton.setOnClickListener {
            Log.d(TAG, "Add to cart clicked")
            addToCart()
        }

        buyNowButton.setOnClickListener {
            Log.d(TAG, "Buy now clicked")
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

        CoroutineScope(Dispatchers.Main).launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService!!.getProductById(productId!!)
                }

                if (response.success && response.data != null) {
                    product = response.data
                    Log.d(TAG, "Product loaded: ${product?.name}")
                    displayProductDetails()
                    loadReviews()
                    fetchSellerName()
                } else {
                    Log.e(TAG, "Failed to load product: ${response.message}")
                    Toast.makeText(this@ProductDetailActivity, "Failed to load product", Toast.LENGTH_SHORT).show()
                    finish()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading product: ${e.message}", e)
                Toast.makeText(this@ProductDetailActivity, "Error loading product", Toast.LENGTH_SHORT).show()
                finish()
            } finally {
                loadingProgressBar.visibility = View.GONE
            }
        }
    }

    private fun displayProductDetails() {
        Log.d(TAG, "Displaying product details")
        product?.let { p ->
            productName.text = p.name
            productPrice.text = "₱${String.format("%.2f", p.price)}"
            productDescription.text = p.description
            materialsUsed.text = p.materialsUsed
            stockCount.text = p.stock.toString()
            productRating.text = String.format("%.1f", p.rating)
            reviewCount.text = "(${p.reviewCount} reviews)"

            // Set up image carousel
            if (p.images.isNotEmpty()) {
                val carouselAdapter = ImageCarouselAdapter(p.images)
                imageViewPager.adapter = carouselAdapter
                updatePageIndicators()
            }

            // Disable buttons if out of stock
            if (p.stock <= 0) {
                addToCartButton.isEnabled = false
                buyNowButton.isEnabled = false
                addToCartButton.text = "Out of Stock"
                incrementQuantity.isEnabled = false
                quantityInput.isEnabled = false
            }
        }
    }

    private fun updatePageIndicators() {
        Log.d(TAG, "Updating page indicators. Current index: $selectedImageIndex")
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
    }

    private fun fetchSellerName() {
        product?.let { p ->
            Log.d(TAG, "Fetching seller name for: ${p.createdBy}")
            CoroutineScope(Dispatchers.Main).launch {
                try {
                    val response = withContext(Dispatchers.IO) {
                        apiService!!.getUserProfile(p.createdBy)
                    }

                    if (response.success && response.data != null) {
                        val user = response.data
                        sellerName.text = user.fullName
                        Log.d(TAG, "Seller name loaded: ${user.fullName}")

                        sellerName.setOnClickListener {
                            Log.d(TAG, "Seller name clicked")
                            val intent = Intent(this@ProductDetailActivity, SellerProfileActivity::class.java)
                            intent.putExtra("sellerId", p.createdBy)
                            startActivity(intent)
                        }
                    } else {
                        sellerName.text = "Unknown Seller"
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error fetching seller: ${e.message}")
                    sellerName.text = "Unknown Seller"
                }
            }
        }
    }

    private fun loadReviews() {
        Log.d(TAG, "Loading reviews for product: $productId")
        reviewsLoadingProgress.visibility = View.VISIBLE

        CoroutineScope(Dispatchers.Main).launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    apiService!!.getReviews(productId!!)
                }

                if (response.success && response.data != null) {
                    val reviewsData = response.data
                    @Suppress("UNCHECKED_CAST")
                    val reviewList = reviewsData["reviews"] as? List<Map<String, Any>> ?: emptyList()

                    reviews = reviewList.map { reviewMap ->
                        Review(
                            id = (reviewMap["id"] as? String) ?: "",
                            userId = (reviewMap["userId"] as? String) ?: "",
                            userName = (reviewMap["userName"] as? String) ?: "Anonymous",
                            rating = (reviewMap["rating"] as? Number)?.toInt() ?: 5,
                            comment = (reviewMap["comment"] as? String) ?: "",
                            createdAt = when (val date = reviewMap["createdAt"]) {
                                is String -> {
                                    try {
                                        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).parse(date)?.time ?: System.currentTimeMillis()
                                    } catch (e: Exception) {
                                        System.currentTimeMillis()
                                    }
                                }
                                is Number -> date.toLong()
                                else -> System.currentTimeMillis()
                            }
                        )
                    }.toMutableList()

                    Log.d(TAG, "Loaded ${reviews.size} reviews")

                    if (reviews.isEmpty()) {
                        noReviewsMessage.visibility = View.VISIBLE
                        reviewsRecyclerView.visibility = View.GONE
                    } else {
                        reviewsRecyclerView.visibility = View.VISIBLE
                        noReviewsMessage.visibility = View.GONE
                        reviewAdapter.updateReviews(reviews)
                    }
                } else {
                    Log.w(TAG, "No reviews found or error loading reviews")
                    noReviewsMessage.visibility = View.VISIBLE
                    reviewsRecyclerView.visibility = View.GONE
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading reviews: ${e.message}", e)
                noReviewsMessage.visibility = View.VISIBLE
                reviewsRecyclerView.visibility = View.GONE
            } finally {
                reviewsLoadingProgress.visibility = View.GONE
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
        // TODO: Implement favorites functionality with Firestore
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

            // TODO: Implement cart functionality
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

            // TODO: Implement buy now functionality - redirect to checkout
            Toast.makeText(this, "Redirecting to checkout", Toast.LENGTH_SHORT).show()
        }
    }
}
