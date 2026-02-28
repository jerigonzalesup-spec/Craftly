package com.craftly.notifications.presentation.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.core.network.RetrofitClient
import com.craftly.core.viewmodels.SharedNotificationsViewModel
import com.craftly.databinding.FragmentNotificationsBinding
import com.craftly.notifications.data.repository.NotificationsRepository
import com.craftly.notifications.presentation.viewmodels.NotificationsViewModel
import com.craftly.notifications.presentation.viewmodels.NotificationsViewModelFactory
import kotlinx.coroutines.launch

class NotificationsFragment : Fragment() {

    private var _binding: FragmentNotificationsBinding? = null
    private val binding get() = _binding!!

    private lateinit var viewModel: NotificationsViewModel
    private lateinit var adapter: NotificationsAdapter
    private lateinit var userId: String
    private var sharedNotificationsViewModel: SharedNotificationsViewModel? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentNotificationsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val prefs = SharedPreferencesManager(requireContext())
        val user = prefs.getUser() ?: run {
            parentFragmentManager.popBackStack()
            return
        }
        userId = user.uid

        setupViewModel()
        setupRecyclerView()
        observeViewModel()

        // Grab shared ViewModel from activity for badge updates
        sharedNotificationsViewModel = try {
            androidx.lifecycle.ViewModelProvider(requireActivity())[SharedNotificationsViewModel::class.java]
        } catch (e: Exception) { null }

        binding.backButton.setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        binding.markAllReadButton.setOnClickListener {
            viewModel.markAllAsRead(userId)
            sharedNotificationsViewModel?.clearAll()
        }

        binding.swipeRefreshLayout.setOnRefreshListener {
            viewModel.loadNotifications(userId)
        }

        viewModel.loadNotifications(userId)
    }

    private fun setupViewModel() {
        val apiService = RetrofitClient.createNotificationsApiService()
        val repository = NotificationsRepository(apiService)
        val factory = NotificationsViewModelFactory(repository)
        viewModel = ViewModelProvider(this, factory)[NotificationsViewModel::class.java]
    }

    private fun setupRecyclerView() {
        adapter = NotificationsAdapter(
            onMarkRead = { notification ->
                viewModel.markAsRead(userId, notification.id)
                sharedNotificationsViewModel?.decrementOnRead()
            },
            onDelete = { notification ->
                if (!notification.isRead) sharedNotificationsViewModel?.decrementOnRead()
                viewModel.deleteNotification(userId, notification.id)
            }
        )
        binding.notificationsRecyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.notificationsRecyclerView.adapter = adapter
    }

    private fun observeViewModel() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                binding.swipeRefreshLayout.isRefreshing = false

                binding.progressBar.visibility =
                    if (state.isLoading && adapter.itemCount == 0) View.VISIBLE else View.GONE

                if (!state.isLoading) {
                    if (state.notifications.isEmpty()) {
                        binding.emptyState.visibility = View.VISIBLE
                        binding.notificationsRecyclerView.visibility = View.GONE
                        binding.markAllReadButton.visibility = View.GONE
                    } else {
                        binding.emptyState.visibility = View.GONE
                        binding.notificationsRecyclerView.visibility = View.VISIBLE
                        binding.markAllReadButton.visibility =
                            if (state.unreadCount > 0) View.VISIBLE else View.GONE
                        adapter.submitList(state.notifications)
                    }
                }

                state.error?.let { error ->
                    Toast.makeText(requireContext(), error, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
