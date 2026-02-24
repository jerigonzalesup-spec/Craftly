package com.craftly.auth.presentation.viewmodels

import com.craftly.auth.data.models.User

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val user: User) : AuthState()
    data class Error(val message: String) : AuthState()
}

sealed class AuthEvent {
    object NavigateToHome : AuthEvent()
    object NavigateToSeller : AuthEvent()
    object NavigateToAdmin : AuthEvent()
    data class ShowError(val message: String) : AuthEvent()
}
