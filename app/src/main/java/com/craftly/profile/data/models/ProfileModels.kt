package com.craftly.profile.data.models

import com.squareup.moshi.Json

// User Profile Data Models
data class UserProfile(
    val uid: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val contactNumber: String? = null,
    val streetAddress: String? = null,
    val barangay: String? = null,
    val city: String? = null,
    val postalCode: String? = null,
    val country: String? = null,
    val gcashName: String? = null,
    val gcashNumber: String? = null,
    val shopName: String? = null,
    val shopAddress: String? = null,
    val shopBarangay: String? = null,
    val shopCity: String? = null,
    val allowShipping: Boolean = true,
    val allowPickup: Boolean = false,
    val roles: List<String> = listOf("buyer")
)

// Request Models
data class UpdateProfileRequest(
    val firstName: String,
    val lastName: String,
    val contactNumber: String? = null,
    val streetAddress: String? = null,
    val barangay: String? = null,
    val city: String? = null,
    val postalCode: String? = null,
    val country: String? = null,
    val gcashName: String? = null,
    val gcashNumber: String? = null,
    val shopName: String? = null,
    val shopAddress: String? = null,
    val shopBarangay: String? = null,
    val shopCity: String? = null,
    val allowShipping: Boolean = true,
    val allowPickup: Boolean = false
)

// Response Models
data class ProfileResponse(
    val success: Boolean,
    val data: UserProfileData?,
    val message: String?,
    val error: String?
)

data class UserProfileData(
    val uid: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val contactNumber: String? = null,
    val streetAddress: String? = null,
    val barangay: String? = null,
    val city: String? = null,
    val postalCode: String? = null,
    val country: String? = null,
    val gcashName: String? = null,
    val gcashNumber: String? = null,
    val shopName: String? = null,
    val shopAddress: String? = null,
    val shopBarangay: String? = null,
    val shopCity: String? = null,
    val allowShipping: Boolean = true,
    val allowPickup: Boolean = false,
    val roles: List<String> = listOf("buyer")
)

// UI State
data class ProfileUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val profile: UserProfile? = null,
    val error: String? = null,
    val successMessage: String? = null
)
