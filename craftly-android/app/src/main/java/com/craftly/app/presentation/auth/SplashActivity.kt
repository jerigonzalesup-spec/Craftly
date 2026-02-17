package com.craftly.app.presentation.auth

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import com.craftly.app.R
import com.craftly.app.presentation.ui.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class SplashActivity : AppCompatActivity() {

    private val TAG = "SplashActivity"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        Log.d(TAG, "Splash screen shown")

        // Check session and navigate after 2 seconds
        CoroutineScope(Dispatchers.Main).launch {
            delay(2000) // Show splash for 2 seconds
            checkSessionAndNavigate()
        }
    }

    private fun checkSessionAndNavigate() {
        Log.d(TAG, "Checking user session...")

        // Check if user is logged in using AuthManager
        val isLoggedIn = AuthManager.isLoggedIn(this)

        Log.d(TAG, "Is logged in: $isLoggedIn")

        if (isLoggedIn) {
            // User is logged in, go to main app
            Log.d(TAG, "User session found, navigating to MainActivity")
            val intent = Intent(this, MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
        } else {
            // No session, go to login
            Log.d(TAG, "No user session, navigating to LoginActivity")
            val intent = Intent(this, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
        }

        finish()
    }
}
