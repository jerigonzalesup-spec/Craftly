package com.craftly.auth.domain.usecase

import com.craftly.auth.data.repository.AuthRepository
import com.craftly.auth.data.models.User

class VerifyEmailUseCase(private val repository: AuthRepository) {
    suspend operator fun invoke(
        email: String,
        code: String,
        password: String,
        firstName: String,
        lastName: String
    ): Result<User> {
        if (code.length != 6 || !code.all { it.isDigit() }) {
            return Result.failure(Exception("Invalid verification code"))
        }
        return repository.verifyEmailAndRegister(email, code, password, firstName, lastName)
    }
}
