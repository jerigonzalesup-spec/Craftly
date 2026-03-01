import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/firebase/auth/use-user';
import { subscribeToConversations } from '@/services/messagingService';
import { MessageSquare } from 'lucide-react';

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp?.toDate?.() || new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MessagesPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToConversations(user.uid, (convs) => {
      setConversations(convs);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        Please log in to view your messages.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-amber-500" />
        Messages
      </h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-input animate-pulse">
              <div className="h-12 w-12 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm mt-1">Start a conversation by visiting a seller's profile.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const otherId = conv.participants.find((p) => p !== user.uid);
            const otherName = conv.participantNames?.[otherId] || 'User';
            const unread = conv.unreadCount?.[user.uid] || 0;
            const initials = otherName.charAt(0).toUpperCase();

            return (
              <button
                key={conv.id}
                onClick={() => navigate(`/messages/${conv.id}`)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-input hover:bg-muted/50 transition-colors text-left"
              >
                {/* Avatar */}
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">{initials}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`font-semibold truncate ${unread > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {otherName}
                    </p>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {timeAgo(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-sm truncate ${unread > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {conv.lastMessage || 'No messages yet'}
                    </p>
                    {unread > 0 && (
                      <span className="ml-2 flex-shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
