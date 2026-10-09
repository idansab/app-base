import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function CommunityChat() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <p className="text-2xl text-muted-foreground">צריך להתחבר לקהילה</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-medium hover:bg-primary/90"
          >
            התחברות
          </button>
        </motion.div>
      </div>
    );
  }

  const username = user?.email?.split('@')[0] || 'משתמש';

  // Load messages
  useEffect(() => {
    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('community-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages',
        },
        (payload) => {
          const newMsg = payload.new;
          setMessages(prev => [...prev, {
            id: newMsg.id,
            user_id: newMsg.user_id,
            username: newMsg.username,
            content: newMsg.content,
            created_at: newMsg.created_at,
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (e) {
      console.error('Failed to load messages:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const { error } = await supabase
        .from('community_messages')
        .insert([{
          user_id: user.id,
          username: username,
          content: newMessage.trim(),
        }]);

      if (error) throw error;
      setNewMessage('');
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 max-w-4xl mx-auto w-full py-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">אין הודעות עדיין. היה הראשון לכתוב! 💬</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.user_id === user?.id ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-xs px-4 py-3 rounded-2xl ${
                    msg.user_id === user?.id
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-foreground'
                  }`}>
                    {msg.user_id !== user?.id && (
                      <p className="text-xs font-semibold mb-1 opacity-75">{msg.username}</p>
                    )}
                    <p className="text-sm break-words text-right">{msg.content}</p>
                    <p className="text-xs mt-1 opacity-60">
                      {new Date(msg.created_at).toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border-t border-border p-4"
      >
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="כתוב הודעה..."
              className="flex-1 px-4 py-3 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary bg-background text-right"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-4 py-3 bg-primary text-white rounded-2xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {sending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
