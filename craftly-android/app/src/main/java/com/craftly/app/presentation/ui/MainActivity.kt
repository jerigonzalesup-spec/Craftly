package com.craftly.app.presentation.ui

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.craftly.app.R
import com.craftly.app.databinding.ActivityMainBinding
import com.craftly.app.presentation.auth.AuthManager
import com.craftly.app.presentation.auth.LoginActivity
import com.craftly.app.presentation.ui.fragments.CartFragment
import com.craftly.app.presentation.ui.fragments.HomeFragment
import com.craftly.app.presentation.ui.fragments.OrdersFragment
import com.craftly.app.presentation.ui.fragments.ProfileFragment
import com.craftly.app.presentation.ui.fragments.SearchFragment

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Check if user is logged in
        if (!AuthManager.isLoggedIn(this)) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        // Setup bottom navigation
        setupBottomNavigation()
    }

    private fun setupBottomNavigation() {
        binding.bottomNavigation.setOnNavigationItemSelectedListener { menuItem ->
            when (menuItem.itemId) {
                R.id.nav_home -> {
                    loadFragment(HomeFragment())
                    true
                }
                R.id.nav_search -> {
                    loadFragment(SearchFragment())
                    true
                }
                R.id.nav_cart -> {
                    loadFragment(CartFragment())
                    true
                }
                R.id.nav_orders -> {
                    loadFragment(OrdersFragment())
                    true
                }
                R.id.nav_profile -> {
                    loadFragment(ProfileFragment())
                    true
                }
                else -> false
            }
        }

        // Load home fragment by default
        loadFragment(HomeFragment())
    }

    private fun loadFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commit()
    }
}