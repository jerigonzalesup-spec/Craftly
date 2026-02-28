package com.craftly.auth.presentation.ui

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
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
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding
    private lateinit var viewModel: LoginViewModel
    private lateinit var repository: AuthRepository

    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                val account = task.getResult(ApiException::class.java)
                val idToken = account.idToken
                if (idToken != null) {
                    handleGoogleIdToken(idToken, account.email ?: "", account.displayName, account.photoUrl?.toString())
                } else {
                    showError("Google Sign-In failed: no ID token received")
                }
            } catch (e: ApiException) {
                showError("Google Sign-In failed (code ${e.statusCode})")
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        NetworkConfig.init(this)

        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val apiService = RetrofitClient.create()
        val prefsManager = SharedPreferencesManager(this)
        repository = AuthRepository(apiService, prefsManager)
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

            forgotPasswordLink.setOnClickListener {
                startActivity(Intent(this@LoginActivity, ForgotPasswordActivity::class.java))
            }

            googleSignInButton.setOnClickListener {
                signInWithGoogle()
            }

            passwordEditText.setOnFocusChangeListener { _, _ ->
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
                is AuthEvent.NavigateToSeller -> navigateToHome()
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
        navigateToHome()
    }

    private fun navigateToHome() {
        startActivity(Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        })
        finish()
    }

    private fun navigateToAdmin() {
        // Admin role is managed via the web dashboard only
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
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(com.craftly.R.string.default_web_client_id))
            .requestEmail()
            .build()
        val client = GoogleSignIn.getClient(this, gso)
        // Sign out first to allow account picker every time
        client.signOut().addOnCompleteListener {
            googleSignInLauncher.launch(client.signInIntent)
        }
    }

    private fun handleGoogleIdToken(
        idToken: String,
        email: String,
        displayName: String?,
        photoURL: String?
    ) {
        showLoading()
        lifecycleScope.launch {
            val result = repository.signInWithGoogle(idToken, email, displayName, photoURL)
            result.onSuccess { user ->
                navigateToHome()
            }.onFailure { e ->
                showError(e.message ?: "Google Sign-In failed")
            }
        }
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
