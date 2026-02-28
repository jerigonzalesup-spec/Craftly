package com.craftly.auth.presentation.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.auth.data.repository.AuthRepository
import com.craftly.core.network.RetrofitClient
import com.craftly.databinding.ActivityForgotPasswordBinding
import kotlinx.coroutines.launch

class ForgotPasswordActivity : AppCompatActivity() {

    private lateinit var binding: ActivityForgotPasswordBinding
    private lateinit var repository: AuthRepository

    private var email: String = ""
    private var verifiedCode: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityForgotPasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val apiService = RetrofitClient.create()
        val prefsManager = SharedPreferencesManager(this)
        repository = AuthRepository(apiService, prefsManager)

        showStep("email")
        setupClickListeners()
    }

    private fun setupClickListeners() {
        binding.backButton.setOnClickListener { finish() }

        // Step 1 – send code
        binding.sendCodeButton.setOnClickListener {
            val inputEmail = binding.emailEditText.text.toString().trim()
            if (inputEmail.isEmpty()) {
                binding.emailLayout.error = "Email is required"
                return@setOnClickListener
            }
            binding.emailLayout.error = null
            sendResetCode(inputEmail)
        }

        // Step 2 – verify code
        binding.verifyCodeButton.setOnClickListener {
            val code = binding.codeEditText.text.toString().trim()
            if (code.length != 6 || !code.all { it.isDigit() }) {
                binding.codeLayout.error = "Enter the 6-digit code"
                return@setOnClickListener
            }
            binding.codeLayout.error = null
            verifyCode(code)
        }

        // Step 3 – reset password
        binding.resetPasswordButton.setOnClickListener {
            val newPassword = binding.newPasswordEditText.text.toString()
            val confirmPassword = binding.confirmPasswordEditText.text.toString()

            if (newPassword.length < 6) {
                binding.newPasswordLayout.error = "Password must be at least 6 characters"
                return@setOnClickListener
            }
            binding.newPasswordLayout.error = null

            if (newPassword != confirmPassword) {
                binding.confirmPasswordLayout.error = "Passwords do not match"
                return@setOnClickListener
            }
            binding.confirmPasswordLayout.error = null

            resetPassword(newPassword)
        }

        // Step 4 – back to login
        binding.backToLoginButton.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
            finishAffinity()
        }
    }

    private fun sendResetCode(inputEmail: String) {
        setLoading(true)
        lifecycleScope.launch {
            val result = repository.forgotPassword(inputEmail)
            setLoading(false)
            result.onSuccess {
                email = inputEmail
                binding.codeEmailLabel.text = "Code sent to $email"
                showStep("code")
            }.onFailure { e ->
                Toast.makeText(this@ForgotPasswordActivity, e.message ?: "Failed to send code", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun verifyCode(code: String) {
        setLoading(true)
        lifecycleScope.launch {
            val result = repository.verifyResetCode(email, code)
            setLoading(false)
            result.onSuccess {
                verifiedCode = code
                showStep("password")
            }.onFailure { e ->
                Toast.makeText(this@ForgotPasswordActivity, e.message ?: "Invalid code", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun resetPassword(newPassword: String) {
        setLoading(true)
        lifecycleScope.launch {
            val result = repository.resetPasswordWithCode(email, verifiedCode, newPassword)
            setLoading(false)
            result.onSuccess {
                showStep("success")
            }.onFailure { e ->
                Toast.makeText(this@ForgotPasswordActivity, e.message ?: "Failed to reset password", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun showStep(step: String) {
        binding.stepEmail.visibility    = if (step == "email")    View.VISIBLE else View.GONE
        binding.stepCode.visibility     = if (step == "code")     View.VISIBLE else View.GONE
        binding.stepPassword.visibility = if (step == "password") View.VISIBLE else View.GONE
        binding.stepSuccess.visibility  = if (step == "success")  View.VISIBLE else View.GONE

        binding.subtitle.text = when (step) {
            "email"    -> "Enter your email and we'll send a reset code"
            "code"     -> "Check your email for the 6-digit code"
            "password" -> "Enter your new password"
            "success"  -> ""
            else       -> ""
        }
    }

    private fun setLoading(loading: Boolean) {
        binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        binding.sendCodeButton.isEnabled     = !loading
        binding.verifyCodeButton.isEnabled   = !loading
        binding.resetPasswordButton.isEnabled = !loading
    }
}
