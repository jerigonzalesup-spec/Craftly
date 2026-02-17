package com.craftly.app.presentation.auth

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.RadioButton
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.craftly.app.R
import com.craftly.app.data.repository.AuthRepository
import com.craftly.app.presentation.ui.MainActivity
import kotlinx.coroutines.launch

class RegisterActivity : AppCompatActivity() {

    private val authRepository = AuthRepository()
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        val fullNameEditText = findViewById<EditText>(R.id.fullNameEditText)
        val emailEditText = findViewById<EditText>(R.id.emailEditText)
        val passwordEditText = findViewById<EditText>(R.id.passwordEditText)
        val sellerRadioButton = findViewById<RadioButton>(R.id.sellerRadioButton)
        val registerButton = findViewById<Button>(R.id.registerButton)
        val loginLink = findViewById<TextView>(R.id.loginLink)

        registerButton.setOnClickListener {
            val email = emailEditText.text.toString().trim()
            val password = passwordEditText.text.toString().trim()
            val fullName = fullNameEditText.text.toString().trim()

            if (validateInput(email, password, fullName)) {
                performRegister(email, password, fullName)
            }
        }

        loginLink.setOnClickListener {
            finish()
        }
    }

    private fun validateInput(email: String, password: String, fullName: String): Boolean {
        return when {
            email.isEmpty() -> {
                Toast.makeText(this, "Please enter email", Toast.LENGTH_SHORT).show()
                false
            }
            password.isEmpty() -> {
                Toast.makeText(this, "Please enter password", Toast.LENGTH_SHORT).show()
                false
            }
            fullName.isEmpty() -> {
                Toast.makeText(this, "Please enter full name", Toast.LENGTH_SHORT).show()
                false
            }
            password.length < 6 -> {
                Toast.makeText(this, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show()
                false
            }
            else -> true
        }
    }

    private fun performRegister(email: String, password: String, fullName: String) {
        val registerButton = findViewById<Button>(R.id.registerButton)
        registerButton.isEnabled = false
        registerButton.text = "Registering..."

        lifecycleScope.launch {
            val result = authRepository.register(email, password, fullName)

            result.onSuccess { authResponse ->
                // Save session with user data from API response
                AuthManager.saveSession(
                    this@RegisterActivity,
                    userId = authResponse.uid,
                    email = authResponse.email,
                    fullName = authResponse.displayName,
                    role = authResponse.role,
                    token = authResponse.uid  // Use uid as token
                )
                Toast.makeText(this@RegisterActivity, "Registration successful!", Toast.LENGTH_SHORT).show()
                startActivity(Intent(this@RegisterActivity, MainActivity::class.java))
                finish()
            }

            result.onFailure { error ->
                registerButton.isEnabled = true
                registerButton.text = "Register"
                Toast.makeText(
                    this@RegisterActivity,
                    "Registration failed: ${error.message}",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }
}
