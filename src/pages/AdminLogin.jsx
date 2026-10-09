import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/api/base44Client';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign in with Supabase
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('אימייל או סיסמה לא נכונים');
        return;
      }

      // Server-side check (public.is_admin / profiles RLS); nothing is stored client-side
      const { data: { user } } = await supabase.auth.getUser();
      let admin = false;
      const { data: rpcResult, error: rpcError } = await supabase.rpc('is_admin');
      if (!rpcError) {
        admin = rpcResult === true;
      } else if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        admin = profile?.role === 'admin';
      }

      if (!admin) {
        setError('אינך מורשה לגישה ל Admin');
        await supabase.auth.signOut();
        return;
      }

      // Navigate to admin
      navigate(location.state?.from?.pathname || '/admin', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError('שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8 border border-border">
        <h1 className="text-3xl font-bold text-center mb-2">Admin</h1>
        <p className="text-center text-muted-foreground mb-8">התחברות למנהל האתר</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 rounded-lg flex gap-2 items-start">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              אימייל
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'מתחבר...' : 'התחבר'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Admin login only • יש לך הרשאות admin?
        </p>
      </div>
    </div>
  );
}
