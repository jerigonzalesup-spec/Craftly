package com.craftly.messaging.presentation.ui

import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.craftly.auth.data.local.SharedPreferencesManager
import com.craftly.databinding.ActivityChatBinding
import com.craftly.messaging.data.repository.MessagingRepository
import com.craftly.messaging.presentation.viewmodels.ChatViewModel
import com.craftly.messaging.presentation.viewmodels.ChatViewModelFactory

class ChatActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_CONVERSATION_ID = "extra_conversation_id"
        const val EXTRA_OTHER_NAME = "extra_other_name"
    }

    private lateinit var binding: ActivityChatBinding
    private lateinit var viewModel: ChatViewModel
    private lateinit var adapter: MessagesAdapter
    private lateinit var conversationId: String
    private lateinit var userId: String
    private lateinit var userName: String

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChatBinding.inflate(layoutInflater)
        setContentView(binding.root)

        conversationId = intent.getStringExtra(EXTRA_CONVERSATION_ID) ?: run { finish(); return }
        val otherName = intent.getStringExtra(EXTRA_OTHER_NAME) ?: "Chat"

        val prefs = SharedPreferencesManager(this)
        val user = prefs.getUser() ?: run { finish(); return }
        userId = user.uid
        userName = user.displayName ?: user.email

        // Back button
        binding.backButton.setOnClickListener { finish() }
        binding.otherUserName.text = otherName
        binding.otherUserAvatar.text = otherName.firstOrNull()?.uppercaseChar()?.toString() ?: "?"

        // ViewModel
        val repository = MessagingRepository()
        val factory = ChatViewModelFactory(repository)
        viewModel = ViewModelProvider(this, factory)[ChatViewModel::class.java]

        // Adapter
        adapter = MessagesAdapter(userId)
        binding.recyclerView.layoutManager = LinearLayoutManager(this).apply {
            stackFromEnd = true
        }
        binding.recyclerView.adapter = adapter

        // Observe messages
        viewModel.messages.observe(this) { messages ->
            adapter.submitList(messages) {
                // Scroll to bottom after list updates
                if (messages.isNotEmpty()) {
                    binding.recyclerView.scrollToPosition(messages.size - 1)
                }
            }
        }

        viewModel.sending.observe(this) { sending ->
            binding.sendButton.isEnabled = !sending
        }

        // Send button
        binding.sendButton.setOnClickListener { sendMessage() }

        // Enter key on keyboard
        binding.messageInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEND) {
                sendMessage()
                true
            } else false
        }

        // Mark read + start listening
        viewModel.markRead(conversationId, userId)
        viewModel.startListening(conversationId)
    }

    private fun sendMessage() {
        val text = binding.messageInput.text?.toString()?.trim() ?: return
        if (text.isEmpty()) return
        binding.messageInput.setText("")
        viewModel.sendMessage(conversationId, userId, userName, text)
    }
}
