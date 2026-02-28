package com.craftly.products.presentation.ui

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.craftly.core.network.NetworkConfig
import com.craftly.databinding.ActivitySellerProfileBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.overlay.Marker
import java.net.URL

class SellerProfileActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySellerProfileBinding

    companion object {
        private const val EXTRA_SELLER_ID = "seller_id"
        private const val EXTRA_SELLER_NAME = "seller_name"

        // Dagupan City center coordinates
        private const val DAGUPAN_LAT = 16.0435
        private const val DAGUPAN_LNG = 120.3333

        fun createIntent(context: Context, sellerId: String, sellerName: String): Intent =
            Intent(context, SellerProfileActivity::class.java).apply {
                putExtra(EXTRA_SELLER_ID, sellerId)
                putExtra(EXTRA_SELLER_NAME, sellerName)
            }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySellerProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val sellerId = intent.getStringExtra(EXTRA_SELLER_ID) ?: run { finish(); return }
        val sellerName = intent.getStringExtra(EXTRA_SELLER_NAME) ?: "Seller"

        binding.backButton.setOnClickListener { finish() }

        // Show basic info immediately
        binding.sellerFullName.text = sellerName
        binding.sellerInitial.text = sellerName.firstOrNull()?.uppercaseChar()?.toString() ?: "?"

        // Set up osmdroid (OpenStreetMap) — no API key required
        setupMap()

        // Fetch richer seller profile (shop name + address) in background
        fetchSellerProfile(sellerId)
    }

    private fun setupMap() {
        // Required: set a user agent so tile servers know who's requesting
        Configuration.getInstance().userAgentValue = packageName

        val center = GeoPoint(DAGUPAN_LAT, DAGUPAN_LNG)

        with(binding.mapView) {
            setTileSource(TileSourceFactory.MAPNIK) // OpenStreetMap tiles
            setMultiTouchControls(true)
            controller.setZoom(14.0)
            controller.setCenter(center)

            // Disable scroll so the map doesn't fight with the outer ScrollView
            isClickable = true

            // Add a marker at Dagupan center
            val marker = Marker(this).apply {
                position = center
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                title = "Dagupan City, Pangasinan"
            }
            overlays.add(marker)
        }
    }

    private fun fetchSellerProfile(sellerId: String) {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val baseUrl = NetworkConfig.getBaseUrl().trimEnd('/')
                val apiUrl = "$baseUrl/api/profile/$sellerId"
                val json = URL(apiUrl).readText()
                val root = JSONObject(json)
                val data = root.optJSONObject("data") ?: root

                val shopName = data.optString("shopName", "").ifEmpty { null }
                val shopAddress = data.optString("shopAddress", "").ifEmpty { null }
                val shopBarangay = data.optString("shopBarangay", "").ifEmpty { null }
                val shopCity = data.optString("shopCity", "Dagupan").ifEmpty { "Dagupan" }

                withContext(Dispatchers.Main) {
                    shopName?.let {
                        binding.sellerShopName.text = it
                        binding.sellerShopName.visibility = View.VISIBLE
                    }

                    val addressText = buildString {
                        shopAddress?.let { append(it) }
                        shopBarangay?.let { if (isNotEmpty()) append(", ") ; append(it) }
                        if (isNotEmpty()) append(", ")
                        append("$shopCity, Pangasinan")
                    }
                    binding.sellerAddress.text = addressText
                    binding.sellerAddress.visibility = View.VISIBLE

                    // Update map marker popup with actual address
                    val marker = binding.mapView.overlays.filterIsInstance<Marker>().firstOrNull()
                    marker?.title = addressText
                }
            } catch (e: Exception) {
                // Silently ignore — basic name + map still shows
                android.util.Log.w("SellerProfileActivity", "Could not load seller details: ${e.message}")
            }
        }
    }

    override fun onResume() {
        super.onResume()
        binding.mapView.onResume()
    }

    override fun onPause() {
        super.onPause()
        binding.mapView.onPause()
    }
}
