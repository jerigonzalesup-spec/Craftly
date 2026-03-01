package com.craftly.messaging.presentation.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.databinding.FragmentConversationsBinding
import com.craftly.messaging.data.repository.MessagingRepository
import com.craftly.messaging.presentation.viewmodels.ConversationsViewModel
import com.craftly.messaging.presentation.viewmodels.ConversationsViewModelFactory

class ConversationsFragment : Fragment() {

    private var _binding: FragmentConversationsBinding? = null
    private val binding get() = _binding!!

    private lateinit var viewModel: ConversationsViewModel
    private lateinit var adapter: ConversationsAdapter
    private lateinit var userId: String

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentConversationsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val prefs = SharedPreferencesManager(requireContext())
        val user = prefs.getUser() ?: return
        userId = user.uid

        // ViewModel
        val repository = MessagingRepository()
        val factory = ConversationsViewModelFactory(repository)
        viewModel = ViewModelProvider(this, factory)[ConversationsViewModel::class.java]

        // Adapter
        adapter = ConversationsAdapter(userId) { conversation ->
            val intent = Intent(requireContext(), ChatActivity::class.java).apply {
                putExtra(ChatActivity.EXTRA_CONVERSATION_ID, conversation.id)
                val otherId = conversation.participants.firstOrNull { it != userId } ?: ""
                putExtra(ChatActivity.EXTRA_OTHER_NAME, conversation.participantNames[otherId] ?: "User")
            }
            startActivity(intent)
        }

        binding.recyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.adapter = adapter

        // Observe
        viewModel.loading.observe(viewLifecycleOwner) { loading ->
            binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        }

        viewModel.conversations.observe(viewLifecycleOwner) { conversations ->
            adapter.submitList(conversations)
            binding.emptyView.visibility = if (conversations.isEmpty()) View.VISIBLE else View.GONE
        }

        viewModel.startListening(userId)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
