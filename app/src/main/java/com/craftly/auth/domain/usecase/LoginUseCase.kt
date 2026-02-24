package com.craftly.auth.domain.usecase

import com.craftly.auth.data.repository.AuthRepository
import com.craftly.auth.data.models.User
import com.craftly.auth.presentation.utils.ValidationUtils

class LoginUseCase(private val repository: AuthRepository) {
    suspend operator fun invoke(email: String, password: String): Result<User> {
        if (!ValidationUtils.isValidEmail(email)) {
            return Result.failure(Exception("Invalid email format"))
        }
        if (password.length < 6) {
            return Result.failure(Exception("Password must be at least 6 characters"))
        }
        return repository.login(email, password)
    }
}
