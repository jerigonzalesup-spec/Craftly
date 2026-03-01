import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@/firebase/auth/use-user';
import {
  subscribeToMessages,
  sendMessage,
  markConversationRead,
} from '@/services/messagingService';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Send, Loader2 } from 'lucide-react';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp?.toDate?.() || new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [otherUserName, setOtherUserName] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  // Load conversation metadata to get other user's name
  useEffect(() => {
    if (!user || !conversationId) return;

    const { firestore: db } = initializeFirebase();
    getDoc(doc(db, 'conversations', conversationId)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const otherId = data.participants.find((p) => p !== user.uid);
        setOtherUserName(data.participantNames?.[otherId] || 'User');
      }
    });
  }, [conversationId, user]);

  // Subscribe to messages
  useEffect(() => {
    if (!conversationId) return;
    const unsub = subscribeToMessages(conversationId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
    return () => unsub();
  }, [conversationId]);

  // Mark as read when opening conversation
  useEffect(() => {
    if (!user || !conversationId) return;
    markConversationRead(conversationId, user.uid).catch(() => {});
  }, [conversationId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending || !user) return;
    setSending(true);
    try {
      await sendMessage(conversationId, user.uid, user.displayName || user.email, text);
      setText('');
    } catch (e) {
      console.error('Send failed:', e);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        Please log in to view messages.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-input bg-background/80 backdrop-blur-md sticky top-16 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate('/messages')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold">{otherUserName.charAt(0).toUpperCase()}</span>
        </div>
        <span className="font-semibold">{otherUserName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-10">
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === user.uid;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-gradient-to-br from-amber-500 to-red-500 text-white rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  <p className="break-words">{msg.text}</p>
                  <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="px-4 py-3 border-t border-input flex items-center gap-2 bg-background">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1"
          maxLength={500}
        />
        <Button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-700 hover:to-red-600 text-white"
          size="icon"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
