package com.craftly.auth.presentation.ui

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.craftly.MainActivity
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.auth.data.repository.AuthRepository
import com.craftly.auth.domain.usecase.RegisterUseCase
import com.craftly.auth.domain.usecase.VerifyEmailUseCase
import com.craftly.auth.presentation.viewmodels.AuthEvent
import com.craftly.auth.presentation.viewmodels.AuthState
import com.craftly.auth.presentation.viewmodels.RegisterViewModel
import com.craftly.core.network.NetworkConfig
import com.craftly.core.network.RetrofitClient
import com.craftly.databinding.ActivityRegisterBinding
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import kotlinx.coroutines.launch

class RegisterActivity : AppCompatActivity() {
    private lateinit var binding: ActivityRegisterBinding
    private lateinit var viewModel: RegisterViewModel
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
                    showErrorToast("Google Sign-In failed: no ID token received")
                }
            } catch (e: ApiException) {
                showErrorToast("Google Sign-In failed (code ${e.statusCode})")
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize network configuration
        NetworkConfig.init(this)

        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Initialize ViewModel with dependencies
        val apiService = RetrofitClient.create()
        val prefsManager = SharedPreferencesManager(this)
        repository = AuthRepository(apiService, prefsManager)
        val registerUseCase = RegisterUseCase(repository)
        val verifyEmailUseCase = VerifyEmailUseCase(repository)
        viewModel = ViewModelProvider(this, RegisterViewModelFactory(registerUseCase, verifyEmailUseCase)).get(RegisterViewModel::class.java)

        setupUI()
        observeViewModel()
    }

    private fun setupUI() {
        binding.apply {
            createAccountButton.setOnClickListener {
                val firstName = firstNameEditText.text.toString().trim()
                val lastName = lastNameEditText.text.toString().trim()
                val email = emailEditText.text.toString().trim()
                val password = passwordEditText.text.toString()
                viewModel.startRegistration(firstName, lastName, email, password)
            }

            loginLink.setOnClickListener {
                finish()
            }

            // Verification step
            verifyButton?.setOnClickListener {
                val code = verificationCodeEditText?.text.toString().trim()
                viewModel.verifyAndComplete(code)
            }

            backButton?.setOnClickListener {
                viewModel.goBackToForm()
            }

            googleSignInButton?.setOnClickListener {
                signInWithGoogle()
            }
        }
    }

    private fun observeViewModel() {
        viewModel.verificationStep.observe(this) { isVerifying ->
            if (isVerifying) {
                showVerificationStep()
            } else {
                showRegistrationForm()
            }
        }

        viewModel.state.observe(this) { state ->
            when (state) {
                is AuthState.Loading -> {
                    binding.createAccountButton.isEnabled = false
                    binding.createAccountButton.text = if (viewModel.verificationStep.value == true)
                        "Verifying..." else "Sending Code..."
                }
                is AuthState.Success -> navigateToHome()
                is AuthState.Error -> {
                    binding.createAccountButton.isEnabled = true
                    binding.createAccountButton.text = "Create Account"
                    showErrorToast(state.message)
                }
                else -> {}
            }
        }

        viewModel.event.observe(this) { event ->
            if (event is AuthEvent.ShowError) {
                showErrorToast(event.message)
            }
        }

        viewModel.firstNameError.observe(this) { error ->
            binding.firstNameLayout.error = error
        }

        viewModel.lastNameError.observe(this) { error ->
            binding.lastNameLayout.error = error
        }

        viewModel.emailError.observe(this) { error ->
            binding.emailLayout.error = error
        }

        viewModel.passwordError.observe(this) { error ->
            binding.passwordLayout.error = error
        }

        viewModel.verificationCodeError.observe(this) { error ->
            binding.verificationCodeLayout?.error = error
        }
    }

    private fun showVerificationStep() {
        binding.apply {
            formContainer.visibility = View.GONE
            verificationContainer?.visibility = View.VISIBLE
        }
    }

    private fun showRegistrationForm() {
        binding.apply {
            formContainer.visibility = View.VISIBLE
            verificationContainer?.visibility = View.GONE
        }
    }

    private fun navigateToHome() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
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
        lifecycleScope.launch {
            val result = repository.signInWithGoogle(idToken, email, displayName, photoURL)
            result.onSuccess {
                navigateToHome()
            }.onFailure { e ->
                showErrorToast(e.message ?: "Google Sign-In failed")
            }
        }
    }
}

class RegisterViewModelFactory(
    private val registerUseCase: RegisterUseCase,
    private val verifyEmailUseCase: VerifyEmailUseCase
) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return RegisterViewModel(registerUseCase, verifyEmailUseCase) as T
    }
}
