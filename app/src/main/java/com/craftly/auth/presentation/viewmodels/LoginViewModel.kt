package com.craftly.auth.presentation.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.auth.domain.usecase.LoginUseCase
import com.craftly.auth.data.repository.AuthRepository
import com.craftly.auth.presentation.utils.ValidationUtils
import kotlinx.coroutines.launch

class LoginViewModel(
    private val loginUseCase: LoginUseCase,
    private val repository: AuthRepository
) : ViewModel() {
    private val _state = MutableLiveData<AuthState>(AuthState.Idle)
    val state: LiveData<AuthState> = _state

    private val _event = MutableLiveData<AuthEvent>()
    val event: LiveData<AuthEvent> = _event

    private val _emailError = MutableLiveData<String?>()
    val emailError: LiveData<String?> = _emailError

    private val _passwordError = MutableLiveData<String?>()
    val passwordError: LiveData<String?> = _passwordError

    fun login(email: String, password: String) {
        // Validate
        val emailErr = ValidationUtils.validateEmail(email)
        val passwordErr = ValidationUtils.validatePassword(password)

        _emailError.value = emailErr
        _passwordError.value = passwordErr

        if (emailErr != null || passwordErr != null) return

        viewModelScope.launch {
            _state.value = AuthState.Loading
            val result = loginUseCase(email, password)

            result.onSuccess { user ->
                _state.value = AuthState.Success(user)
                when {
                    user.roles.contains("admin") -> _event.value = AuthEvent.NavigateToAdmin
                    user.roles.contains("seller") -> _event.value = AuthEvent.NavigateToSeller
                    else -> _event.value = AuthEvent.NavigateToHome
                }
            }

            result.onFailure { exception ->
                _state.value = AuthState.Error(exception.message ?: "Login failed")
                _event.value = AuthEvent.ShowError(exception.message ?: "Login failed")
            }
        }
    }

    fun clearErrors() {
        _emailError.value = null
        _passwordError.value = null
    }
}
