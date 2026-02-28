package com.craftly.profile.data.repository

import com.craftly.profile.data.models.UpdateProfileRequest
import com.craftly.profile.data.models.UserProfile
import com.craftly.profile.data.remote.ProfileApiService

class ProfileRepository(private val apiService: ProfileApiService) {

    suspend fun getUserProfile(userId: String): Result<UserProfile> = try {
        val response = apiService.getUserProfile(userId)
        if (response.success && response.data != null) {
            val data = response.data
            Result.success(
                UserProfile(
                    uid = data.uid,
                    firstName = data.fullName.split(" ").firstOrNull() ?: "",
                    lastName = if (data.fullName.contains(" ")) data.fullName.substringAfter(" ") else "",
                    email = data.email,
                    contactNumber = data.contactNumber,
                    streetAddress = data.streetAddress,
                    barangay = data.barangay,
                    city = data.city,
                    postalCode = data.postalCode,
                    country = data.country,
                    gcashName = data.gcashName,
                    gcashNumber = data.gcashNumber,
                    shopName = data.shopName,
                    shopAddress = data.shopAddress,
                    shopBarangay = data.shopBarangay,
                    shopCity = data.shopCity,
                    allowShipping = data.allowShipping,
                    allowPickup = data.allowPickup,
                    allowCod = data.allowCod,
                    allowGcash = data.allowGcash,
                    roles = if (data.role.isNotBlank()) listOf(data.role) else listOf("buyer")
                )
            )
        } else {
            Result.failure(Exception(response.error ?: "Failed to fetch profile"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }

    suspend fun updateUserProfile(
        userId: String,
        profile: UpdateProfileRequest
    ): Result<UserProfile> = try {
        val response = apiService.updateUserProfile(userId, userId, profile)
        if (response.success && response.data != null) {
            val data = response.data
            Result.success(
                UserProfile(
                    uid = data.uid,
                    firstName = data.fullName.split(" ").firstOrNull() ?: "",
                    lastName = if (data.fullName.contains(" ")) data.fullName.substringAfter(" ") else "",
                    email = data.email,
                    contactNumber = data.contactNumber,
                    streetAddress = data.streetAddress,
                    barangay = data.barangay,
                    city = data.city,
                    postalCode = data.postalCode,
                    country = data.country,
                    gcashName = data.gcashName,
                    gcashNumber = data.gcashNumber,
                    shopName = data.shopName,
                    shopAddress = data.shopAddress,
                    shopBarangay = data.shopBarangay,
                    shopCity = data.shopCity,
                    allowShipping = data.allowShipping,
                    allowPickup = data.allowPickup,
                    allowCod = data.allowCod,
                    allowGcash = data.allowGcash,
                    roles = if (data.role.isNotBlank()) listOf(data.role) else listOf("buyer")
                )
            )
        } else {
            Result.failure(Exception(response.error ?: "Failed to update profile"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
