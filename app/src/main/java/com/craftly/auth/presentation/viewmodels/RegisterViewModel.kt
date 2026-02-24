package com.craftly.auth.presentation.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.auth.domain.usecase.RegisterUseCase
import com.craftly.auth.domain.usecase.VerifyEmailUseCase
import com.craftly.auth.presentation.utils.ValidationUtils
import kotlinx.coroutines.launch

class RegisterViewModel(
    private val registerUseCase: RegisterUseCase,
    private val verifyEmailUseCase: VerifyEmailUseCase
) : ViewModel() {
    private val _state = MutableLiveData<AuthState>(AuthState.Idle)
    val state: LiveData<AuthState> = _state

    private val _event = MutableLiveData<AuthEvent>()
    val event: LiveData<AuthEvent> = _event

    private val _verificationStep = MutableLiveData(false)
    val verificationStep: LiveData<Boolean> = _verificationStep

    // Form field errors
    private val _firstNameError = MutableLiveData<String?>()
    val firstNameError: LiveData<String?> = _firstNameError

    private val _lastNameError = MutableLiveData<String?>()
    val lastNameError: LiveData<String?> = _lastNameError

    private val _emailError = MutableLiveData<String?>()
    val emailError: LiveData<String?> = _emailError

    private val _passwordError = MutableLiveData<String?>()
    val passwordError: LiveData<String?> = _passwordError

    private val _verificationCodeError = MutableLiveData<String?>()
    val verificationCodeError: LiveData<String?> = _verificationCodeError

    // Store data for verification step
    private var pendingEmail = ""
    private var pendingPassword = ""
    private var pendingFirstName = ""
    private var pendingLastName = ""

    fun startRegistration(firstName: String, lastName: String, email: String, password: String) {
        // Validate form
        val firstNameErr = ValidationUtils.validateFirstName(firstName)
        val lastNameErr = ValidationUtils.validateLastName(lastName)
        val emailErr = ValidationUtils.validateEmail(email)
        val passwordErr = ValidationUtils.validatePasswordStrength(password)

        _firstNameError.value = firstNameErr
        _lastNameError.value = lastNameErr
        _emailError.value = emailErr
        _passwordError.value = passwordErr

        if (firstNameErr != null || lastNameErr != null || emailErr != null || passwordErr != null) {
            return
        }

        // Save for verification step
        pendingEmail = email
        pendingPassword = password
        pendingFirstName = firstName
        pendingLastName = lastName

        viewModelScope.launch {
            _state.value = AuthState.Loading
            val result = registerUseCase(firstName, lastName, email, password)

            result.onSuccess {
                _verificationStep.value = true
                _state.value = AuthState.Idle
                _event.value = AuthEvent.ShowError("Verification code sent to $email")
            }

            result.onFailure { exception ->
                _state.value = AuthState.Error(exception.message ?: "Failed to send code")
                _event.value = AuthEvent.ShowError(exception.message ?: "Failed to send code")
            }
        }
    }

    fun verifyAndComplete(verificationCode: String) {
        if (verificationCode.length != 6 || !verificationCode.all { it.isDigit() }) {
            _verificationCodeError.value = "Code must be 6 digits"
            return
        }

        viewModelScope.launch {
            _state.value = AuthState.Loading
            val result = verifyEmailUseCase(
                pendingEmail,
                verificationCode,
                pendingPassword,
                pendingFirstName,
                pendingLastName
            )

            result.onSuccess { user ->
                _state.value = AuthState.Success(user)
                _event.value = AuthEvent.NavigateToHome
            }

            result.onFailure { exception ->
                _state.value = AuthState.Error(exception.message ?: "Verification failed")
                _event.value = AuthEvent.ShowError(exception.message ?: "Verification failed")
            }
        }
    }

    fun goBackToForm() {
        _verificationStep.value = false
        _verificationCodeError.value = null
    }

    fun clearErrors() {
        _firstNameError.value = null
        _lastNameError.value = null
        _emailError.value = null
        _passwordError.value = null
        _verificationCodeError.value = null
    }
}
