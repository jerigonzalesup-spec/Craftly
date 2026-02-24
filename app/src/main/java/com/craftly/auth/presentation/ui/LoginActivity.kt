package com.craftly.auth.presentation.ui

import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.craftly.MainActivity
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.auth.data.repository.AuthRepository
import com.craftly.auth.domain.usecase.LoginUseCase
import com.craftly.auth.presentation.viewmodels.AuthEvent
import com.craftly.auth.presentation.viewmodels.AuthState
import com.craftly.auth.presentation.viewmodels.LoginViewModel
import com.craftly.core.network.NetworkConfig
import com.craftly.core.network.RetrofitClient
import com.craftly.databinding.ActivityLoginBinding

class LoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding
    private lateinit var viewModel: LoginViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize network configuration
        NetworkConfig.init(this)

        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Initialize ViewModel with dependencies
        val apiService = RetrofitClient.create()
        val prefsManager = SharedPreferencesManager(this)
        val repository = AuthRepository(apiService, prefsManager)
        val loginUseCase = LoginUseCase(repository)
        viewModel = ViewModelProvider(this, LoginViewModelFactory(loginUseCase, repository)).get(LoginViewModel::class.java)

        setupUI()
        observeViewModel()
    }

    private fun setupUI() {
        binding.apply {
            loginButton.setOnClickListener {
                val email = emailEditText.text.toString().trim()
                val password = passwordEditText.text.toString()
                viewModel.login(email, password)
            }

            registerLink.setOnClickListener {
                startActivity(Intent(this@LoginActivity, RegisterActivity::class.java))
            }

            googleSignInButton.setOnClickListener {
                signInWithGoogle()
            }

            passwordEditText.setOnFocusChangeListener { _, hasFocus ->
                viewModel.clearErrors()
            }
        }
    }

    private fun observeViewModel() {
        viewModel.state.observe(this) { state ->
            when (state) {
                is AuthState.Loading -> showLoading()
                is AuthState.Success -> navigateBasedOnRole(state.user)
                is AuthState.Error -> showError(state.message)
                else -> {}
            }
        }

        viewModel.event.observe(this) { event ->
            when (event) {
                is AuthEvent.NavigateToHome -> navigateToHome()
                is AuthEvent.NavigateToSeller -> navigateToSeller()
                is AuthEvent.NavigateToAdmin -> navigateToAdmin()
                is AuthEvent.ShowError -> showErrorToast(event.message)
            }
        }

        viewModel.emailError.observe(this) { error ->
            binding.emailLayout.error = error
        }

        viewModel.passwordError.observe(this) { error ->
            binding.passwordLayout.error = error
        }
    }

    private fun navigateBasedOnRole(user: com.craftly.auth.data.models.User) {
        when {
            user.roles.contains("admin") -> navigateToAdmin()
            user.roles.contains("seller") -> navigateToSeller()
            else -> navigateToHome()
        }
    }

    private fun navigateToHome() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    private fun navigateToSeller() {
        showErrorToast("Seller dashboard - not implemented yet")
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    private fun navigateToAdmin() {
        showErrorToast("Admin dashboard - not implemented yet")
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    private fun showLoading() {
        binding.loginButton.isEnabled = false
        binding.loginButton.text = "Logging in..."
    }

    private fun showError(message: String) {
        binding.loginButton.isEnabled = true
        binding.loginButton.text = "Login"
        showErrorToast(message)
    }

    private fun showErrorToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    private fun signInWithGoogle() {
        Toast.makeText(
            this,
            "Google Sign-In requires Firebase configuration. Please configure google-services.json first.",
            Toast.LENGTH_LONG
        ).show()
        // TODO: Implement Google Sign-In with Google Play Services
        // This requires:
        // 1. google-services.json in the app directory
        // 2. Google OAuth 2.0 credentials configured in Google Cloud Console
        // 3. SHA-256 fingerprint registered for the app
    }
}

class LoginViewModelFactory(
    private val loginUseCase: LoginUseCase,
    private val repository: AuthRepository
) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return LoginViewModel(loginUseCase, repository) as T
    }
}
