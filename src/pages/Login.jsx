import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      // חזור לדף שניסה להיכנס אליו, או להome
      const from = location.state?.from?.pathname || '/';
      navigate(from);
    } catch (err) {
      // Better error messages
      let errorMsg = err.message;
      if (err.message?.includes('Invalid login credentials')) {
        errorMsg = 'אימייל או סיסמה לא נכונים. אנא בדוק ונסה שוב.';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMsg = 'אנא אשר את הדוא"ל שלך לפני התחברות.';
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card rounded-lg shadow border border-border p-8">
        <h1 className="text-2xl font-bold mb-6 text-foreground">התחברות</h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              אימייל
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-background text-foreground"
              required
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
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-background text-foreground"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="text-left">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              שכחת סיסמה?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'מתחבר...' : 'התחבר'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            אין לך חשבון?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-primary hover:underline font-medium"
            >
              הירשם
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
