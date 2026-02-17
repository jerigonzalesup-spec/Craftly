package com.craftly.app.presentation.auth

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.RadioButton
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.craftly.app.R
import com.craftly.app.presentation.ui.MainActivity

class RegisterActivity : AppCompatActivity() {
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
            val role = if (sellerRadioButton.isChecked) "seller" else "buyer"

            if (validateInput(email, password, fullName)) {
                performRegister(email, password, fullName, role)
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

    private fun performRegister(email: String, password: String, fullName: String, role: String) {
        // TODO: Implement register logic with API
        // For now, save dummy session and go to main activity
        AuthManager.saveSession(
            this,
            userId = "test_user_${System.currentTimeMillis()}",
            email = email,
            fullName = fullName,
            role = role,
            token = "dummy_token"
        )
        Toast.makeText(this, "Registration successful", Toast.LENGTH_SHORT).show()
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
