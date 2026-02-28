package com.craftly

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.ViewModelProvider
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.auth.presentation.ui.LoginActivity
import com.craftly.cart.data.repository.CartRepository
import com.craftly.core.network.NetworkConfig
import com.craftly.core.network.RetrofitClient
import com.craftly.core.viewmodels.SharedCartViewModel
import com.craftly.core.viewmodels.SharedCartViewModelFactory
import com.craftly.core.viewmodels.SharedNotificationsViewModel
import com.craftly.core.viewmodels.SharedNotificationsViewModelFactory
import com.craftly.favorites.presentation.ui.FavoritesFragment
import com.craftly.notifications.data.repository.NotificationsRepository
import com.craftly.notifications.presentation.ui.NotificationsFragment
import com.craftly.orders.presentation.ui.OrdersFragment
import com.craftly.products.presentation.ui.MarketplaceFragment
import com.craftly.profile.presentation.ui.ProfileFragment
import com.craftly.cart.presentation.ui.CartFragment
import com.google.android.material.bottomnavigation.BottomNavigationView

class MainActivity : AppCompatActivity() {
    internal lateinit var bottomNav: BottomNavigationView
    private lateinit var notificationBadge: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize network configuration
        NetworkConfig.init(this)

        enableEdgeToEdge()

        // Check if user is logged in
        val prefsManager = SharedPreferencesManager(this)
        if (!prefsManager.isLoggedIn()) {
            startActivity(Intent(this, LoginActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            })
            finish()
            return
        }

        // User is logged in - show main content
        setContentView(R.layout.activity_main)
        val mainView = findViewById<View>(R.id.main)
        ViewCompat.setOnApplyWindowInsetsListener(mainView) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        // Setup bottom navigation
        bottomNav = findViewById(R.id.bottomNavigation)
        setupBottomNavigation()

        // Cart badge
        val cartApiService = RetrofitClient.createCartApiService()
        val cartRepository = CartRepository(cartApiService, prefsManager)
        val cartViewModel = ViewModelProvider(
            this,
            SharedCartViewModelFactory(cartRepository)
        )[SharedCartViewModel::class.java]
        cartViewModel.refreshCart()
        cartViewModel.cartItemCount.observe(this) { count ->
            if (count > 0) {
                bottomNav.getOrCreateBadge(R.id.nav_cart).number = count
            } else {
                bottomNav.removeBadge(R.id.nav_cart)
            }
        }

        // Notification badge
        notificationBadge = findViewById(R.id.notificationBadgeText)
        val notificationsApiService = RetrofitClient.createNotificationsApiService()
        val notificationsRepository = NotificationsRepository(notificationsApiService)
        val notificationsViewModel = ViewModelProvider(
            this,
            SharedNotificationsViewModelFactory(notificationsRepository)
        )[SharedNotificationsViewModel::class.java]

        val user = prefsManager.getUser()
        if (user != null) {
            notificationsViewModel.refreshUnreadCount(user.uid)
        }

        notificationsViewModel.unreadCount.observe(this) { count ->
            if (count > 0) {
                notificationBadge.text = if (count > 99) "99+" else count.toString()
                notificationBadge.visibility = View.VISIBLE
            } else {
                notificationBadge.visibility = View.GONE
            }
        }

        // Notification bell click — open NotificationsFragment
        findViewById<View>(R.id.notificationBellButton).setOnClickListener {
            openNotificationsFragment()
        }

        // Load initial fragment (Marketplace)
        if (savedInstanceState == null) {
            bottomNav.selectedItemId = R.id.nav_browse
        }
    }

    private fun openNotificationsFragment() {
        supportFragmentManager.beginTransaction()
            .setCustomAnimations(R.anim.fade_in, R.anim.fade_out, R.anim.fade_in, R.anim.fade_out)
            .replace(R.id.fragmentContainerView, NotificationsFragment())
            .addToBackStack("notifications")
            .commit()
    }

    private fun setupBottomNavigation() {
        bottomNav.setOnItemSelectedListener { menuItem ->
            // Pop any back stack before switching tabs
            supportFragmentManager.popBackStack()

            val fragment = when (menuItem.itemId) {
                R.id.nav_browse -> MarketplaceFragment()
                R.id.nav_favorites -> FavoritesFragment()
                R.id.nav_cart -> CartFragment()
                R.id.nav_orders -> OrdersFragment()
                R.id.nav_profile -> ProfileFragment()
                else -> MarketplaceFragment()
            }

            supportFragmentManager.beginTransaction()
                .setCustomAnimations(R.anim.fade_in, R.anim.fade_out)
                .setReorderingAllowed(true)
                .replace(R.id.fragmentContainerView, fragment)
                .commit()

            true
        }
    }

    fun logout() {
        val prefsManager = SharedPreferencesManager(this)
        prefsManager.clearUser()
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }
}
