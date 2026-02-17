package com.craftly.app.presentation.ui.fragments

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.craftly.app.R
import com.craftly.app.presentation.auth.AuthManager
import com.craftly.app.presentation.auth.LoginActivity

class ProfileFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_profile, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val fullNameTextView = view.findViewById<TextView>(R.id.fullNameTextView)
        val emailTextView = view.findViewById<TextView>(R.id.emailTextView)
        val contactNumberTextView = view.findViewById<TextView>(R.id.contactNumberTextView)
        val addressTextView = view.findViewById<TextView>(R.id.addressTextView)
        val logoutButton = view.findViewById<Button>(R.id.logoutButton)

        // Load user data from AuthManager
        val fullName = AuthManager.getCurrentUser(requireContext())?.fullName ?: "User"
        val email = AuthManager.getCurrentUser(requireContext())?.email ?: "email@example.com"
        val contactNumber = AuthManager.getCurrentUser(requireContext())?.contactNumber ?: "—"
        val address = AuthManager.getCurrentUser(requireContext())?.streetAddress ?: "—"

        fullNameTextView.text = fullName
        emailTextView.text = email
        contactNumberTextView.text = contactNumber
        addressTextView.text = address

        logoutButton.setOnClickListener {
            AuthManager.logout(requireContext())
            Toast.makeText(requireContext(), "Logged out successfully", Toast.LENGTH_SHORT).show()
            startActivity(Intent(requireContext(), LoginActivity::class.java))
            requireActivity().finish()
        }
    }
}
