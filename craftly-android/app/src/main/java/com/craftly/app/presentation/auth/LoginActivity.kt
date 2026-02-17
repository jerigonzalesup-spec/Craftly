package com.craftly.app.presentation.auth

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.craftly.app.R
import com.craftly.app.presentation.ui.MainActivity

class LoginActivity : AppCompatActivity() {
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
        // TODO: Implement login logic with API
        // For now, save dummy session and go to main activity
        AuthManager.saveSession(
            this,
            userId = "test_user_123",
            email = email,
            fullName = "Test User",
            role = "buyer",
            token = "dummy_token"
        )
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
