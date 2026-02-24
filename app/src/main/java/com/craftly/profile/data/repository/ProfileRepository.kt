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
                    firstName = data.firstName,
                    lastName = data.lastName,
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
                    roles = data.roles
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
        val response = apiService.updateUserProfile(userId, profile)
        if (response.success && response.data != null) {
            val data = response.data
            Result.success(
                UserProfile(
                    uid = data.uid,
                    firstName = data.firstName,
                    lastName = data.lastName,
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
                    roles = data.roles
                )
            )
        } else {
            Result.failure(Exception(response.error ?: "Failed to update profile"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
