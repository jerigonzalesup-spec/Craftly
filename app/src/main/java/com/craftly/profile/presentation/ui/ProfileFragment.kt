package com.craftly.profile.presentation.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.craftly.MainActivity
import com.craftly.R
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.auth.domain.models.RoleNames
import com.craftly.core.network.NetworkConfig
import com.craftly.core.network.RetrofitClient
import com.craftly.databinding.FragmentProfileBinding
import com.craftly.profile.data.remote.ProfileApiService
import com.craftly.profile.data.repository.ProfileRepository
import com.craftly.profile.presentation.viewmodels.ProfileViewModel
import com.craftly.profile.presentation.viewmodels.ProfileViewModelFactory
import kotlinx.coroutines.launch

class ProfileFragment : Fragment() {
    private lateinit var binding: FragmentProfileBinding
    private lateinit var viewModel: ProfileViewModel
    private lateinit var prefsManager: SharedPreferencesManager

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        prefsManager = SharedPreferencesManager(requireContext())
        setupViewModel()
        setupClickListeners()
        observeViewModel()
        updateCurrentApiUrl()

        // Load profile data
        val user = prefsManager.getUser()
        if (user != null) {
            // Update header with welcome message and role info
            updateHeaderWithUserInfo(user.displayName, user.roles)
            viewModel.loadProfile(user.uid)
        }
    }

    private fun updateHeaderWithUserInfo(displayName: String, roles: List<String>) {
        val firstName = displayName.split(" ").first()
        binding.profileHeaderText.text = "Welcome, $firstName"

        // Show role badge if user is a seller
        updateRoleBadge(roles)
    }

    private fun updateRoleBadge(roles: List<String>) {
        val isSeller = RoleNames.isSeller(roles)
        val roleBadge = binding.root.findViewWithTag<android.widget.TextView>("role_badge")
        if (isSeller && roleBadge != null) {
            roleBadge.visibility = View.VISIBLE
            roleBadge.text = getString(R.string.role_seller_badge)
        }
    }

    private fun setupViewModel() {
        val apiService = RetrofitClient.createProfileApiService()
        val repository = ProfileRepository(apiService)
        val factory = ProfileViewModelFactory(repository)
        viewModel = ViewModelProvider(this, factory)[ProfileViewModel::class.java]
    }

    private fun setupClickListeners() {
        binding.saveButton.setOnClickListener {
            saveProfile()
        }

        binding.logoutButton.setOnClickListener {
            (requireActivity() as? MainActivity)?.logout()
        }

        binding.emulatorButton.setOnClickListener {
            NetworkConfig.setToEmulator()
            updateCurrentApiUrl()
            binding.customIpInput.setText("")
            Toast.makeText(
                requireContext(),
                "Switched to Emulator\nRestart app to apply",
                Toast.LENGTH_SHORT
            ).show()
        }

        binding.deviceButton.setOnClickListener {
            NetworkConfig.setToPhysicalDevice()
            updateCurrentApiUrl()
            binding.customIpInput.setText("")
            Toast.makeText(
                requireContext(),
                "Switched to Device\nRestart app to apply",
                Toast.LENGTH_SHORT
            ).show()
        }

        binding.resetButton.setOnClickListener {
            NetworkConfig.resetToDefault()
            updateCurrentApiUrl()
            binding.customIpInput.setText("")
            Toast.makeText(
                requireContext(),
                "Reset to Auto-detect\nRestart app to apply",
                Toast.LENGTH_SHORT
            ).show()
        }

        binding.applyCustomIpButton.setOnClickListener {
            val customIp = binding.customIpInput.text.toString().trim()
            if (customIp.isEmpty()) {
                Toast.makeText(requireContext(), "Please enter a valid IP address", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (!isValidIpAddress(customIp)) {
                Toast.makeText(requireContext(), "Invalid IP address format", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            NetworkConfig.setToPhysicalDevice(customIp)
            updateCurrentApiUrl()
            Toast.makeText(
                requireContext(),
                "Applied Custom IP: $customIp:5000\nRestart app to apply",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    private fun observeViewModel() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                binding.progressBar.visibility = if (state.isLoading) View.VISIBLE else View.GONE

                if (state.isLoading) {
                    binding.formContainer.visibility = View.GONE
                } else {
                    binding.formContainer.visibility = View.VISIBLE
                }

                state.profile?.let { profile ->
                    populateFields(profile)

                    // Show/hide seller sections based on user roles
                    val user = prefsManager.getUser()
                    if (user != null) {
                        updateSellerSectionVisibility(user.roles)
                    }
                }

                state.error?.let { error ->
                    Toast.makeText(requireContext(), error, Toast.LENGTH_SHORT).show()
                }

                state.successMessage?.let { message ->
                    Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
                }

                binding.saveButton.isEnabled = !state.isSaving
                binding.saveButton.text = if (state.isSaving) {
                    getString(R.string.profile_saving)
                } else {
                    getString(R.string.profile_save_changes)
                }
            }
        }
    }

    private fun updateSellerSectionVisibility(roles: List<String>) {
        val isSeller = RoleNames.isSeller(roles)

        // Seller sections are always shown since buyers can prepare for selling
        // In future, could conditionally hide based on application status
    }

    private fun populateFields(profile: com.craftly.profile.data.models.UserProfile) {
        binding.firstNameInput.setText(profile.firstName)
        binding.lastNameInput.setText(profile.lastName)
        binding.emailInput.setText(profile.email)
        binding.contactNumberInput.setText(profile.contactNumber ?: "")
        binding.streetAddressInput.setText(profile.streetAddress ?: "")
        binding.barangayInput.setText(profile.barangay ?: "")
        binding.cityInput.setText(profile.city ?: "")
        binding.postalCodeInput.setText(profile.postalCode ?: "")
        binding.countryInput.setText(profile.country ?: "")
        binding.gcashNameInput.setText(profile.gcashName ?: "")
        binding.gcashNumberInput.setText(profile.gcashNumber ?: "")
        binding.shopNameInput.setText(profile.shopName ?: "")
        binding.shopAddressInput.setText(profile.shopAddress ?: "")
        binding.shopBarangayInput.setText(profile.shopBarangay ?: "")
        binding.shopCityInput.setText(profile.shopCity ?: "")
        binding.allowShippingCheckbox.isChecked = profile.allowShipping
        binding.allowPickupCheckbox.isChecked = profile.allowPickup
    }

    private fun saveProfile() {
        val user = prefsManager.getUser() ?: return

        val firstName = binding.firstNameInput.text.toString().trim()
        val lastName = binding.lastNameInput.text.toString().trim()
        val contactNumber = binding.contactNumberInput.text.toString().trim()
        val streetAddress = binding.streetAddressInput.text.toString().trim()
        val barangay = binding.barangayInput.text.toString().trim()
        val city = binding.cityInput.text.toString().trim()
        val postalCode = binding.postalCodeInput.text.toString().trim()
        val country = binding.countryInput.text.toString().trim()
        val gcashName = binding.gcashNameInput.text.toString().trim()
        val gcashNumber = binding.gcashNumberInput.text.toString().trim()
        val shopName = binding.shopNameInput.text.toString().trim()
        val shopAddress = binding.shopAddressInput.text.toString().trim()
        val shopBarangay = binding.shopBarangayInput.text.toString().trim()
        val shopCity = binding.shopCityInput.text.toString().trim()
        val allowShipping = binding.allowShippingCheckbox.isChecked
        val allowPickup = binding.allowPickupCheckbox.isChecked

        // Validation
        if (firstName.isEmpty()) {
            Toast.makeText(requireContext(), getString(R.string.profile_first_name_required), Toast.LENGTH_SHORT).show()
            return
        }
        if (lastName.isEmpty()) {
            Toast.makeText(requireContext(), getString(R.string.profile_last_name_required), Toast.LENGTH_SHORT).show()
            return
        }

        viewModel.updateProfile(
            userId = user.uid,
            firstName = firstName,
            lastName = lastName,
            contactNumber = contactNumber,
            streetAddress = streetAddress,
            barangay = barangay,
            city = city,
            postalCode = postalCode,
            country = country,
            gcashName = gcashName,
            gcashNumber = gcashNumber,
            shopName = shopName,
            shopAddress = shopAddress,
            shopBarangay = shopBarangay,
            shopCity = shopCity,
            allowShipping = allowShipping,
            allowPickup = allowPickup
        )
    }

    private fun updateCurrentApiUrl() {
        val currentUrl = NetworkConfig.getBaseUrl()
        binding.currentApiUrlText.text = "Current API: $currentUrl"

        // Populate custom IP field if one is set
        val customIp = NetworkConfig.getCustomIp()
        if (!customIp.isNullOrEmpty()) {
            binding.customIpInput.setText(customIp)
        }
    }

    private fun isValidIpAddress(ip: String): Boolean {
        val ipPattern = Regex(
            "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
        )
        return ipPattern.matches(ip)
    }
}
