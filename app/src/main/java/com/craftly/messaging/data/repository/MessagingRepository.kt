package com.craftly.messaging.data.repository

import com.craftly.messaging.data.models.Conversation
import com.craftly.messaging.data.models.Message
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import kotlinx.coroutines.tasks.await

class MessagingRepository {

    private val db = FirebaseFirestore.getInstance()

    /** Build a deterministic conversation ID from two UIDs. */
    fun buildConversationId(uid1: String, uid2: String): String {
        return listOf(uid1, uid2).sorted().joinToString("_")
    }

    /** Get or create a conversation. Returns the conversationId. */
    suspend fun getOrCreateConversation(
        currentUid: String,
        currentName: String,
        otherUid: String,
        otherName: String,
    ): String {
        val conversationId = buildConversationId(currentUid, otherUid)
        val ref = db.collection("conversations").document(conversationId)
        val snap = ref.get().await()

        if (!snap.exists()) {
            val data = hashMapOf(
                "participants" to listOf(currentUid, otherUid),
                "participantNames" to mapOf(currentUid to currentName, otherUid to otherName),
                "lastMessage" to "",
                "lastMessageAt" to Timestamp.now(),
                "lastMessageBy" to null,
                "unreadCount" to mapOf(currentUid to 0L, otherUid to 0L),
                "createdAt" to Timestamp.now(),
            )
            ref.set(data).await()
        }

        return conversationId
    }

    /** Send a message. */
    suspend fun sendMessage(
        conversationId: String,
        senderId: String,
        senderName: String,
        text: String,
    ) {
        val convRef = db.collection("conversations").document(conversationId)
        val messagesRef = convRef.collection("messages")

        // Read participants to find receiverId
        val snap = convRef.get().await()
        val participants = snap.get("participants") as? List<*> ?: return
        val receiverId = participants.firstOrNull { it != senderId } as? String ?: return

        // Add message
        val message = hashMapOf(
            "senderId" to senderId,
            "senderName" to senderName,
            "text" to text.trim(),
            "createdAt" to Timestamp.now(),
            "read" to false,
        )
        messagesRef.add(message).await()

        // Update conversation metadata
        val unreadField = "unreadCount.$receiverId"
        convRef.update(
            mapOf(
                "lastMessage" to text.trim(),
                "lastMessageAt" to Timestamp.now(),
                "lastMessageBy" to senderId,
                unreadField to com.google.firebase.firestore.FieldValue.increment(1),
            )
        ).await()
    }

    /** Mark conversation as read by resetting unread count. */
    suspend fun markConversationRead(conversationId: String, userId: String) {
        db.collection("conversations").document(conversationId)
            .update("unreadCount.$userId", 0L)
            .await()
    }

    /** Listen to conversations for a user. Returns a ListenerRegistration to cancel later. */
    fun listenToConversations(
        userId: String,
        onUpdate: (List<Conversation>) -> Unit,
    ): ListenerRegistration {
        return db.collection("conversations")
            .whereArrayContains("participants", userId)
            .orderBy("lastMessageAt", Query.Direction.DESCENDING)
            .limit(50)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val conversations = snapshot.documents.mapNotNull { doc ->
                    try {
                        val participants = doc.get("participants") as? List<*>
                            ?: return@mapNotNull null
                        val participantNames = (doc.get("participantNames") as? Map<*, *>)
                            ?.mapKeys { it.key.toString() }
                            ?.mapValues { it.value.toString() }
                            ?: emptyMap()
                        val unreadCount = (doc.get("unreadCount") as? Map<*, *>)
                            ?.mapKeys { it.key.toString() }
                            ?.mapValues { (it.value as? Long) ?: 0L }
                            ?: emptyMap()

                        Conversation(
                            id = doc.id,
                            participants = participants.map { it.toString() },
                            participantNames = participantNames,
                            lastMessage = doc.getString("lastMessage") ?: "",
                            lastMessageAt = doc.getTimestamp("lastMessageAt"),
                            lastMessageBy = doc.getString("lastMessageBy"),
                            unreadCount = unreadCount,
                            createdAt = doc.getTimestamp("createdAt"),
                        )
                    } catch (e: Exception) {
                        null
                    }
                }
                onUpdate(conversations)
            }
    }

    /** Listen to messages in a conversation. Returns a ListenerRegistration. */
    fun listenToMessages(
        conversationId: String,
        onUpdate: (List<Message>) -> Unit,
    ): ListenerRegistration {
        return db.collection("conversations")
            .document(conversationId)
            .collection("messages")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .limit(100)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val messages = snapshot.documents.mapNotNull { doc ->
                    try {
                        Message(
                            id = doc.id,
                            senderId = doc.getString("senderId") ?: "",
                            senderName = doc.getString("senderName") ?: "",
                            text = doc.getString("text") ?: "",
                            createdAt = doc.getTimestamp("createdAt"),
                            read = doc.getBoolean("read") ?: false,
                        )
                    } catch (e: Exception) {
                        null
                    }
                }
                onUpdate(messages)
            }
    }
}
