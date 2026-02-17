package com.craftly.app.presentation.auth

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.craftly.app.R
import com.craftly.app.data.repository.AuthRepository
import com.craftly.app.presentation.ui.MainActivity
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private val authRepository = AuthRepository()
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        val emailEditText = findViewById<EditText>(R.id.emailEditText)
        val passwordEditText = findViewById<EditText>(R.id.passwordEditText)
        val loginButton = findViewById<Button>(R.id.loginButton)
        val registerLink = findViewById<TextView>(R.id.registerLink)

        loginButton.setOnClickListener {
            val email = emailEditText.text.toString().trim()
            val password = passwordEditText.text.toString().trim()

            if (validateInput(email, password)) {
                performLogin(email, password)
            }
        }

        registerLink.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
    }

    private fun validateInput(email: String, password: String): Boolean {
        return when {
            email.isEmpty() -> {
                Toast.makeText(this, "Please enter email", Toast.LENGTH_SHORT).show()
                false
            }
            password.isEmpty() -> {
                Toast.makeText(this, "Please enter password", Toast.LENGTH_SHORT).show()
                false
            }
            else -> true
        }
    }

    private fun performLogin(email: String, password: String) {
        val loginButton = findViewById<Button>(R.id.loginButton)
        loginButton.isEnabled = false
        loginButton.text = "Logging in..."

        lifecycleScope.launch {
            val result = authRepository.login(email, password)

            result.onSuccess { authResponse ->
                // Save session with actual user data from API response
                AuthManager.saveSession(
                    this@LoginActivity,
                    userId = authResponse.uid,
                    email = authResponse.email,
                    fullName = authResponse.displayName,
                    role = authResponse.role,
                    token = authResponse.uid  // Use uid as token
                )
                Toast.makeText(this@LoginActivity, "Login successful!", Toast.LENGTH_SHORT).show()
                startActivity(Intent(this@LoginActivity, MainActivity::class.java))
                finish()
            }

            result.onFailure { error ->
                loginButton.isEnabled = true
                loginButton.text = "Login"
                Toast.makeText(
                    this@LoginActivity,
                    "Login failed: ${error.message}",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }
}
