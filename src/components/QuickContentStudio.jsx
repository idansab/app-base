import React, { useState } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function QuickContentStudio() {
  const { isAuthenticated, user } = useAuth();
  const [content, setContent] = useState('');
  const [tipType, setTipType] = useState('tip');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const tipTypes = [
    { id: 'tip', label: '💡 טיפ', emoji: '💡' },
    { id: 'report', label: '⚠️ דיווח', emoji: '⚠️' },
    { id: 'review', label: '⭐ ביקורת', emoji: '⭐' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setMessage({ type: 'error', text: 'צריך להתחבר כדי להוסיף טיפ' });
      return;
    }

    if (!content.trim()) {
      setMessage({ type: 'error', text: 'כתוב משהו קודם!' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_tips')
        .insert([{
          user_id: user.id,
          content: content.trim(),
          type: tipType,
          status: 'pending', // moderated: the database rejects anything else from regular users
        }]);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: '✅ הטיפ נשלח לאישור ויתפרסם בקרוב'
      });
      setContent('');
      setTipType('tip');

      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setMessage({
        type: 'error',
        text: 'שגיאה בפרסום הטיפ'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-6 border border-blue-200 text-center"
      >
        <p className="text-gray-700 mb-3">התחבר כדי לשתף טיפים עם הקהילה 🎯</p>
        <button className="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90">
          התחברות
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-3xl p-6 border-2 border-primary/20 space-y-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🚀</span>
        <h2 className="text-xl font-bold">סטודיו תוכן מהיר</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selector */}
        <div className="flex gap-2">
          {tipTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setTipType(type.id)}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                tipType === type.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-secondary text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type.emoji} {type.label}
            </button>
          ))}
        </div>

        {/* Content Input */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="כתוב טיפ או דיווח מהשטח..."
          className="w-full px-4 py-3 border border-border rounded-2xl resize-none text-right focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          rows={3}
          maxLength={300}
        />

        {/* Character Count */}
        <div className="text-xs text-muted-foreground text-right">
          {content.length}/300
        </div>

        {/* Messages */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              שולח...
            </>
          ) : (
            <>
              <Send size={18} />
              פרסם טיפ
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
