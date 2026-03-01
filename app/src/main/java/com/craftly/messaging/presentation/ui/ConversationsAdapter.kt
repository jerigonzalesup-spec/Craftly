package com.craftly.messaging.presentation.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.craftly.R
import com.craftly.messaging.data.models.Conversation

class ConversationsAdapter(
    private val currentUserId: String,
    private val onClick: (Conversation) -> Unit,
) : ListAdapter<Conversation, ConversationsAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val avatar: TextView = view.findViewById(R.id.avatarText)
        val name: TextView = view.findViewById(R.id.conversationName)
        val lastMsg: TextView = view.findViewById(R.id.lastMessage)
        val time: TextView = view.findViewById(R.id.lastMessageTime)
        val badge: TextView = view.findViewById(R.id.unreadBadge)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_conversation, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val conv = getItem(position)
        val otherId = conv.participants.firstOrNull { it != currentUserId } ?: ""
        val otherName = conv.participantNames[otherId] ?: "User"
        val unread = (conv.unreadCount[currentUserId] ?: 0L).toInt()

        holder.avatar.text = otherName.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
        holder.name.text = otherName
        holder.lastMsg.text = conv.lastMessage.ifBlank { "No messages yet" }

        // Format time
        val ts = conv.lastMessageAt
        if (ts != null) {
            val date = ts.toDate()
            val now = java.util.Date()
            val diffMs = now.time - date.time
            val diffMin = diffMs / 60000
            holder.time.text = when {
                diffMin < 1 -> "now"
                diffMin < 60 -> "${diffMin}m"
                diffMin < 1440 -> "${diffMin / 60}h"
                else -> android.text.format.DateFormat.format("MMM d", date).toString()
            }
        } else {
            holder.time.text = ""
        }

        if (unread > 0) {
            holder.badge.visibility = View.VISIBLE
            holder.badge.text = if (unread > 9) "9+" else unread.toString()
            holder.name.setTypeface(null, android.graphics.Typeface.BOLD)
        } else {
            holder.badge.visibility = View.GONE
            holder.name.setTypeface(null, android.graphics.Typeface.NORMAL)
        }

        holder.itemView.setOnClickListener { onClick(conv) }
    }

    companion object DiffCallback : DiffUtil.ItemCallback<Conversation>() {
        override fun areItemsTheSame(a: Conversation, b: Conversation) = a.id == b.id
        override fun areContentsTheSame(a: Conversation, b: Conversation) = a == b
    }
}
