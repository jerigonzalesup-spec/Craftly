package com.craftly.auth.presentation.utils

object ValidationUtils {
    fun isValidEmail(email: String): Boolean {
        return email.matches(Regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"))
    }

    fun validateEmail(email: String): String? {
        return when {
            email.isEmpty() -> "Email is required"
            !isValidEmail(email) -> "Please enter a valid email"
            else -> null
        }
    }

    fun isValidPassword(password: String): Boolean {
        return password.length >= 6
    }

    fun validatePassword(password: String): String? {
        return when {
            password.isEmpty() -> "Password is required"
            password.length < 6 -> "Password must be at least 6 characters"
            else -> null
        }
    }

    fun validatePasswordStrength(password: String): String? {
        val strength = getPasswordStrength(password)
        return if (strength >= 3) null else "Password is too weak"
    }

    fun getPasswordStrength(password: String): Int {
        var strength = 0
        if (password.length >= 8) strength++
        if (password.any { it.isUpperCase() }) strength++
        if (password.any { it.isLowerCase() }) strength++
        if (password.any { it.isDigit() }) strength++
        if (password.any { !it.isLetterOrDigit() }) strength++
        return strength
    }

    fun isValidFullName(name: String): Boolean {
        return name.length >= 2 && name.matches(Regex("^[a-zA-Z\\s'-]+$"))
    }

    fun validateFirstName(name: String): String? {
        return when {
            name.isEmpty() -> "First name is required"
            name.length < 2 -> "First name must be at least 2 characters"
            !isValidFullName(name) -> "First name contains invalid characters"
            else -> null
        }
    }

    fun validateLastName(name: String): String? {
        return when {
            name.isEmpty() -> "Last name is required"
            name.length < 2 -> "Last name must be at least 2 characters"
            !isValidFullName(name) -> "Last name contains invalid characters"
            else -> null
        }
    }
}
