package com.craftly.messaging.presentation.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.craftly.R
import com.craftly.messaging.data.models.Message

class MessagesAdapter(
    private val currentUserId: String,
) : ListAdapter<Message, RecyclerView.ViewHolder>(DiffCallback) {

    companion object DiffCallback : DiffUtil.ItemCallback<Message>() {
        override fun areItemsTheSame(a: Message, b: Message) = a.id == b.id
        override fun areContentsTheSame(a: Message, b: Message) = a == b
        private const val VIEW_TYPE_SENT = 1
        private const val VIEW_TYPE_RECEIVED = 2
    }

    override fun getItemViewType(position: Int): Int {
        return if (getItem(position).senderId == currentUserId) 1 else 2
    }

    inner class SentViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val text: TextView = view.findViewById(R.id.messageText)
        val time: TextView = view.findViewById(R.id.messageTime)
    }

    inner class ReceivedViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val text: TextView = view.findViewById(R.id.messageText)
        val time: TextView = view.findViewById(R.id.messageTime)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return if (viewType == 1) {
            SentViewHolder(LayoutInflater.from(parent.context).inflate(R.layout.item_message_sent, parent, false))
        } else {
            ReceivedViewHolder(LayoutInflater.from(parent.context).inflate(R.layout.item_message_received, parent, false))
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val msg = getItem(position)
        val timeStr = msg.createdAt?.toDate()?.let {
            java.text.SimpleDateFormat("hh:mm a", java.util.Locale.getDefault()).format(it)
        } ?: ""

        when (holder) {
            is SentViewHolder -> {
                holder.text.text = msg.text
                holder.time.text = timeStr
            }
            is ReceivedViewHolder -> {
                holder.text.text = msg.text
                holder.time.text = timeStr
            }
        }
    }
}
