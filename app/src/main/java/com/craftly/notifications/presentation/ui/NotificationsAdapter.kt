package com.craftly.notifications.presentation.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.craftly.R
import com.craftly.notifications.data.models.Notification
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

class NotificationsAdapter(
    private val onMarkRead: (Notification) -> Unit,
    private val onDelete: (Notification) -> Unit
) : ListAdapter<Notification, NotificationsAdapter.ViewHolder>(DIFF_CALLBACK) {

    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val unreadDot: View = itemView.findViewById(R.id.unreadDot)
        val messageText: TextView = itemView.findViewById(R.id.notificationMessage)
        val timeText: TextView = itemView.findViewById(R.id.notificationTime)
        val deleteButton: ImageButton = itemView.findViewById(R.id.deleteNotificationButton)
        val container: View = itemView.findViewById(R.id.notificationItemContainer)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_notification, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val notification = getItem(position)

        holder.messageText.text = notification.message
        holder.timeText.text = formatTimeAgo(notification.getCreatedAtMillis())

        // Unread state styling
        if (!notification.isRead) {
            holder.unreadDot.visibility = View.VISIBLE
            holder.messageText.setTextColor(
                ContextCompat.getColor(holder.itemView.context, R.color.dark_text_primary)
            )
            holder.container.setBackgroundResource(R.drawable.notification_unread_bg)
        } else {
            holder.unreadDot.visibility = View.GONE
            holder.messageText.setTextColor(
                ContextCompat.getColor(holder.itemView.context, R.color.dark_text_secondary)
            )
            holder.container.setBackgroundResource(R.drawable.notification_read_bg)
        }

        // Mark as read on tap
        holder.container.setOnClickListener {
            if (!notification.isRead) {
                onMarkRead(notification)
            }
        }

        holder.deleteButton.setOnClickListener {
            onDelete(notification)
        }
    }

    private fun formatTimeAgo(millis: Long): String {
        if (millis == 0L) return ""
        val now = System.currentTimeMillis()
        val diff = now - millis
        return when {
            diff < TimeUnit.MINUTES.toMillis(1) -> "Just now"
            diff < TimeUnit.HOURS.toMillis(1) -> "${TimeUnit.MILLISECONDS.toMinutes(diff)}m ago"
            diff < TimeUnit.DAYS.toMillis(1) -> "${TimeUnit.MILLISECONDS.toHours(diff)}h ago"
            diff < TimeUnit.DAYS.toMillis(7) -> "${TimeUnit.MILLISECONDS.toDays(diff)}d ago"
            else -> SimpleDateFormat("MMM d", Locale.getDefault()).format(Date(millis))
        }
    }

    companion object {
        private val DIFF_CALLBACK = object : DiffUtil.ItemCallback<Notification>() {
            override fun areItemsTheSame(oldItem: Notification, newItem: Notification) =
                oldItem.id == newItem.id

            override fun areContentsTheSame(oldItem: Notification, newItem: Notification) =
                oldItem == newItem
        }
    }
}
