import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import Turnstile, { TURNSTILE_SITE_KEY } from '@/components/common/Turnstile';

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email.trim(), captcha);
      // Same message whether or not the account exists (no account enumeration)
      setSent(true);
    } catch {
      setError('לא הצלחנו לשלוח את המייל. נסה שוב בעוד רגע.');
    } finally {
      setCaptchaReset((n) => n + 1);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card rounded-lg shadow border border-border p-8">
        <h1 className="text-2xl font-bold mb-2 text-foreground">שכחתי סיסמה</h1>
        <p className="text-sm text-muted-foreground mb-6">
          נשלח אליך קישור לאיפוס הסיסמה למייל.
        </p>

        {sent ? (
          <div role="status" className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 px-4 py-3 rounded mb-4">
            אם קיים חשבון עם הכתובת הזו, נשלח אליו קישור לאיפוס סיסמה. בדוק גם בספאם.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div role="alert" className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">אימייל</label>
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
            <Turnstile onToken={setCaptcha} resetKey={captchaReset} />

            <button
              type="submit"
              disabled={loading || (TURNSTILE_SITE_KEY && !captcha)}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'שולח...' : 'שלח קישור'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="text-primary hover:underline font-medium">חזרה להתחברות</Link>
        </p>
      </div>
    </div>
  );
}
