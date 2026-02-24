package com.craftly

import android.content.Intent
import android.os.Bundle
import android.widget.PopupMenu
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.auth.presentation.ui.LoginActivity
import com.craftly.core.network.NetworkConfig
import com.craftly.favorites.presentation.ui.FavoritesFragment
import com.craftly.orders.presentation.ui.OrdersFragment
import com.craftly.products.presentation.ui.MarketplaceFragment
import com.craftly.profile.presentation.ui.ProfileFragment
import com.craftly.cart.presentation.ui.CartFragment
import com.google.android.material.bottomnavigation.BottomNavigationView

class MainActivity : AppCompatActivity() {
    private lateinit var bottomNav: BottomNavigationView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize network configuration
        NetworkConfig.init(this)

        enableEdgeToEdge()

        // Check if user is logged in
        val prefsManager = SharedPreferencesManager(this)
        if (!prefsManager.isLoggedIn()) {
            // User not logged in - show login screen
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        // User is logged in - show main content
        setContentView(R.layout.activity_main)
        val mainView = findViewById<android.view.View>(R.id.main)
        ViewCompat.setOnApplyWindowInsetsListener(mainView) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        // Setup bottom navigation
        bottomNav = findViewById(R.id.bottomNavigation)
        setupBottomNavigation()

        // Load initial fragment (Marketplace)
        if (savedInstanceState == null) {
            bottomNav.selectedItemId = R.id.nav_browse
        }
    }

    private fun setupBottomNavigation() {
        bottomNav.setOnItemSelectedListener { menuItem ->
            val fragment = when (menuItem.itemId) {
                R.id.nav_browse -> MarketplaceFragment()
                R.id.nav_favorites -> FavoritesFragment()
                R.id.nav_cart -> CartFragment()
                R.id.nav_orders -> OrdersFragment()
                R.id.nav_profile -> ProfileFragment()
                else -> MarketplaceFragment()
            }

            supportFragmentManager.beginTransaction()
                .setReorderingAllowed(true)
                .replace(R.id.fragmentContainerView, fragment)
                .commit()

            true
        }
    }

    fun logout() {
        val prefsManager = SharedPreferencesManager(this)
        prefsManager.clearUser()

        // Redirect to login
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }
}