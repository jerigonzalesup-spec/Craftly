import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

function getDb() {
  return initializeFirebase().firestore;
}

/**
 * Returns a Promise that resolves with the current Firebase Auth user once
 * the session has been fully restored. Prevents permission-denied errors
 * caused by Firestore listeners firing before request.auth is populated.
 */
function waitForAuth() {
  const auth = getAuth();
  return auth.authStateReady().then(() => auth.currentUser);
}

/**
 * Build a deterministic conversation ID from two user IDs.
 * Sorting ensures the same ID regardless of who initiates.
 */
export function buildConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

/**
 * Get or create a conversation between two users.
 * Returns the conversationId.
 */
export async function getOrCreateConversation(currentUser, otherUser) {
  const db = getDb();
  const conversationId = buildConversationId(currentUser.uid, otherUser.uid);
  const ref = doc(db, 'conversations', conversationId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      participants: [currentUser.uid, otherUser.uid],
      participantNames: {
        [currentUser.uid]: currentUser.displayName || currentUser.email,
        [otherUser.uid]: otherUser.displayName || otherUser.email,
      },
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      lastMessageBy: null,
      unreadCount: {
        [currentUser.uid]: 0,
        [otherUser.uid]: 0,
      },
      createdAt: serverTimestamp(),
    });
  }

  return conversationId;
}

/**
 * Send a message in a conversation.
 */
export async function sendMessage(conversationId, senderId, senderName, text) {
  const db = getDb();
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const conversationRef = doc(db, 'conversations', conversationId);

  // Read participants to know who the receiver is
  const convSnap = await getDoc(conversationRef);
  if (!convSnap.exists()) throw new Error('Conversation not found');

  const { participants } = convSnap.data();
  const receiverId = participants.find((p) => p !== senderId);

  // Add the message
  await addDoc(messagesRef, {
    senderId,
    senderName,
    text: text.trim(),
    createdAt: serverTimestamp(),
    read: false,
  });

  // Update conversation metadata
  await updateDoc(conversationRef, {
    lastMessage: text.trim(),
    lastMessageAt: serverTimestamp(),
    lastMessageBy: senderId,
    [`unreadCount.${receiverId}`]: increment(1),
  });
}

/**
 * Mark all messages in a conversation as read for a specific user.
 */
export async function markConversationRead(conversationId, userId) {
  const db = getDb();
  const ref = doc(db, 'conversations', conversationId);
  await updateDoc(ref, {
    [`unreadCount.${userId}`]: 0,
  });
}

/**
 * Listen to all conversations for a user (real-time).
 * Returns an unsubscribe function.
 */
export function subscribeToConversations(userId, callback) {
  const db = getDb();
  let unsub = null;

  // Wait for Firebase Auth to fully restore the session before attaching
  // the Firestore listener. Without this, request.auth is null on first
  // render (user comes from localStorage) → permission-denied.
  waitForAuth().then((firebaseUser) => {
    if (!firebaseUser || firebaseUser.uid !== userId) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc'),
      limit(50)
    );

    unsub = onSnapshot(q, (snapshot) => {
      const conversations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(conversations);
    });
  });

  return () => { if (unsub) unsub(); };
}

/**
 * Listen to messages in a conversation (real-time).
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(conversationId, callback) {
  const db = getDb();
  let unsub = null;

  waitForAuth().then((firebaseUser) => {
    if (!firebaseUser) return;

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    unsub = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(messages);
    });
  });

  return () => { if (unsub) unsub(); };
}
