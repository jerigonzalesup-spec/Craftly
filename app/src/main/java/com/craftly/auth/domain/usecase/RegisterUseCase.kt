package com.craftly.auth.domain.usecase

import com.craftly.auth.data.repository.AuthRepository
import com.craftly.auth.presentation.utils.ValidationUtils

class RegisterUseCase(private val repository: AuthRepository) {
    suspend operator fun invoke(
        firstName: String,
        lastName: String,
        email: String,
        password: String
    ): Result<String> {
        if (!ValidationUtils.isValidFullName(firstName)) {
            return Result.failure(Exception("First name invalid"))
        }
        if (!ValidationUtils.isValidFullName(lastName)) {
            return Result.failure(Exception("Last name invalid"))
        }
        if (!ValidationUtils.isValidEmail(email)) {
            return Result.failure(Exception("Invalid email format"))
        }
        if (!ValidationUtils.isValidPassword(password)) {
            return Result.failure(Exception("Password must meet requirements"))
        }
        return repository.sendVerificationCode(firstName, lastName, email)
    }
}
