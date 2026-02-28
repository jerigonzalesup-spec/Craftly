package com.craftly.profile.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.craftly.profile.data.models.ProfileUiState
import com.craftly.profile.data.models.UpdateProfileRequest
import com.craftly.profile.data.models.UserProfile
import com.craftly.profile.data.repository.ProfileRepository
import com.craftly.core.utils.ErrorMapper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ProfileViewModel(private val repository: ProfileRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState

    fun loadProfile(userId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            repository.getUserProfile(userId).fold(
                onSuccess = { profile ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        profile = profile
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = ErrorMapper.friendlyMessage(error)
                    )
                }
            )
        }
    }

    fun updateProfile(
        userId: String,
        fullName: String,
        contactNumber: String?,
        streetAddress: String?,
        barangay: String?,
        city: String?,
        postalCode: String?,
        country: String?,
        gcashName: String?,
        gcashNumber: String?,
        shopName: String?,
        shopAddress: String?,
        shopBarangay: String?,
        shopCity: String?,
        allowShipping: Boolean,
        allowPickup: Boolean,
        allowCod: Boolean = true,
        allowGcash: Boolean = false
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, error = null)

            val request = UpdateProfileRequest(
                fullName = fullName,
                contactNumber = contactNumber?.takeIf { it.isNotBlank() },
                streetAddress = streetAddress?.takeIf { it.isNotBlank() },
                barangay = barangay?.takeIf { it.isNotBlank() },
                city = city?.takeIf { it.isNotBlank() },
                postalCode = postalCode?.takeIf { it.isNotBlank() },
                country = country?.takeIf { it.isNotBlank() },
                gcashName = gcashName?.takeIf { it.isNotBlank() },
                gcashNumber = gcashNumber?.takeIf { it.isNotBlank() },
                shopName = shopName?.takeIf { it.isNotBlank() },
                shopAddress = shopAddress?.takeIf { it.isNotBlank() },
                shopBarangay = shopBarangay?.takeIf { it.isNotBlank() },
                shopCity = shopCity?.takeIf { it.isNotBlank() },
                allowShipping = allowShipping,
                allowPickup = allowPickup,
                allowCod = allowCod,
                allowGcash = allowGcash
            )

            repository.updateUserProfile(userId, request).fold(
                onSuccess = { profile ->
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        profile = profile,
                        successMessage = "Profile updated successfully"
                    )
                    // Clear success message after 3 seconds
                    viewModelScope.launch {
                        kotlinx.coroutines.delay(3000)
                        _uiState.value = _uiState.value.copy(successMessage = null)
                    }
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        error = ErrorMapper.friendlyMessage(error)
                    )
                }
            )
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
