import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // The emailed link signs the user into a short "recovery" session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      setChecked(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('הסיסמה חייבת להיות לפחות 8 תווים');
      return;
    }
    if (password !== confirm) {
      setError('הסיסמאות לא תואמות');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.message || 'שגיאה בעדכון הסיסמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card rounded-lg shadow border border-border p-8">
        <h1 className="text-2xl font-bold mb-6 text-foreground">איפוס סיסמה</h1>

        {!checked ? (
          <Loader2 className="animate-spin mx-auto text-primary" />
        ) : !ready ? (
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">הקישור לא תקין או שפג תוקפו.</p>
            <Link to="/forgot-password" className="text-primary hover:underline font-medium">בקש קישור חדש</Link>
          </div>
        ) : done ? (
          <div role="status" className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 px-4 py-3 rounded">
            הסיסמה עודכנה. מעביר אותך לאתר...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div role="alert" className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">סיסמה חדשה</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-background text-foreground"
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-foreground mb-1">אימות סיסמה</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-background text-foreground"
                required
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'מעדכן...' : 'עדכן סיסמה'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
