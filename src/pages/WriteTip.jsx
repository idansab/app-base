import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function WriteTip() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [content, setContent] = useState('');
  const [tipType, setTipType] = useState('tip');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <p className="text-2xl text-muted-foreground">צריך להתחבר</p>
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

  const tipTypes = [
    { id: 'tip', label: '💡 טיפ', emoji: '💡' },
    { id: 'report', label: '⚠️ דיווח', emoji: '⚠️' },
    { id: 'review', label: '⭐ ביקורת', emoji: '⭐' },
  ];

  
  const username = user?.user_metadata?.display_name || 'משתמש';

  const handleSubmit = async (e) => {
    e.preventDefault();

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
          status: 'pending',
        }]);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: '✅ הטיפ נשלח ויפורסם לאחר אישור מנהל'
      });
      setContent('');
      setTipType('tip');

      setTimeout(() => navigate('/'), 2000);
    } catch (e) {
      console.error(e);
      setMessage({
        type: 'error',
        text: e?.message?.includes('rate limit') ? 'שלחת הרבה בזמן קצר. נסה שוב מאוחר יותר.' : 'שגיאה בפרסום הטיפ'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-card border-b border-border"
      >
        <div className="px-4 max-w-6xl mx-auto py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-lg"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold">כתוב משהו</h1>
          <div className="w-10" />
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 max-w-2xl mx-auto py-6 space-y-6"
      >
        {/* User Info */}
        <div className="flex items-center gap-3 p-4 bg-secondary rounded-2xl">
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
            {username[0].toUpperCase()}
          </div>
          <span className="font-medium">{username}</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">סוג התוכן</label>
            <div className="grid grid-cols-3 gap-2">
              {tipTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setTipType(type.id)}
                  className={`px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    tipType === type.id
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-secondary text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type.emoji} {type.label.split(' ')[1]}
                </button>
              ))}
            </div>
          </div>

          {/* Content Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">התוכן שלך</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="כתוב טיפ, דיווח או ביקורת..."
              className="w-full px-4 py-4 border border-border rounded-2xl resize-none text-right focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              rows={6}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {content.length}/500
            </div>
          </div>

          {/* Messages */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex items-center gap-2 p-4 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle size={20} />
                ) : (
                  <AlertCircle size={20} />
                )}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Send size={20} />
                פרסם
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
